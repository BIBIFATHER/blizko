/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../_cors.js';
import { rateLimit } from '../_rate-limit.js';
import { verifyBearerUser } from '../_auth.js';
import { getDbPool } from '../_db.js';
import { logError } from '../_logScrub.js';

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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Anonymize PII and clean up data within a transaction
    await client.query(`UPDATE parents SET payload = '{}', updated_at = NOW() WHERE user_id = $1`, [
      userId,
    ]);
    await client.query(`UPDATE nannies SET payload = '{}', updated_at = NOW() WHERE user_id = $1`, [
      userId,
    ]);
    await client.query(
      `DELETE FROM support_messages
         WHERE ticket_id IN (SELECT id FROM support_tickets WHERE family_id = $1)`,
      [userId],
    );
    await client.query(`DELETE FROM support_tickets WHERE family_id = $1`, [userId]);
    await client.query(`UPDATE matching_outcomes SET parent_id = NULL WHERE parent_id = $1`, [
      userId,
    ]);
    await client.query(`UPDATE matching_outcomes SET nanny_id  = NULL WHERE nanny_id  = $1`, [
      userId,
    ]);
    await client.query(`UPDATE chat_messages    SET sender_id  = NULL WHERE sender_id  = $1`, [
      userId,
    ]);

    // Delete the auth user — this is outside the DB transaction (HTTP call).
    // We attempt auth deletion BEFORE committing so we can roll back if it fails.
    const base = getSupabaseUrl();
    const delResp = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getSupabaseAdminHeaders(),
    });

    if (!delResp.ok) {
      await client.query('ROLLBACK');
      const err = await delResp.text().catch(() => 'unknown');
      logError(`[delete-account] Supabase auth delete failed for ${userId}:`, err);
      return res.status(500).json({ error: 'Failed to delete account' });
    }

    await client.query('COMMIT');
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    await client.query('ROLLBACK').catch(() => {});
    logError('[delete-account] Error:', e);
    return res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }
}
