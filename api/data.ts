/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from './_cors.js';
import { rateLimit } from './_rate-limit.js';
import { getServerEnv, verifyBearerAdmin, verifyBearerUser } from './_auth.js';
import { getDbPool } from './_db.js';

const json = (res: VercelResponse, status: number, payload: any) => res.status(status).json(payload);
const RESOURCES = new Set(['parents', 'nannies', 'analytics']);
const ANALYTICS_EVENT_LIMIT = 5_000;
const ANALYTICS_ALLOWED_EVENTS = new Set([
  'page_view',
  'cta_clicked',
  'form_step_completed',
  'form_submitted',
  'matching_results_viewed',
  'nanny_card_clicked',
  'chat_opened',
  'booking_created',
  'return_visit',
  'document_uploaded',
  'location_detected',
  'resume_parsed',
  'resume_autofill_applied',
  'nanny_ready_for_match',
  'match_profile_opened',
  'match_follow_up_shown',
  'match_follow_up_clicked',
  'share_clicked',
  'auth_modal_opened',
  'auth_completed',
  'language_switched',
  'install_prompt_shown',
  'install_accepted',
  'nanny_offer_shown',
  'nanny_offer_accepted',
  'admin_panel_opened',
]);

function getResource(req: VercelRequest): 'parents' | 'nannies' | 'analytics' | null {
  const resource = String((req.query as any)?.resource || '').trim().toLowerCase();
  return RESOURCES.has(resource) ? (resource as 'parents' | 'nannies' | 'analytics') : null;
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

function toAnalyticsRecord(row: any) {
  return {
    id: row?.id ? String(row.id) : undefined,
    event: String(row?.event || ''),
    properties: row?.properties && typeof row.properties === 'object' ? row.properties : {},
    timestamp: row?.occurred_at ? new Date(row.occurred_at).toISOString() : new Date().toISOString(),
    url: row?.url ? String(row.url) : undefined,
  };
}

function toAuditAnalyticsRecord(row: any) {
  const details = row?.details && typeof row.details === 'object' ? row.details : {};
  const eventType = String(row?.event_type || '');
  const event = eventType.startsWith('product_') ? eventType.slice('product_'.length) : eventType;

  return {
    id: details?.record_id ? String(details.record_id) : row?.id ? String(row.id) : undefined,
    event,
    properties: details?.properties && typeof details.properties === 'object' ? details.properties : {},
    timestamp: details?.occurred_at ? String(details.occurred_at) : row?.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    url: details?.url ? String(details.url) : undefined,
  };
}

function sanitizeAnalyticsRecord(input: any) {
  if (!input || typeof input !== 'object') return null;

  const event = String(input.event || '').trim();
  if (!ANALYTICS_ALLOWED_EVENTS.has(event)) return null;

  const properties =
    input.properties && typeof input.properties === 'object' && !Array.isArray(input.properties)
      ? input.properties
      : {};

  const propertiesSize = JSON.stringify(properties).length;
  if (propertiesSize > 8_192) return null;

  const timestamp = String(input.timestamp || '');
  const parsed = timestamp ? Date.parse(timestamp) : Date.now();
  if (!Number.isFinite(parsed)) return null;

  const sessionId = String((properties as any).session_id || '').trim().slice(0, 128);

  return {
    id: String(input.id || '').trim().slice(0, 128) || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    event,
    properties,
    timestamp: new Date(parsed).toISOString(),
    url: input.url ? String(input.url).slice(0, 256) : null,
    sessionId: sessionId || null,
  };
}

function getAnalyticsRestConfig() {
  const { supabaseUrl, supabaseServiceRoleKey } = getServerEnv();
  return supabaseUrl && supabaseServiceRoleKey
    ? { supabaseUrl, supabaseServiceRoleKey }
    : null;
}

async function fetchAnalyticsViaSupabase(days: number) {
  const config = getAnalyticsRestConfig();
  if (!config) return null;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/security_audit_log?select=id,event_type,details,created_at&event_type=like.product_%25&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=${ANALYTICS_EVENT_LIMIT}`,
    {
      method: 'GET',
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
      },
    },
  );
  const data = await response.json().catch(() => []);
  if (!response.ok) return null;
  return Array.isArray(data) ? data.map(toAuditAnalyticsRecord) : [];
}

async function saveAnalyticsViaSupabase(record: ReturnType<typeof sanitizeAnalyticsRecord>, userId?: string | null) {
  const config = getAnalyticsRestConfig();
  if (!config || !record) return false;

  const row = {
    event_type: `product_${record.event}`,
    user_id: userId || null,
    details: {
      source: 'product_analytics',
      record_id: record.id,
      url: record.url,
      session_id: record.sessionId,
      occurred_at: record.timestamp,
      properties: record.properties,
    },
  };

  const response = await fetch(`${config.supabaseUrl}/rest/v1/security_audit_log`, {
    method: 'POST',
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });

  return response.ok;
}

async function handleAnalytics(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const adminUser = await verifyBearerAdmin(req);
    if (!adminUser) return json(res, 403, { error: 'Admin access required' });

    const daysRaw = Number((req.query as any)?.days || 30);
    const days = Number.isFinite(daysRaw) ? Math.max(1, Math.min(90, Math.round(daysRaw))) : 30;

    try {
      const pool = getDbPool();
      const result = await pool.query(
        `
          SELECT id, event, properties, url, occurred_at
          FROM analytics_events
          WHERE occurred_at >= now() - ($1 || ' days')::interval
          ORDER BY occurred_at DESC
          LIMIT $2
        `,
        [String(days), ANALYTICS_EVENT_LIMIT],
      );

      return json(res, 200, { items: result.rows.map(toAnalyticsRecord), days, source: 'postgres' });
    } catch {
      const items = await fetchAnalyticsViaSupabase(days);
      if (items) return json(res, 200, { items, days, source: 'security_audit_log' });
      return json(res, 200, { items: [], days, source: 'disabled' });
    }
  }

  if (req.method === 'POST') {
    const record = sanitizeAnalyticsRecord(req.body?.record);
    if (!record) return json(res, 400, { error: 'Invalid analytics record' });

    const verifiedUser = await verifyBearerUser(req);

    try {
      const pool = getDbPool();

      await pool.query(
        `
          INSERT INTO analytics_events (id, event, properties, url, session_id, user_id, occurred_at)
          VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7::timestamptz)
          ON CONFLICT (id) DO NOTHING
        `,
        [
          record.id,
          record.event,
          JSON.stringify(record.properties),
          record.url,
          record.sessionId,
          verifiedUser?.id || null,
          record.timestamp,
        ],
      );

      return json(res, 201, { ok: true, source: 'postgres' });
    } catch {
      const saved = await saveAnalyticsViaSupabase(record, verifiedUser?.id || null);
      if (saved) return json(res, 201, { ok: true, source: 'security_audit_log' });
      return json(res, 202, { ok: false, skipped: 'analytics_store_unavailable' });
    }
  }

  return json(res, 405, { error: 'Method not allowed' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const resource = getResource(req);
  if (!resource) return json(res, 400, { error: 'Missing or invalid resource' });

  if (resource === 'analytics') {
    const limit = rateLimit(req, {
      max: req.method === 'POST' ? 180 : 20,
      prefix: `data:${resource}:${req.method.toLowerCase()}`,
    });
    if (!limit.ok) return json(res, 429, { error: 'Too many requests. Try again later.' });
    return handleAnalytics(req, res);
  }

  const rl = rateLimit(req, { max: 30, prefix: `data:${resource}` });
  if (!rl.ok) return json(res, 429, { error: 'Too many requests. Try again later.' });

  const { supabaseUrl, supabaseServiceRoleKey, supabaseAnonKey } = getServerEnv();
  if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
    return json(res, 500, { error: 'Supabase is not configured' });
  }

  const adminUser = await verifyBearerAdmin(req);
  if (!adminUser) return json(res, 403, { error: 'Admin access required' });

  try {
    if (req.method === 'GET') {
      const response = await sb(`${resource}?select=id,payload,created_at&order=created_at.desc`, { method: 'GET' }, supabaseUrl, supabaseServiceRoleKey);
      const data = await response.json().catch(() => []);
      if (!response.ok) return json(res, response.status, { error: data?.message || `Failed to read ${resource}` });
      return json(res, 200, { items: (data || []).map(fromRow) });
    }

    if (req.method === 'POST') {
      const item = req.body?.item;
      if (!item?.id) return json(res, 400, { error: 'Missing item.id' });

      const row = { id: item.id, payload: item };
      const response = await sb(
        `${resource}?on_conflict=id`,
        {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify([row]),
        },
        supabaseUrl,
        supabaseServiceRoleKey,
      );
      const data = await response.json().catch(() => []);
      if (!response.ok) return json(res, response.status, { error: data?.message || `Failed to save ${resource}` });
      const saved = Array.isArray(data) && data[0] ? fromRow(data[0]) : item;
      return json(res, 200, { item: saved });
    }

    if (req.method === 'DELETE') {
      const testOnly = String((req.query as any)?.testOnly || '') === '1';
      const filter = testOnly ? 'id=like.test-%25' : 'id=neq.__none__';
      const response = await sb(`${resource}?${filter}`, { method: 'DELETE' }, supabaseUrl, supabaseServiceRoleKey);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return json(res, response.status, { error: data?.message || `Failed to clear ${resource}` });
      }
      return json(res, 200, { ok: true, testOnly });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e: any) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
