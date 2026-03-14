/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = String(req.query.q || '').trim();
  if (!q || q.length < 2) return res.status(200).json({ items: [] });

  try {
    const yandexKey = process.env.YANDEX_GEOCODER_API_KEY;

    // 1) Prefer Yandex when key exists
    if (yandexKey) {
      const yUrl = `https://geocode-maps.yandex.ru/1.x/?apikey=${encodeURIComponent(yandexKey)}&format=json&geocode=${encodeURIComponent(q)}&results=5`;
      const yr = await fetch(yUrl);
      const yj = await yr.json().catch(() => null);
      const yItems = (yj?.response?.GeoObjectCollection?.featureMember || [])
        .map((x: any) => x?.GeoObject?.metaDataProperty?.GeocoderMetaData?.text)
        .filter(Boolean)
        .slice(0, 5);
      if (yItems.length) return res.status(200).json({ items: yItems, provider: 'yandex' });
    }

    // 2) Fallback to OpenStreetMap Nominatim
    const nUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5`;
    const nr = await fetch(nUrl, {
      headers: { 'User-Agent': 'blizko-app/1.0 (local dev)' },
    });
    const nj = await nr.json().catch(() => []);
    const nItems = (Array.isArray(nj) ? nj : [])
      .map((x: any) => x?.display_name)
      .filter(Boolean)
      .slice(0, 5);

    return res.status(200).json({ items: nItems, provider: 'nominatim' });
  } catch (e: any) {
    return res.status(200).json({ items: [], error: String(e?.message || e) });
  }
}
