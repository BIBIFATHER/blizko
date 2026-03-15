/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_cors.js';
import { rateLimit } from './_rate-limit.js';
import { getServerEnv } from './_auth.js';

const PUBLIC_FIELDS_TO_REMOVE = ['contact', 'documents', 'resumeNormalized'];

function stripSensitiveFields(payload: Record<string, unknown>) {
  const sanitized = { ...payload };
  for (const field of PUBLIC_FIELDS_TO_REMOVE) {
    delete (sanitized as Record<string, unknown>)[field];
  }
  return sanitized;
}

function idMatchesPrefix(id: unknown, shortId: string) {
  return typeof id === 'string' && id.startsWith(shortId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rl = rateLimit(req, { max: 30, prefix: 'public-nannies' });
  if (!rl.ok) return res.status(429).json({ error: 'Too many requests' });

  const { supabaseUrl, supabaseServiceRoleKey } = getServerEnv();
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: 'Supabase is not configured' });
  }

  const shortId = String((req.query as Record<string, unknown>)?.id || '').trim();
  if (!shortId) {
    return res.status(400).json({ error: 'Missing id' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/nannies_public?select=id,payload,created_at&order=created_at.desc`, {
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
      },
    });

    const data = await response.json().catch(() => []);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to load nannies' });
    }

    const item = Array.isArray(data)
      ? data
          .map((row) => ({
            ...(stripSensitiveFields((row?.payload || {}) as Record<string, unknown>)),
            id: row?.payload?.id ?? row?.id,
            createdAt: row?.payload?.createdAt ?? (row?.created_at ? new Date(row.created_at).getTime() : Date.now()),
          }))
          .find((nanny) => idMatchesPrefix(nanny.id, shortId))
      : null;

    if (!item) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json({ item });
  } catch (error: any) {
    return res.status(500).json({ error: String(error?.message || error) });
  }
}
