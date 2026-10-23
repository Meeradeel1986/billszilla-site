// GET /api/admin/traffic?days=30 -> Cloudflare zone analytics (auth required).
// Needs a read-only Cloudflare API token saved in Settings (KV cfg:cf_token).
// Uses the GraphQL Analytics API; results cached in KV for 10 minutes.
function json(d, s) {
  return new Response(JSON.stringify(d), {
    status: s || 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

async function cfGraphQL(token, query, variables) {
  const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || j.errors) throw new Error('cf-api');
  return j.data;
}

async function zoneId(env, token) {
  try {
    const z = await env.EVENT_KV.get('cfg:cf_zone');
    if (z) return z;
  } catch (e) {}
  const r = await fetch('https://api.cloudflare.com/client/v4/zones?name=billszilla.com', {
    headers: { authorization: 'Bearer ' + token },
  });
  const j = await r.json().catch(() => null);
  if (!j || !j.success || !j.result || !j.result.length) throw new Error('zone-lookup');
  const id = j.result[0].id;
  try { await env.EVENT_KV.put('cfg:cf_zone', id); } catch (e) {}
  return id;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let days = parseInt(url.searchParams.get('days') || '30', 10);
  if (!days || days < 7) days = 7;
  if (days > 30) days = 30;

  let token = '';
  try { token = (await env.EVENT_KV.get('cfg:cf_token')) || ''; } catch (e) {}
  if (!token) return json({ ok: false, error: 'no-token' });

  // 10-minute cache
  const cacheKey = 'cache:cf_traffic:' + days;
  try {
    const c = await env.EVENT_KV.get(cacheKey, 'json');
    if (c && c.at && Date.now() - c.at < 10 * 60 * 1000) return json(c.payload);
  } catch (e) {}

  let zid;
  try { zid = await zoneId(env, token); }
  catch (e) { return json({ ok: false, error: 'bad-token' }); }

  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
  const dStart = start.toISOString().slice(0, 10);
  const dEnd = end.toISOString().slice(0, 10);

  const dailyQ = `query($zone: String!, $since: Date!, $until: Date!) {
    viewer { zones(filter: { zoneTag: $zone }) {
      httpRequests1dGroups(limit: 40, filter: { date_geq: $since, date_leq: $until },
        orderBy: [date_ASC]) {
        dimensions { date }
        sum { requests pageViews cachedRequests bytes }
        uniq { uniques }
      }
    } }
  }`;
  const topQ = `query($zone: String!, $since: Time!, $until: Time!) {
    viewer { zones(filter: { zoneTag: $zone }) {
      paths: httpRequestsAdaptiveGroups(limit: 8,
        filter: { datetime_geq: $since, datetime_lt: $until },
        orderBy: [count_DESC]) {
        count dimensions { clientRequestPath }
      }
      countries: httpRequestsAdaptiveGroups(limit: 8,
        filter: { datetime_geq: $since, datetime_lt: $until },
        orderBy: [count_DESC]) {
        count dimensions { clientCountryName }
      }
      devices: httpRequestsAdaptiveGroups(limit: 5,
        filter: { datetime_geq: $since, datetime_lt: $until },
        orderBy: [count_DESC]) {
        count dimensions { clientDeviceType }
      }
    } }
  }`;

  let daily = [], totals = { requests: 0, pageViews: 0, uniques: 0 };
  try {
    const d = await cfGraphQL(token, dailyQ, { zone: zid, since: dStart, until: dEnd });
    const rows = d.viewer.zones[0].httpRequests1dGroups || [];
    daily = rows.map(r => ({
      date: r.dimensions.date,
      requests: r.sum.requests,
      pageViews: r.sum.pageViews,
      uniques: r.uniq.uniques,
    }));
    daily.forEach(r => { totals.requests += r.requests; totals.pageViews += r.pageViews; totals.uniques += r.uniques; });
  } catch (e) { return json({ ok: false, error: 'cf-api' }); }

  let topPages = [], topCountries = [], devices = [];
  try {
    const t = await cfGraphQL(token, topQ, { zone: zid, since: start.toISOString(), until: end.toISOString() });
    const z = t.viewer.zones[0];
    topPages = (z.paths || []).map(r => ({ path: r.dimensions.clientRequestPath, count: r.count }));
    topCountries = (z.countries || []).map(r => ({ country: r.dimensions.clientCountryName, count: r.count }));
    devices = (z.devices || []).map(r => ({ type: r.dimensions.clientDeviceType, count: r.count }));
  } catch (e) { /* top lists are best-effort on the free plan */ }

  const payload = { ok: true, days, daily, totals, topPages, topCountries, devices };
  try { await env.EVENT_KV.put(cacheKey, JSON.stringify({ at: Date.now(), payload }), { expirationTtl: 900 }); } catch (e) {}
  return json(payload);
}
