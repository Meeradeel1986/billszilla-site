// First-party, privacy-safe usage counter for BillsZilla.
// POST /api/event  {t: "<tool-slug>", a: "started"|"completed"}
// Stores only aggregate per-day counters in KV. No IPs, no invoice
// contents, no names, no amounts, no personal data of any kind.
// Mirrors the proven PDFZippy pattern, with a BillsZilla-only allowlist.
// Requires: KV namespace bound as EVENT_KV in the Pages project settings.
const SLUG_RE = /^[a-z0-9-]{1,40}$/;
const ACTIONS = new Set(['started', 'completed']);
const TOOLS = new Set([
  'invoice',
  'quote',
  'receipt',
  'proforma',
  'payment-reminder',
  'hourly-rate-calculator',
  'time-tracker',
]);

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json' },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.EVENT_KV) return json({ ok: false, error: 'no-kv' }, 500);
  let body = null;
  try { body = await request.json(); } catch (e) { /* fall through */ }
  const t = body && typeof body.t === 'string' ? body.t : '';
  const a = body && typeof body.a === 'string' ? body.a : '';
  if (!SLUG_RE.test(t) || !TOOLS.has(t) || !ACTIONS.has(a)) return json({ ok: false }, 400);
  const day = new Date().toISOString().slice(0, 10);
  const key = 'ev:' + day + ':' + t + ':' + a;
  try {
    const cur = parseInt((await env.EVENT_KV.get(key)) || '0', 10) || 0;
    await env.EVENT_KV.put(key, String(cur + 1));
  } catch (e) {
    return json({ ok: false }, 500);
  }
  return json({ ok: true });
}

export function onRequestGet() {
  return json({ ok: true, service: 'billszilla-events' });
}
