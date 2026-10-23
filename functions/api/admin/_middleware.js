// Auth middleware for /api/admin/* (login route is exempt).
// Session: cookie bzadmin=<token>, token -> expiry stored in EVENT_KV as sess:<token>.
// Mirrors the proven PDFZippy admin pattern, BillsZilla-only KV + cookie name.
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  if (url.pathname === '/api/admin/login') return next();
  if (!env.EVENT_KV) return json({ ok: false, error: 'no-kv' }, 500);
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)bzadmin=([A-Za-z0-9-]+)/);
  const token = m ? m[1] : '';
  if (!token) return json({ ok: false, error: 'unauthorized' }, 401);
  let exp = null;
  try { exp = await env.EVENT_KV.get('sess:' + token); } catch (e) { /* fall through */ }
  if (!exp || Date.now() > parseInt(exp, 10)) {
    try { await env.EVENT_KV.delete('sess:' + token); } catch (e) {}
    return json({ ok: false, error: 'unauthorized' }, 401);
  }
  context.adminToken = token;
  return next();
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json' },
  });
}
