/**
 * Ghosted Outcomes Cron
 *
 * Marks matching_outcomes rows as 'ghosted' when a parent was shown nanny
 * candidates but took no action for 7+ days.
 *
 * Run daily via Vercel Cron (see vercel.json crons config).
 * Uses service_role key so it bypasses RLS — never expose to clients.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from '../_db.js';

const GHOST_AFTER_DAYS = 7;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const pool = getDbPool();
    const result = await pool.query<{ id: string; parent_id: string; nanny_id: string }>(
      `UPDATE matching_outcomes
       SET outcome = 'ghosted',
           updated_at = NOW()
       WHERE outcome IS NULL
         AND created_at < NOW() - INTERVAL '${GHOST_AFTER_DAYS} days'
       RETURNING id, parent_id, nanny_id`,
    );

    return res.status(200).json({
      ok: true,
      ghosted: result.rowCount ?? 0,
    });
  } catch (err) {
    console.error('[ghosted-outcomes] DB error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
