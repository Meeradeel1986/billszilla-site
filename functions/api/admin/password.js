// POST /api/admin/password {current, next} -> change the admin password (auth required).
// NOTE: the password lives in the ADMIN_PASSWORD env var. Changing it here updates a
// KV override (cfg:admin_pw) which takes precedence; clear it to fall back to env.
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json' },
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
  let body = null;
  try { body = await request.json(); } catch (e) { return json({ ok: false }, 400); }
  const cur = String(body.current || ''), next = String(body.next || '');
  if (next.length < 8) return json({ ok: false, error: 'too-short' }, 400);
  if (next.length > 128) return json({ ok: false, error: 'too-long' }, 400);
  const real = await currentPassword(env);
  if (!safeEqual(cur, real)) return json({ ok: false, error: 'wrong-password' }, 401);
  try { await env.EVENT_KV.put('cfg:admin_pw', next); }
  catch (e) { return json({ ok: false }, 500); }
  return json({ ok: true, relogin: true });
}
