/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../_cors.js';
import { rateLimit } from '../_rate-limit.js';
import { verifyBearerUser } from '../_auth.js';
import { getDbPool } from '../_db.js';

function getSupabaseAdminHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const rl = rateLimit(req, { max: 3, windowMs: 3_600_000, prefix: 'delete-account' });
  if (!rl.ok) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyBearerUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;
  const pool = getDbPool();

  try {
    // 1. Anonymize personal data payloads
    await pool.query(`UPDATE parents SET payload = '{}', updated_at = NOW() WHERE user_id = $1`, [
      userId,
    ]);
    await pool.query(`UPDATE nannies SET payload = '{}', updated_at = NOW() WHERE user_id = $1`, [
      userId,
    ]);

    // 2. Delete support conversation
    await pool.query(
      `DELETE FROM support_messages
         WHERE ticket_id IN (SELECT id FROM support_tickets WHERE family_id = $1)`,
      [userId],
    );
    await pool.query(`DELETE FROM support_tickets WHERE family_id = $1`, [userId]);

    // 3. Nullify non-cascade FK references so auth user can be deleted
    await pool.query(`UPDATE matching_outcomes SET parent_id = NULL WHERE parent_id = $1`, [
      userId,
    ]);
    await pool.query(`UPDATE matching_outcomes SET nanny_id  = NULL WHERE nanny_id  = $1`, [
      userId,
    ]);
    await pool.query(`UPDATE chat_messages    SET sender_id  = NULL WHERE sender_id  = $1`, [
      userId,
    ]);

    // 4. Delete the auth user — cascades to parents, nannies, phone_otps, etc.
    const base = getSupabaseUrl();
    const delResp = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getSupabaseAdminHeaders(),
    });

    if (!delResp.ok) {
      const err = await delResp.text().catch(() => 'unknown');
      console.error(`[delete-account] Supabase delete failed for ${userId}:`, err);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('[delete-account] Error:', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
