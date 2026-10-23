// POST /api/admin/login  {password} -> sets bzadmin session cookie (7 days).
// Password source: KV override cfg:admin_pw (set via Change password),
// falling back to the ADMIN_PASSWORD secret env var.
function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'content-type': 'application/json' }, headers || {}),
  });
}

function safeEqual(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function currentPassword(env) {
  try {
    const ov = await env.EVENT_KV.get('cfg:admin_pw');
    if (ov) return ov;
  } catch (e) {}
  return env.ADMIN_PASSWORD || '';
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.EVENT_KV) return json({ ok: false, error: 'no-kv' }, 500);
  let body = null;
  try { body = await request.json(); } catch (e) { /* fall through */ }
  const pw = body && typeof body.password === 'string' ? body.password : '';
  const real = await currentPassword(env);
  if (!real) return json({ ok: false, error: 'admin-not-configured' }, 500);
  if (!pw || !safeEqual(pw, real)) {
    return json({ ok: false, error: 'wrong-password' }, 401);
  }
  const token = crypto.randomUUID();
  const exp = Date.now() + 7 * 24 * 3600 * 1000;
  try { await env.EVENT_KV.put('sess:' + token, String(exp), { expirationTtl: 7 * 24 * 3600 }); }
  catch (e) { return json({ ok: false }, 500); }
  return json({ ok: true }, 200, {
    'set-cookie': 'bzadmin=' + token + '; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax',
  });
}
