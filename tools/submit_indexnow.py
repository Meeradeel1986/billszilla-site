#!/usr/bin/env python3
"""Submit BillsZilla URLs to IndexNow (modeled on PDFZippy's per-URL GET).

Usage:  python3 tools/submit_indexnow.py [url ...]
With no arguments, submits every URL in sitemap.xml.
Requires the <key>.txt file to be live at https://billszilla.com/<key>.txt
(run only AFTER a deploy that includes the key file).
"""
import re
import sys
import glob
import urllib.request

KEY_FILE = glob.glob('[0-9a-f]' * 0 + '[0-9a-f]' * 32 + '.txt')
KEY_FILE = [f for f in glob.glob('*.txt')
            if re.fullmatch(r'[0-9a-f]{32}\.txt', f)]
if not KEY_FILE:
    print('no IndexNow key file found at site root')
    sys.exit(1)
KEY = KEY_FILE[0][:-4]

if len(sys.argv) > 1:
    urls = sys.argv[1:]
else:
    xml = open('sitemap.xml', encoding='utf-8').read()
    urls = re.findall(r'<loc>([^<]+)</loc>', xml)

for u in urls:
    req = ('https://api.indexnow.org/indexnow?url='
           + urllib.parse.quote(u, safe='') + '&key=' + KEY)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            print(r.status, u)
    except Exception as e:
        print('ERROR', u, e)
