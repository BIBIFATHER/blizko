/**
 * Retries Supabase Auth deletion for account lifecycles whose database phase
 * has already committed. This helper is reachable only through the CRON_SECRET
 * protected cron router.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from '../_db.js';
import { logError } from '../_logScrub.js';

const BATCH_SIZE = 20;
const LEASE_MINUTES = 5;
const MAX_ATTEMPTS = 5;

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
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pool = getDbPool();
  let deleted = 0;
  let stillPending = 0;
  let failed = 0;

  try {
    const batch = await pool.query<{ user_id: string; attempts: number }>(
      `UPDATE account_deletions
       SET lease_until = now() + interval '${LEASE_MINUTES} minutes'
       WHERE user_id IN (
         SELECT user_id
         FROM account_deletions
         WHERE state = 'db_done' AND (lease_until IS NULL OR lease_until < now())
         ORDER BY updated_at ASC
         LIMIT ${BATCH_SIZE}
         FOR UPDATE SKIP LOCKED
       )
       RETURNING user_id, attempts`,
    );

    const base = getSupabaseUrl();
    for (const row of batch.rows) {
      let authDeleted = false;
      let authError = '';
      try {
        const response = await fetch(`${base}/auth/v1/admin/users/${row.user_id}`, {
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

      if (authDeleted) {
        const completion = await pool.query(
          `UPDATE account_deletions
           SET state = 'deleted', lease_until = NULL, updated_at = now()
           WHERE user_id = $1 AND state = 'db_done'`,
          [row.user_id],
        );
        if (completion.rowCount === 1) deleted += 1;
        continue;
      }

      const nextAttempts = row.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        const completion = await pool.query(
          `UPDATE account_deletions
           SET state = 'failed', attempts = $2, last_error = $3,
               lease_until = NULL, updated_at = now()
           WHERE user_id = $1 AND state = 'db_done'`,
          [row.user_id, nextAttempts, authError.slice(0, 500)],
        );
        if (completion.rowCount === 1) failed += 1;
      } else {
        const completion = await pool.query(
          `UPDATE account_deletions
           SET attempts = attempts + 1, last_error = $2,
               lease_until = NULL, updated_at = now()
           WHERE user_id = $1 AND state = 'db_done'`,
          [row.user_id, authError.slice(0, 500)],
        );
        if (completion.rowCount === 1) stillPending += 1;
      }
    }

    return res.status(200).json({ ok: true, deleted, stillPending, failed });
  } catch (error) {
    logError('[reconcile-account-deletions] error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
