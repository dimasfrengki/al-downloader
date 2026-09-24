import { find, getCfg, hasRedis, redis, fill, fetchT, looksOk } from './_lib.js';

export default async function handler(req, res) {
  const { kind = 'dl', ep, q, type } = req.query;
  const reg = find(kind === 'search' ? 'search' : 'dl', ep);
  if (!reg) return res.status(400).json({ error: 'Endpoint tidak valid' });
  if (!q) return res.status(400).json({ error: 'Isi dulu kolomnya' });

  const cfg = await getCfg();
  const e = (cfg.ep && cfg.ep[reg.id]) || {};
  if (e.off) return res.status(503).json({ error: 'Fitur ini sedang maintenance, coba lagi nanti' });

  const v = { q, type: type === 'mp4' ? 'mp4' : 'mp3', apikey: cfg.apikey || process.env.APIKEY || 'ptz' };
  const urls = [e.url || reg.url, e.fallback].filter(Boolean); // utama, lalu cadangan
  let last = { status: 502, text: JSON.stringify({ error: 'Gagal menghubungi API' }), ct: 'application/json' }, ok = false;

  for (const u of urls) {
    try {
      const r = await fetchT(fill(u, v));
      const text = await r.text();
      last = { status: r.status, text, ct: r.headers.get('content-type') || 'application/json' };
      if (looksOk(r.status, text)) { ok = true; break; }
    } catch {
      last = { status: 504, text: JSON.stringify({ error: 'API tidak merespons (timeout)' }), ct: 'application/json' };
    }
  }

  if (hasRedis()) { // catat statistik untuk admin
    try {
      await redis(['HINCRBY', 'stats', reg.id + (ok ? ':ok' : ':err'), 1]);
      if (!ok) await redis(['HSET', 'lasterr', reg.id, JSON.stringify({ t: Date.now(), s: last.status, m: last.text.slice(0, 200) })]);
    } catch {}
  }
  res.setHeader('Content-Type', last.ct);
  res.status(ok ? 200 : last.status >= 400 ? last.status : 502).send(last.text);
}
