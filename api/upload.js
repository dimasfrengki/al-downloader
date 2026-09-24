// Upload ke Catbox (permanen) atau Litterbox (sementara). Batas body Vercel ~4,5 MB.
const CATBOX = 'https://catbox.moe/user/api.php';
const LITTER = 'https://litterbox.catbox.moe/resources/internals/api.php';
const MAX = 4.4 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { mode = 'file', expire = '0', name = 'file', url } = req.query;
  const uh = process.env.CATBOX_USERHASH; // opsional: akun Catbox
  const fd = new FormData();
  let target = CATBOX;

  if (mode === 'url') {
    if (!/^https?:\/\//i.test(url || '')) return res.status(400).json({ error: 'Link harus diawali http:// atau https://' });
    fd.append('reqtype', 'urlupload');
    fd.append('url', url);
    if (uh) fd.append('userhash', uh);
  } else {
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ error: 'File kosong' });
    if (buf.length > MAX) return res.status(413).json({ error: 'File lebih dari 4 MB, tidak bisa lewat server' });
    const safe = String(name).replace(/[^\w.\- ]/g, '_').slice(0, 100) || 'file';
    fd.append('reqtype', 'fileupload');
    if (['1h', '12h', '24h', '72h'].includes(expire)) { target = LITTER; fd.append('time', expire); }
    else if (uh) fd.append('userhash', uh);
    fd.append('fileToUpload', new Blob([buf]), safe);
  }

  const c = new AbortController(); const t = setTimeout(() => c.abort(), 55000);
  try {
    const r = await fetch(target, { method: 'POST', body: fd, signal: c.signal });
    const text = (await r.text()).trim();
    if (!r.ok || !/^https?:\/\//i.test(text)) return res.status(502).json({ error: text.slice(0, 200) || 'Upload gagal' });
    return res.json({ url: text });
  } catch (e) {
    return res.status(502).json({ error: e.name === 'AbortError' ? 'Upload terlalu lama (timeout)' : 'Gagal menghubungi Catbox' });
  } finally { clearTimeout(t); }
}
