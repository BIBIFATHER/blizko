/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../_cors.js';
import { rateLimit } from '../_rate-limit.js';
import { verifyBearerUser } from '../_auth.js';
import { getDbPool } from '../_db.js';
import { logError } from '../_logScrub.js';

const ACTIVE_BOOKING_STATUSES = ['confirmed', 'active'];

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

function isConfirmedUserNotFound(status: number, bodyText: string): boolean {
  if (status !== 404) return false;
  try {
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    return body.error_code === 'user_not_found' || body.code === 'user_not_found';
  } catch {
    return false;
  }
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
  let alreadyDeleted = false;

  try {
    await client.query('BEGIN');

    // C10 lock order: parents -> nannies -> account_deletions -> bookings.
    // The own profile rows are locked even when the account has no bookings.
    await client.query('SELECT user_id FROM parents WHERE user_id = $1 FOR UPDATE', [userId]);
    await client.query('SELECT user_id FROM nannies WHERE user_id = $1 FOR UPDATE', [userId]);

    await client.query(
      `INSERT INTO account_deletions (user_id, state)
       VALUES ($1, 'deleting')
       ON CONFLICT (user_id) DO UPDATE SET state = 'deleting', updated_at = now()
       WHERE account_deletions.state <> 'deleted'`,
      [userId],
    );

    // Pending rows carry no payment record in the current product model.
    // Confirmations are removed through their ON DELETE CASCADE FK.
    await client.query(
      `DELETE FROM bookings
       WHERE status = 'pending' AND (parent_id = $1 OR nanny_id = $1)`,
      [userId],
    );

    await client.query(
      `UPDATE bookings SET status = 'cancelled'
       WHERE status = ANY($2) AND (parent_id = $1 OR nanny_id = $1)`,
      [userId, ACTIVE_BOOKING_STATUSES],
    );

    await client.query(
      `UPDATE bookings SET parent_id = NULL, request_id = NULL, parent_erased_at = now()
       WHERE status IN ('completed','cancelled') AND parent_id = $1`,
      [userId],
    );
    await client.query(
      `UPDATE bookings SET nanny_id = NULL, nanny_erased_at = now()
       WHERE status IN ('completed','cancelled') AND nanny_id = $1`,
      [userId],
    );

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
    await client.query('DELETE FROM support_tickets WHERE family_id = $1', [userId]);
    // These identity columns are NOT NULL in the real schema. Delete personal
    // feedback/chat rows instead of issuing impossible NULL updates.
    await client.query('DELETE FROM matching_outcomes WHERE parent_id = $1 OR nanny_id = $1', [
      userId,
    ]);
    await client.query('DELETE FROM chat_threads WHERE family_id = $1 OR nanny_id = $1', [userId]);
    await client.query('DELETE FROM chat_messages WHERE sender_id = $1', [userId]);
    await client.query('DELETE FROM chat_participants WHERE user_id = $1', [userId]);

    // Remove remaining auth.users FK blockers while retaining minimized audit
    // and referral records whose non-departing subject may still need them.
    await client.query(
      'UPDATE referrals SET referrer_id = NULL, referrer_name = NULL WHERE referrer_id = $1',
      [userId],
    );
    await client.query('UPDATE admin_actions SET admin_id = NULL WHERE admin_id = $1', [userId]);

    const { rows: stateRows } = await client.query<{ state: string }>(
      `UPDATE account_deletions SET state = 'db_done', updated_at = now()
       WHERE user_id = $1 AND state <> 'deleted'
       RETURNING state`,
      [userId],
    );
    alreadyDeleted = stateRows.length === 0;
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logError('[delete-account] DB phase failed:', error);
    return res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }

  if (alreadyDeleted) return res.status(200).json({ ok: true });

  const base = getSupabaseUrl();
  await fetch(`${base}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: getSupabaseAdminHeaders(),
    body: JSON.stringify({ ban_duration: '876000h' }),
  }).catch((error) => logError('[delete-account] ban failed:', error));

  let authDeleted = false;
  let authError = '';
  try {
    const response = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getSupabaseAdminHeaders(),
    });
    if (response.ok) {
      authDeleted = true;
    } else {
      const bodyText = await response.text().catch(() => 'unknown');
      authDeleted = isConfirmedUserNotFound(response.status, bodyText);
      if (!authDeleted) authError = bodyText;
    }
  } catch (error) {
    authError = error instanceof Error ? error.message : String(error);
  }

  if (!authDeleted) {
    logError(`[delete-account] Auth delete failed for ${userId}; retry scheduled:`, authError);
    await pool
      .query(
        `UPDATE account_deletions
         SET attempts = attempts + 1, last_error = $2, updated_at = now()
         WHERE user_id = $1 AND state = 'db_done'`,
        [userId, authError.slice(0, 500)],
      )
      .catch((error) => logError('[delete-account] attempts update failed:', error));
    return res.status(202).json({ ok: true, pending: true });
  }

  await pool
    .query(
      `UPDATE account_deletions SET state = 'deleted', updated_at = now()
       WHERE user_id = $1 AND state = 'db_done'`,
      [userId],
    )
    .catch((error) => logError('[delete-account] state update failed:', error));
  return res.status(200).json({ ok: true });
}
