// POST /api/admin/logout -> destroys the session, clears the cookie.
function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'content-type': 'application/json' }, headers || {}),
  });
}

export async function onRequestPost(context) {
  const { env } = context;
  const token = context.adminToken;
  if (env.EVENT_KV && token) {
    try { await env.EVENT_KV.delete('sess:' + token); } catch (e) {}
  }
  return json({ ok: true }, 200, {
    'set-cookie': 'bzadmin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  });
}
