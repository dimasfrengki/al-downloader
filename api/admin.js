import crypto from 'node:crypto';
import { REG, getCfg, setCfg, hasRedis, redis, fill, fetchT } from './_lib.js';

const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const obj = a => { if (!a) return {}; if (!Array.isArray(a)) return a; const o = {}; for (let i = 0; i < a.length; i += 2) o[a[i]] = a[i + 1]; return o; };

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return res.status(500).json({ error: 'ADMIN_PASSWORD belum di-set di Environment Variables Vercel' });

  let b = {};
  try { b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch {}
  if (!crypto.timingSafeEqual(sha(b.password || ''), sha(pw))) {
    await new Promise(r => setTimeout(r, 800));
    return res.status(401).json({ error: 'Password salah' });
  }

  if (b.action === 'get') {
    const cfg = await getCfg(true);
    let stats = {}, last = {};
    if (hasRedis()) {
      try {
        const s = obj(await redis(['HGETALL', 'stats'])); for (const k in s) stats[k] = +s[k];
        const l = obj(await redis(['HGETALL', 'lasterr'])); for (const k in l) { try { last[k] = JSON.parse(l[k]); } catch {} }
      } catch {}
    }
    return res.json({ redis: hasRedis(), cfg, stats, last, reg: REG });
  }

  if (b.action === 'save') {
    if (!hasRedis()) return res.status(400).json({ error: 'Database belum terhubung (lihat panduan di atas)' });
    const inc = b.cfg || {};
    const out = { apikey: String(inc.apikey || '').slice(0, 200), announcement: String(inc.announcement || '').slice(0, 300), ep: {} };
    for (const [id, v] of Object.entries(inc.ep || {})) {
      if (!REG.some(r => r.id === id) || !v) continue;
      const url = String(v.url || '').trim(), fb = String(v.fallback || '').trim();
      if ((url && !/^https?:\/\//.test(url)) || (fb && !/^https?:\/\//.test(fb))) return res.status(400).json({ error: `URL untuk ${id} harus diawali http:// atau https://` });
      if (url || fb || v.off) out.ep[id] = { url, fallback: fb, off: !!v.off };
    }
    try { await setCfg(out); } catch (e) { return res.status(500).json({ error: 'Gagal menyimpan: ' + e.message }); }
    return res.json({ ok: true });
  }

  if (b.action === 'test') {
    const reg = REG.find(r => r.id === b.id);
    if (!reg) return res.status(400).json({ error: 'Endpoint tidak dikenal' });
    const cfg = await getCfg();
    const tpl = String(b.url || '').trim() || reg.url;
    if (!/^https?:\/\//.test(tpl)) return res.status(400).json({ error: 'URL harus diawali http(s)://' });
    const v = { q: b.q || '', type: b.type === 'mp4' ? 'mp4' : 'mp3', apikey: cfg.apikey || process.env.APIKEY || 'ptz' };
    const t0 = Date.now();
    try {
      const r = await fetchT(fill(tpl, v), 20000);
      const text = await r.text();
      return res.json({ status: r.status, ms: Date.now() - t0, body: text.slice(0, 3500), url: fill(tpl, { ...v, apikey: '***' }) });
    } catch (e) {
      return res.json({ status: 0, ms: Date.now() - t0, body: 'Error: ' + e.message, url: fill(tpl, { ...v, apikey: '***' }) });
    }
  }

  if (b.action === 'resetstats') {
    if (hasRedis()) { try { await redis(['DEL', 'stats']); await redis(['DEL', 'lasterr']); } catch {} }
    return res.json({ ok: true });
  }
  return res.status(400).json({ error: 'Action tidak dikenal' });
}
