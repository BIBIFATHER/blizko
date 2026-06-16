/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_cors.js';
import { rateLimit } from './_rate-limit.js';
import nanniesHandler from './_nannies.js';
import { geocodeExternalEgressDecision } from './_geocodeEgress.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Shared public-read function to stay under the Vercel Hobby 12-function cap.
  // `/api/nannies` is rewritten (vercel.json) to `/api/geocode?resource=nannies`
  // and dispatched here; the public nanny lookup keeps its own CORS/method/rate
  // limits inside the delegated handler. The native `/api/geocode` path (no
  // `resource` param) falls through to the geocoder logic below, unchanged.
  if (req.query.resource === 'nannies') return nanniesHandler(req, res);

  setCors(req.headers.origin, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rl = rateLimit(req, { max: 20, prefix: 'geocode' });
  if (!rl.ok) return res.status(429).json({ error: 'Too many requests' });

  const q = String(req.query.q || '').trim();
  const lat = String(req.query.lat || '').trim();
  const lon = String(req.query.lon || '').trim();
  const lang = String(req.query.lang || 'ru').trim() || 'ru';

  const hasReverseCoords = lat !== '' && lon !== '';
  if (!hasReverseCoords && (!q || q.length < 2)) return res.status(200).json({ items: [] });

  // BLI-110: fail-closed before any external geocode egress (free-text address /
  // GPS to Yandex + Nominatim). Allowed in the synthetic contour; blocked once
  // real data could be admitted, until an explicit gate is approved.
  const egress = geocodeExternalEgressDecision();
  if (egress.closed) {
    return res.status(egress.status).json({ items: [], blocked: true, reason: egress.reason });
  }

  try {
    const yandexKey = process.env.YANDEX_GEOCODER_API_KEY;

    if (hasReverseCoords) {
      const geocode = `${lon},${lat}`;

      if (yandexKey) {
        const yUrl = `https://geocode-maps.yandex.ru/1.x/?apikey=${encodeURIComponent(yandexKey)}&format=json&geocode=${encodeURIComponent(geocode)}&results=1&lang=${encodeURIComponent(lang === 'ru' ? 'ru_RU' : 'en_US')}`;
        const yr = await fetch(yUrl);
        const yj = await yr.json().catch(() => null);
        const meta =
          yj?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.metaDataProperty
            ?.GeocoderMetaData;
        const components = meta?.Address?.Components || [];
        const city =
          components.find((x: any) => x?.kind === 'locality')?.name ||
          components.find((x: any) => x?.kind === 'province')?.name ||
          '';
        const district =
          components.find((x: any) => x?.kind === 'district')?.name ||
          components.find((x: any) => x?.kind === 'area')?.name ||
          '';
        if (city || district) {
          return res.status(200).json({ city, district, provider: 'yandex' });
        }
      }

      const nUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&accept-language=${encodeURIComponent(lang)}`;
      const nr = await fetch(nUrl, {
        headers: { 'User-Agent': 'blizko-app/1.0 (local dev)' },
      });
      const data = await nr.json().catch(() => null);
      const city = data?.address?.city || data?.address?.town || data?.address?.village || '';
      const district =
        data?.address?.suburb || data?.address?.city_district || data?.address?.neighbourhood || '';
      return res.status(200).json({ city, district, provider: 'nominatim' });
    }

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
