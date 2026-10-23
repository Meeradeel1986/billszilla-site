// Cloudflare API token storage (auth required).
// GET  -> {ok, set: bool}   (the token value itself is never returned)
// POST {token} -> save (replaces). DELETE -> remove.
function json(d, s) {
  return new Response(JSON.stringify(d), {
    status: s || 200, headers: { 'content-type': 'application/json' },
  });
}

export async function onRequestGet(context) {
  const { env } = context;
  let t = '';
  try { t = (await env.EVENT_KV.get('cfg:cf_token')) || ''; } catch (e) {}
  return json({ ok: true, set: !!t });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body = null;
  try { body = await request.json(); } catch (e) { return json({ ok: false }, 400); }
  const t = String((body && body.token) || '').trim();
  if (!t || t.length < 20 || t.length > 200) return json({ ok: false, error: 'bad-token' }, 400);
  try {
    await env.EVENT_KV.put('cfg:cf_token', t);
    await env.EVENT_KV.delete('cfg:cf_zone'); // re-resolve zone on next use
    await env.EVENT_KV.delete('cache:cf_traffic:7');
    await env.EVENT_KV.delete('cache:cf_traffic:30');
  } catch (e) { return json({ ok: false }, 500); }
  return json({ ok: true, set: true });
}

export async function onRequestDelete(context) {
  const { env } = context;
  try {
    await env.EVENT_KV.delete('cfg:cf_token');
    await env.EVENT_KV.delete('cfg:cf_zone');
  } catch (e) {}
  return json({ ok: true, set: false });
}
