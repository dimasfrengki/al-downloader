// Helper bersama (file berawalan "_" tidak jadi endpoint publik)
const MAIN = 'https://putzoffc.vercel.app/api';
const DLQ = ['apkcombo', 'apkpure']; // param "query", sisanya "url"
const DL = ['apkcombo','apkpure','bstation','capcut','dailymotion','facebook','fb-reel','github','gofile','gdrive','instagram','krakenfiles','mediafire','pinterest','pixeldrain','sfile','snackvideo','soundcloud','spotify','spotify2','terabox','threads','tiktok','twitter','youtube','ytdl-mp3','ytdl-mp4'];
const EXT = { shopeevid: 'https://api.ikyyxd.my.id/download/shopeevid', videy: 'https://api.ikyyxd.my.id/download/videy' };
const SEARCH = { bstation:'q', chord:'query', gimage:'q', google:'query', gsmarena:'query', komik:'query', lirik:'query', otakudesu:'q', pinterest:'q', pinterestvid:'q', playstore:'query', resep:'query', sfile:'q', spotify:'q', tiktok:'q', wallpaper:'query', wikipedia:'query' };

// Template URL: {q} = input user, {apikey} = apikey, {type} = mp3/mp4 (khusus YouTube)
export const REG = [];
DL.forEach(ep => REG.push({ id: 'dl:' + ep, kind: 'dl', ep, url: `${MAIN}/download/${ep}?apikey={apikey}&${DLQ.includes(ep) ? 'query' : 'url'}={q}` + (ep === 'youtube' ? '&type={type}' : '') }));
Object.keys(EXT).forEach(ep => REG.push({ id: 'dl:' + ep, kind: 'dl', ep, url: EXT[ep] + '?url={q}' }));
Object.entries(SEARCH).forEach(([ep, p]) => REG.push({ id: 'search:' + ep, kind: 'search', ep, url: `${MAIN}/search/${ep}?apikey={apikey}&${p}={q}` }));
export const find = (kind, ep) => REG.find(r => r.kind === kind && r.ep === ep);

// Penyimpanan config: Upstash Redis (Vercel Marketplace > Storage)
const RU = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const RT = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const hasRedis = () => !!(RU() && RT());
export async function redis(cmd) {
  const r = await fetch(RU(), { method: 'POST', headers: { Authorization: 'Bearer ' + RT(), 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
let cache = { t: 0, v: {} };
export async function getCfg(force) {
  if (!hasRedis()) return {};
  if (!force && Date.now() - cache.t < 15000) return cache.v;
  try { const s = await redis(['GET', 'cfg']); cache = { t: Date.now(), v: s ? JSON.parse(s) : {} }; } catch {}
  return cache.v;
}
export async function setCfg(c) { await redis(['SET', 'cfg', JSON.stringify(c)]); cache = { t: Date.now(), v: c }; }

export const fill = (tpl, v) => tpl.replace(/\{(q|apikey|type)\}/g, (_, k) => encodeURIComponent(v[k] ?? ''));
export async function fetchT(url, ms = 25000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'Mozilla/5.0' } }); } finally { clearTimeout(t); }
}
export const looksOk = (status, text) => {
  if (status < 200 || status >= 300) return false;
  try { const j = JSON.parse(text); if (j && (j.status === false || j.success === false || j.error)) return false; } catch {}
  return true;
};
