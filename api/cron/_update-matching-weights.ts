/**
 * Matching Weights Update Cron — RLHF Этап 1
 *
 * Reads matching_outcomes (factor breakdowns + outcomes) and nudges
 * matching_weights toward factors that correlate with positive outcomes
 * (hired) vs negative (rejected / ghosted).
 *
 * Guard: skips if total labelled rows < MIN_SIGNALS.
 * Shrinkage: alpha = N / (N + PRIOR_STRENGTH) — limits drift from prior.
 * Clamp: new weight stays within [prior * 0.5, prior * 2.0].
 *
 * Run weekly via Vercel Cron (vercel.json). Requires CRON_SECRET.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from '../_db.js';

const MIN_SIGNALS = 50;
const PRIOR_STRENGTH = 200; // sample count at which alpha = 0.5
const MAX_DRIFT = 0.3; // max ±30% multiplier on prior per run

// Outcome classes for weight learning. Every value MUST be a valid
// `matching_outcome_type` enum label — comparing the enum column to a non-member
// literal (the old 'interested') makes Postgres coerce it to the enum and reject
// the whole query (BLI-100). Interest is recorded as outcome = NULL +
// feedback_text interest_signal and is intentionally NOT counted here; weighting
// interest as a weak-positive signal is tracked as a separate follow-up.
export const POSITIVE_OUTCOMES = ['hired'] as const;
export const NEGATIVE_OUTCOMES = ['rejected', 'ghosted'] as const;
export const LABELLED_OUTCOMES = [...POSITIVE_OUTCOMES, ...NEGATIVE_OUTCOMES] as const;

// Values are fixed internal constants (no user input) → safe to inline.
const sqlInList = (values: readonly string[]) => values.map((v) => `'${v}'`).join(', ');

export const COUNT_LABELLED_SQL = `SELECT COUNT(*) AS n FROM matching_outcomes
       WHERE outcome IN (${sqlInList(LABELLED_OUTCOMES)})`;

export const FACTOR_STATS_SQL = `
      SELECT
        kv.key AS factor,
        AVG(CASE WHEN o.outcome IN (${sqlInList(POSITIVE_OUTCOMES)}) THEN (kv.value)::float END) AS pos_mean,
        AVG(CASE WHEN o.outcome IN (${sqlInList(NEGATIVE_OUTCOMES)}) THEN (kv.value)::float END) AS neg_mean,
        COUNT(*)::text AS sample_count
      FROM matching_outcomes o,
           jsonb_each_text(o.factors) kv
      WHERE o.outcome IN (${sqlInList(LABELLED_OUTCOMES)})
        AND o.factors IS NOT NULL
      GROUP BY kv.key
      HAVING COUNT(*) >= 10
    `;

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

    // Count labelled signals
    const countResult = await pool.query<{ n: string }>(COUNT_LABELLED_SQL);
    const totalSignals = parseInt(countResult.rows[0]?.n ?? '0', 10);

    if (totalSignals < MIN_SIGNALS) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: `only ${totalSignals} signals, need ${MIN_SIGNALS}`,
      });
    }

    // Per-factor mean for positive vs negative outcomes
    const statsResult = await pool.query<{
      factor: string;
      pos_mean: string | null;
      neg_mean: string | null;
      sample_count: string;
    }>(FACTOR_STATS_SQL);

    // Fetch current priors
    const priorsResult = await pool.query<{ factor: string; prior_weight: number }>(
      `SELECT factor, prior_weight FROM matching_weights`,
    );
    const priors: Record<string, number> = {};
    for (const row of priorsResult.rows) {
      priors[row.factor] = row.prior_weight;
    }

    const updates: Array<{
      factor: string;
      weight: number;
      confidence: number;
      sample_count: number;
    }> = [];

    for (const row of statsResult.rows) {
      const prior = priors[row.factor];
      if (prior == null) continue; // unknown factor — skip

      const posMean = parseFloat(row.pos_mean ?? '0');
      const negMean = parseFloat(row.neg_mean ?? '0');
      const n = parseInt(row.sample_count, 10);

      // No meaningful signal if both sides are zero
      if (posMean + negMean < 0.001) continue;

      // signal_ratio: 0.5 = neutral, >0.5 = positive outcomes score higher on this factor
      const signalRatio = posMean / (posMean + negMean);

      // alpha shrinks toward 0 when sample count is low
      const alpha = Math.min(n / (n + PRIOR_STRENGTH), 0.5);

      // multiplier: 1.0 ± MAX_DRIFT based on signal
      const multiplier = 1.0 + (signalRatio - 0.5) * 2 * MAX_DRIFT;

      const rawWeight = prior * (1 - alpha) + prior * multiplier * alpha;

      // Clamp to [prior * 0.5, prior * 2.0]
      const newWeight = Math.max(prior * 0.5, Math.min(prior * 2.0, rawWeight));

      // Confidence: fraction of variance explained (simplified)
      const confidence = Math.min(alpha * Math.abs(signalRatio - 0.5) * 4, 1.0);

      updates.push({ factor: row.factor, weight: newWeight, confidence, sample_count: n });
    }

    if (updates.length === 0) {
      return res
        .status(200)
        .json({ ok: true, skipped: true, reason: 'no factor updates computed' });
    }

    // Upsert updated weights
    for (const u of updates) {
      await pool.query(
        `UPDATE matching_weights
         SET weight       = $1,
             confidence   = $2,
             sample_count = $3,
             updated_at   = NOW()
         WHERE factor = $4`,
        [u.weight, u.confidence, u.sample_count, u.factor],
      );
    }

    return res.status(200).json({
      ok: true,
      total_signals: totalSignals,
      factors_updated: updates.length,
      updates: updates.map((u) => ({
        factor: u.factor,
        prior: priors[u.factor],
        new_weight: Math.round(u.weight * 100) / 100,
        confidence: Math.round(u.confidence * 100) / 100,
        sample_count: u.sample_count,
      })),
    });
  } catch (err) {
    console.error('[update-matching-weights] DB error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
