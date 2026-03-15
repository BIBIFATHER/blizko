/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_cors.js';
import { rateLimit } from './_rate-limit.js';
import { getServerEnv, verifyBearerAdmin } from './_auth.js';

const json = (res: VercelResponse, status: number, payload: any) => res.status(status).json(payload);
const TABLES = new Set(['parents', 'nannies']);

function getTable(req: VercelRequest): 'parents' | 'nannies' | null {
  const resource = String((req.query as any)?.resource || '').trim().toLowerCase();
  return TABLES.has(resource) ? (resource as 'parents' | 'nannies') : null;
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
  setCors(req.headers.origin, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const table = getTable(req);
  if (!table) return json(res, 400, { error: 'Missing or invalid resource' });

  const rl = rateLimit(req, { max: 30, prefix: `data:${table}` });
  if (!rl.ok) return json(res, 429, { error: 'Too many requests. Try again later.' });

  const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = getServerEnv();
  if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
    return json(res, 500, { error: 'Supabase is not configured' });
  }

  const adminUser = await verifyBearerAdmin(req);
  if (!adminUser) return json(res, 403, { error: 'Admin access required' });

  try {
    if (req.method === 'GET') {
      const response = await sb(`${table}?select=id,payload,created_at&order=created_at.desc`, { method: 'GET' }, supabaseUrl, supabaseServiceRoleKey);
      const data = await response.json().catch(() => []);
      if (!response.ok) return json(res, response.status, { error: data?.message || `Failed to read ${table}` });
      return json(res, 200, { items: (data || []).map(fromRow) });
    }

    if (req.method === 'POST') {
      const item = req.body?.item;
      if (!item?.id) return json(res, 400, { error: 'Missing item.id' });

      const row = { id: item.id, payload: item };
      const response = await sb(
        `${table}?on_conflict=id`,
        {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify([row]),
        },
        supabaseUrl,
        supabaseServiceRoleKey,
      );
      const data = await response.json().catch(() => []);
      if (!response.ok) return json(res, response.status, { error: data?.message || `Failed to save ${table}` });
      const saved = Array.isArray(data) && data[0] ? fromRow(data[0]) : item;
      return json(res, 200, { item: saved });
    }

    if (req.method === 'DELETE') {
      const testOnly = String((req.query as any)?.testOnly || '') === '1';
      const filter = testOnly ? 'id=like.test-%25' : 'id=neq.__none__';
      const response = await sb(`${table}?${filter}`, { method: 'DELETE' }, supabaseUrl, supabaseServiceRoleKey);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return json(res, response.status, { error: data?.message || `Failed to clear ${table}` });
      }
      return json(res, 200, { ok: true, testOnly });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e: any) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
