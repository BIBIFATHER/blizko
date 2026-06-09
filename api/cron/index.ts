/**
 * Cron router — single Vercel function dispatching to the individual cron jobs
 * by `?job=` query param.
 *
 * Folded into one function to stay within the Hobby plan's 12 serverless-function
 * limit (the two jobs live as `_`-prefixed helpers so Vercel does not build them
 * as separate functions). Each job keeps its own CRON_SECRET auth check.
 *
 * Schedules in vercel.json:
 *   /api/cron?job=ghosted-outcomes        (daily)
 *   /api/cron?job=update-matching-weights (weekly)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import ghostedOutcomes from './_ghosted-outcomes.js';
import updateMatchingWeights from './_update-matching-weights.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const job = Array.isArray(req.query.job) ? req.query.job[0] : req.query.job;

  switch (job) {
    case 'ghosted-outcomes':
      return ghostedOutcomes(req, res);
    case 'update-matching-weights':
      return updateMatchingWeights(req, res);
    default:
      return res.status(400).json({ error: 'Unknown cron job', job: job ?? null });
  }
}
