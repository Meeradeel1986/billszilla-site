// GET /api/admin/stats?days=30 -> aggregated usage stats (auth required).
// Reads ev:YYYY-MM-DD:<tool>:started|completed counters from KV.
// Also returns homepage-counter inputs: the public counter is a seeded
// display value (base 8000, launch 2026-10-15, ~+50/day — see js/app.js);
// the "real" block reports what usage tracking has actually recorded
// for the invoice tool, all time (tracking began 2026-10-20).
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'content-type': 'application/json' },
  });
}

async function listAll(kv, prefix) {
  let keys = [], cursor = undefined, done = false;
  while (!done) {
    const res = await kv.list({ prefix, cursor, limit: 1000 });
    keys = keys.concat(res.keys);
    done = res.list_complete;
    cursor = res.cursor;
  }
  return keys;
}

// Same display formula as seedAllTimeTotal() in js/app.js (what a fresh
// visitor sees; excludes the per-browser "extra" ticks stored locally).
function seededCounterDisplay(now) {
  const BASE = 8000;
  const launch = new Date(2026, 9, 15);
  const days = Math.max(0, Math.floor((now - launch) / 86400000));
  let h = 0; const k = 'bz' + days;
  for (let i = 0; i < k.length; i++) h = ((h * 31) + k.charCodeAt(i)) >>> 0;
  return { base: BASE, launch: '2026-10-15', daysSinceLaunch: days, perDay: 50, display: BASE + days * 50 + (h % 180) };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  let days = parseInt(url.searchParams.get('days') || '30', 10);
  if (!days || days < 1) days = 30;
  if (days > 90) days = 90;
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const sinceStr = since.toISOString().slice(0, 10);

  let keys;
  try { keys = await listAll(env.EVENT_KV, 'ev:'); }
  catch (e) { return json({ ok: false, error: 'kv-read' }, 500); }

  // Read window counters plus every invoice counter (for the all-time real total).
  const wanted = keys.filter(k => {
    const parts = k.name.split(':');
    return k.name >= 'ev:' + sinceStr || (parts.length === 4 && parts[2] === 'invoice');
  });
  const vals = new Map();
  const BATCH = 60;
  for (let i = 0; i < wanted.length; i += BATCH) {
    const batch = wanted.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (k) => {
      try { return [k.name, parseInt((await env.EVENT_KV.get(k.name)) || '0', 10) || 0]; }
      catch (e) { return [k.name, 0]; }
    }));
    results.forEach(([name, v]) => { if (v > 0) vals.set(name, v); });
  }

  const byDay = {}, byTool = {};
  let totalStarted = 0, totalCompleted = 0;
  const realInvoice = { started: 0, completed: 0 };
  vals.forEach((v, name) => {
    const parts = name.split(':'); // ev, date, tool, action
    if (parts.length !== 4) return;
    const date = parts[1], tool = parts[2], action = parts[3];
    if (action !== 'started' && action !== 'completed') return;
    if (tool === 'invoice') realInvoice[action] += v;
    if (date < sinceStr) return;
    if (!byDay[date]) byDay[date] = { date, started: 0, completed: 0 };
    if (!byTool[tool]) byTool[tool] = { tool, started: 0, completed: 0 };
    byDay[date][action] += v;
    byTool[tool][action] += v;
    if (action === 'started') totalStarted += v; else totalCompleted += v;
  });

  const dayList = [];
  for (let d = 0; d < days; d++) {
    const dt = new Date(since.getTime() + d * 86400000);
    const ds = dt.toISOString().slice(0, 10);
    dayList.push(byDay[ds] || { date: ds, started: 0, completed: 0 });
  }
  const toolList = Object.values(byTool).sort((a, b) => (b.started + b.completed) - (a.started + a.completed));

  return json({
    ok: true, days,
    totals: {
      started: totalStarted, completed: totalCompleted,
      rate: totalStarted ? Math.round(totalCompleted / totalStarted * 1000) / 10 : 0,
    },
    byDay: dayList, byTool: toolList,
    counter: {
      seeded: seededCounterDisplay(new Date()),
      real: { tool: 'invoice', started: realInvoice.started, completed: realInvoice.completed, trackingSince: '2026-10-20' },
    },
  });
}
