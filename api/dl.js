// Vercel Serverless Function: proxy ke API supaya tidak kena CORS & apikey tidak terlihat di browser
const BASE = 'https://putzoffc.vercel.app/api/download';
const ALLOWED = ['apkcombo','apkpure','bstation','capcut','dailymotion','facebook','fb-reel','github','gofile','gdrive','instagram','krakenfiles','mediafire','pinterest','pixeldrain','sfile','snackvideo','soundcloud','spotify','spotify2','terabox','threads','tiktok','twitter','youtube','ytdl-mp3','ytdl-mp4'];

const SEARCH = { bstation:'q', chord:'query', gimage:'q', google:'query', gsmarena:'query', komik:'query', lirik:'query', otakudesu:'q', pinterest:'q', pinterestvid:'q', playstore:'query', resep:'query', sfile:'q', spotify:'q', tiktok:'q', wallpaper:'query', wikipedia:'query' };

export default async function handler(req, res) {
  if (req.query.kind === 'search') {
    const { ep, q } = req.query;
    if (!SEARCH[ep]) return res.status(400).json({ error: 'Endpoint tidak valid' });
    if (!q) return res.status(400).json({ error: 'Isi kata kunci dulu' });
    const key = process.env.APIKEY || 'ptz';
    try {
      const r = await fetch(`https://putzoffc.vercel.app/api/search/${ep}?apikey=${encodeURIComponent(key)}&${SEARCH[ep]}=${encodeURIComponent(q)}`);
      const text = await r.text();
      res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
      return res.status(r.status).send(text);
    } catch (e) {
      return res.status(502).json({ error: 'Gagal menghubungi API', detail: String(e) });
    }
  }
  const { ep, q, type } = req.query;
  if (!ALLOWED.includes(ep)) return res.status(400).json({ error: 'Endpoint tidak valid' });
  if (!q) return res.status(400).json({ error: 'Isi link / query dulu' });

  const key = process.env.APIKEY || 'ptz';
  const param = ['apkcombo', 'apkpure'].includes(ep) ? 'query' : 'url';
  const target = `${BASE}/${ep}?apikey=${encodeURIComponent(key)}&${param}=${encodeURIComponent(q)}${ep === 'youtube' ? '&type=' + (type === 'mp4' ? 'mp4' : 'mp3') : ''}`;

  try {
    const r = await fetch(target);
    const text = await r.text();
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: 'Gagal menghubungi API', detail: String(e) });
  }
}
