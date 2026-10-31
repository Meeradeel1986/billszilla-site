#!/usr/bin/env python3
"""Pre-push health check for the BillsZilla static site.

Run from the site root before any push:  python3 tools/check_site.py
Exit 0 = all checks pass. Exit 1 = failures listed, do NOT push until fixed.

Modeled on PDFZippy's tools/check_site.py (2026-10-29), adapted for
BillsZilla's flat .html URL layout. It checks the invariants the SEO audits
established: single H1, title/description lengths, canonicals, preview
images, sitemap coverage, internal links, llms.txt/feed freshness, and no
placeholder copy.

Scope limits (honest): it checks static links in HTML tags only. Links built
at runtime by JavaScript (e.g. the footer columns, dropdown nav) are not
covered here; they are covered by live crawls instead.

Excluded from page checks on purpose: admin.html (unlisted admin panel),
search.html (utility page, intentionally not in the sitemap — same as
PDFZippy), article-template.html (a template, not a live page).
"""

import os
import re
import sys
import html as htmlmod
import xml.dom.minidom
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://billszilla.com"
FAILURES = []

# Pages that exist as files but are intentionally NOT in the sitemap.
EXCLUDED_FILES = {"admin.html", "search.html", "blog/article-template.html",
                  "404.html"}


def fail(msg):
    FAILURES.append(msg)


def sitemap_urls():
    with open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8") as f:
        xml = f.read()
    return re.findall(r"<loc>(https://billszilla\.com[^<]*)</loc>", xml)


def url_to_file(url):
    """BillsZilla uses clean URLs that map to flat .html files."""
    path = urlparse(url).path.strip("/")
    if not path:
        return "index.html"
    if os.path.exists(os.path.join(ROOT, path + ".html")):
        return path + ".html"
    return path + "/index.html"


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def check_sitemap_coverage(urls):
    for u in urls:
        if not os.path.exists(os.path.join(ROOT, url_to_file(u))):
            fail(f"sitemap URL has no local file: {u}")
    sitemap_set = set(urls)
    for dirpath, _dirs, files in os.walk(ROOT):
        rel_dir = os.path.relpath(dirpath, ROOT)
        if rel_dir.split(os.sep)[0] in {"assets", "css", "js", "functions",
                                        "templates", "tools", ".well-known",
                                        "ai"}:
            continue
        for fn in files:
            if not fn.endswith(".html"):
                continue
            rel = fn if rel_dir == "." else rel_dir + "/" + fn
            if rel in EXCLUDED_FILES:
                continue
            if fn == "index.html":
                url = SITE + "/" if rel_dir == "." else \
                    SITE + "/" + rel_dir + "/"
            else:
                url = SITE + "/" + rel[:-5]
            if url not in sitemap_set:
                fail(f"page file not in sitemap: {url}")


def check_page(url, html_text, seen_titles, seen_descs):
    rel = url_to_file(url)
    h1s = re.findall(r"<h1[^>]*>", html_text)
    if len(h1s) != 1:
        fail(f"{url}: has {len(h1s)} <h1> tags, expected exactly 1")
    m = re.search(r"<title>([^<]*)</title>", html_text)
    if not m:
        fail(f"{url}: missing <title>")
    else:
        title = htmlmod.unescape(m.group(1))
        if len(title) > 60:
            fail(f"{url}: title {len(title)} chars > 60: {title[:70]}")
        if title in seen_titles:
            fail(f"{url}: duplicate title with {seen_titles[title]}")
        seen_titles[title] = url
    m = re.search(r'<meta name="description" content="([^"]*)"', html_text)
    if not m:
        fail(f"{url}: missing meta description")
    else:
        desc = htmlmod.unescape(m.group(1))
        if len(desc) > 160:
            fail(f"{url}: description {len(desc)} chars > 160")
        if desc in seen_descs:
            fail(f"{url}: duplicate description with {seen_descs[desc]}")
        seen_descs[desc] = url
    m = re.search(r'<link rel="canonical"[^>]*href="([^"]*)"', html_text)
    if not m:
        fail(f"{url}: missing canonical")
    elif m.group(1) != url:
        fail(f"{url}: canonical points elsewhere: {m.group(1)}")
    if "og:image" not in html_text:
        fail(f"{url}: missing og:image")
    # honesty rule: no placeholder copy on non-blog pages (blog articles may
    # legitimately use the phrase "coming soon" in news/editorial wording)
    if "/blog/" not in url and "coming soon" in html_text.lower():
        fail(f"{url}: contains 'coming soon' placeholder wording")


def resolve_link(page_url, href):
    if not href or href.startswith(("#", "mailto:", "tel:", "data:",
                                   "javascript:")):
        return None
    if href.startswith("//"):
        return None
    if re.match(r"https?://", href):
        if not href.startswith(SITE):
            return None
        href = href[len(SITE):]
    if href.startswith("/cdn-cgi/"):
        return None
    href = href.split("#")[0].split("?")[0]
    if not href:
        return None
    if href.startswith("/"):
        path = href.strip("/")
    else:
        base = urlparse(page_url).path.strip("/")
        base_dir = "/".join(base.split("/")[:-1]) if "/" in base else ""
        path = (base_dir + "/" + href) if base_dir else href
    parts = []
    for seg in path.split("/"):
        if seg in ("", "."):
            continue
        if seg == "..":
            if parts:
                parts.pop()
            continue
        parts.append(seg)
    path = "/".join(parts)
    if not path:
        return "index.html"
    full = os.path.join(ROOT, path)
    if os.path.isfile(full):
        return path
    if os.path.isdir(full):
        idx = path + "/index.html"
        if os.path.exists(os.path.join(ROOT, idx)):
            return idx
        return path + ".html" if os.path.exists(
            os.path.join(ROOT, path + ".html")) else "MISSING:" + path
    if os.path.exists(full + ".html"):
        return path + ".html"
    if os.path.exists(full + "/index.html"):
        return path + "/index.html"
    return "MISSING:" + path


def check_links(url, html_text):
    for tag in re.finditer(r'<(?:a|link|script|img)[^>]+(?:href|src)="([^"]+)"',
                           html_text):
        href = htmlmod.unescape(tag.group(1))
        resolved = resolve_link(url, href)
        if resolved is None:
            continue
        if resolved.startswith("MISSING:"):
            fail(f"{url}: dead internal link -> {href} "
                 f"(resolves to {resolved[8:]})")
        elif not os.path.exists(os.path.join(ROOT, resolved)):
            fail(f"{url}: dead internal link -> {href}")


def check_llms_and_feed(urls):
    try:
        llms = read("llms.txt")
    except FileNotFoundError:
        fail("missing required file: llms.txt")
        llms = ""
    for u in urls:
        if u not in llms:
            fail(f"llms.txt missing page URL: {u}")
    try:
        dom = xml.dom.minidom.parse(os.path.join(ROOT, "feed.xml"))
        items = dom.getElementsByTagName("item")
        articles = [u for u in urls if "/blog/" in u
                    and u != SITE + "/blog/"]
        if len(items) != len(articles):
            fail(f"feed.xml has {len(items)} items but sitemap has "
                 f"{len(articles)} articles")
    except Exception as e:
        fail(f"feed.xml does not parse: {e}")


def check_presence():
    for rel in ["_headers", "404.html", "llms.txt", "feed.xml", "robots.txt",
                "sitemap.xml", "assets/og-default.png", ".well-known/ai.txt",
                "ai/summary.json", "ai/faq.json", "ai/service.json"]:
        if not os.path.exists(os.path.join(ROOT, rel)):
            fail(f"missing required file: {rel}")
    headers = read("_headers")
    for h in ["Strict-Transport-Security", "X-Frame-Options",
              "X-Content-Type-Options", "Referrer-Policy"]:
        if h not in headers:
            fail(f"_headers missing security header: {h}")


def main():
    urls = sitemap_urls()
    if len(urls) != 79:
        fail(f"sitemap has {len(urls)} URLs, expected 79 — update this check "
             f"if pages were added/removed on purpose")
    check_sitemap_coverage(urls)
    seen_titles, seen_descs = {}, {}
    for u in urls:
        html_text = read(url_to_file(u))
        check_page(u, html_text, seen_titles, seen_descs)
        check_links(u, html_text)
    check_llms_and_feed(urls)
    check_presence()
    if FAILURES:
        print(f"FAIL ({len(FAILURES)} problems):")
        for f in FAILURES:
            print(" -", f)
        return 1
    print(f"PASS: {len(urls)} pages checked, all invariants hold.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
