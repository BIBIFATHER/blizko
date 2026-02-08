/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

const TABLE = 'parents';
const json = (res: VercelResponse, status: number, payload: any) => res.status(status).json(payload);

function env() {
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function sb(path: string, init: RequestInit, url: string, key: string) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init.headers || {}),
    },
  });
}

const fromRow = (r: any) => {
  const payload = r?.payload ?? {};
  const createdAt = payload?.createdAt ?? (r?.created_at ? new Date(r.created_at).getTime() : Date.now());
  return {
    ...payload,
    id: payload?.id ?? r?.id,
    createdAt: Number(createdAt),
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { url, key } = env();
  if (!url || !key) return json(res, 500, { error: 'Supabase is not configured' });

  try {
    if (req.method === 'GET') {
      const r = await sb(`${TABLE}?select=id,payload,created_at&order=created_at.desc`, { method: 'GET' }, url, key);
      const data = await r.json().catch(() => []);
      if (!r.ok) return json(res, r.status, { error: data?.message || 'Failed to read parents' });
      return json(res, 200, { items: (data || []).map(fromRow) });
    }

    if (req.method === 'POST') {
      const item = req.body?.item;
      if (!item?.id) return json(res, 400, { error: 'Missing item.id' });

      const row = { id: item.id, payload: item };
      const r = await sb(
        `${TABLE}?on_conflict=id`,
        {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify([row]),
        },
        url,
        key,
      );
      const data = await r.json().catch(() => []);
      if (!r.ok) return json(res, r.status, { error: data?.message || 'Failed to save parent' });
      const saved = Array.isArray(data) && data[0] ? fromRow(data[0]) : item;
      return json(res, 200, { item: saved });
    }

    if (req.method === 'DELETE') {
      const testOnly = String((req.query as any)?.testOnly || '') === '1';
      const filter = testOnly ? 'id=like.test-%25' : 'id=neq.__none__';
      const r = await sb(`${TABLE}?${filter}`, { method: 'DELETE' }, url, key);
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        return json(res, r.status, { error: data?.message || 'Failed to clear parents' });
      }
      return json(res, 200, { ok: true, testOnly });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e: any) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
