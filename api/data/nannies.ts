/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

const TABLE = 'nannies';
const json = (res: VercelResponse, status: number, payload: any) => res.status(status).json(payload);

function envWithLocalFallback(key: string): string | undefined {
  const direct = process.env[key];
  if (direct) return direct;

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const raw = fs.readFileSync(envPath, 'utf8');
    const m = raw.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return m?.[1]?.trim();
  } catch {
    return undefined;
  }
}

function env() {
  return {
    url: envWithLocalFallback('SUPABASE_URL'),
    key: envWithLocalFallback('SUPABASE_SERVICE_ROLE_KEY'),
    anon: envWithLocalFallback('SUPABASE_ANON_KEY'),
    admins: envWithLocalFallback('ADMIN_EMAILS') || envWithLocalFallback('ADMIN_EMAIL') || '',
  };
}

async function requireAdmin(req: VercelRequest, url: string, anonKey: string, adminsRaw: string): Promise<boolean> {
  const auth = String(req.headers.authorization || '');
  if (!auth.toLowerCase().startsWith('bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;

  const admins = adminsRaw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!admins.length) return false;

  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!r.ok) return false;
    const u = await r.json().catch(() => ({}));
    const email = String(u?.email || '').toLowerCase();
    return !!email && admins.includes(email);
  } catch {
    return false;
  }
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

  const { url, key, anon, admins } = env();
  if (!url || !key || !anon) return json(res, 500, { error: 'Supabase is not configured' });

  const isAdmin = await requireAdmin(req, url, anon, admins);
  if (!isAdmin) return json(res, 403, { error: 'Admin access required' });

  try {
    if (req.method === 'GET') {
      const r = await sb(`${TABLE}?select=id,payload,created_at&order=created_at.desc`, { method: 'GET' }, url, key);
      const data = await r.json().catch(() => []);
      if (!r.ok) return json(res, r.status, { error: data?.message || 'Failed to read nannies' });
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
      if (!r.ok) return json(res, r.status, { error: data?.message || 'Failed to save nanny' });
      const saved = Array.isArray(data) && data[0] ? fromRow(data[0]) : item;
      return json(res, 200, { item: saved });
    }

    if (req.method === 'DELETE') {
      const testOnly = String((req.query as any)?.testOnly || '') === '1';
      const filter = testOnly ? 'id=like.test-%25' : 'id=neq.__none__';
      const r = await sb(`${TABLE}?${filter}`, { method: 'DELETE' }, url, key);
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        return json(res, r.status, { error: data?.message || 'Failed to clear nannies' });
      }
      return json(res, 200, { ok: true, testOnly });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e: any) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
