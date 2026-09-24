import { getCfg } from './_lib.js';
// Config publik (tanpa rahasia): pengumuman + daftar fitur yang dimatikan
export default async function handler(req, res) {
  const c = await getCfg();
  const off = Object.entries(c.ep || {}).filter(([, v]) => v && v.off).map(([k]) => k);
  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
  res.json({ announcement: c.announcement || '', off });
}
