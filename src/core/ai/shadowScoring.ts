/**
 * Shadow Scoring + ε-Greedy — Self-Evolving Matching Этап 0
 *
 * Shadow Mode: Logs heuristic scores + factor breakdowns to matching_outcomes
 * for future RLHF training. Fire-and-forget (does not block match results).
 *
 * ε-Greedy: 10% chance to swap position 3 with a "wildcard" from positions 4-8.
 * Prevents filter bubble. Tracks explore_flag for measurement.
 *
 * Design note: explore_flag and display_position are written in the same upsert
 * as the shadow score row to avoid a race condition where logWildcardFlag() could
 * execute before the INSERT completed.
 */

import { supabase } from '@/services/supabase';
import { NannyProfile } from '@/core/types';
import type { RiskFlag } from './riskEngine';

export interface ScoredCandidate {
  nanny: NannyProfile;
  score: number;
  reasons: string[];
  riskFlags: RiskFlag[];
  factors?: Record<string, number>;
}

/**
 * Log shadow scores to matching_outcomes (fire-and-forget).
 * Call AFTER applyEpsilonGreedy so display_position reflects what the user saw.
 * Pass wildcardId so explore_flag is set atomically in the same upsert.
 */
export function logShadowScores(
  ranked: ScoredCandidate[],
  requestId?: string,
  parentId?: string,
  wildcardId?: string | null,
): void {
  _logShadowScoresAsync(ranked, requestId, parentId, wildcardId).catch(() => {
    // Silent fail — shadow scoring must never break matching
  });
}

async function _logShadowScoresAsync(
  ranked: ScoredCandidate[],
  _requestId?: string,
  parentId?: string,
  wildcardId?: string | null,
): Promise<void> {
  if (!supabase || !parentId || ranked.length === 0) return;

  const rows = ranked.slice(0, 10).map((r, index) => ({
    parent_id: parentId,
    nanny_id: r.nanny.id,
    heuristic_score: r.score,
    factors: r.factors || {},
    weight_snapshot: null, // filled by weight update cron later
    score_at_match: r.score,
    display_position: index + 1,
    explore_flag: wildcardId != null && r.nanny.id === wildcardId,
    // outcome left NULL — filled when user acts (hired/rejected/ghosted)
  }));

  try {
    // No ignoreDuplicates — re-impressions of the same nanny by the same parent
    // update display_position, explore_flag, score_at_match to reflect the latest
    // context before the outcome decision. outcome is absent from the row object
    // so Supabase never overwrites it in the UPDATE SET.
    await supabase.from('matching_outcomes').upsert(rows, { onConflict: 'parent_id,nanny_id' });
  } catch {
    // Silent fail
  }
}

// ε-Greedy configuration
const EPSILON = 0.1; // 10% exploration rate

/**
 * Apply ε-greedy exploration to ranked candidates.
 * With probability ε, swaps position 3 with a random candidate from positions 4-8.
 * Positions 1-2 are NEVER touched — user always gets their best 2 matches.
 *
 * Returns a new array (does not mutate input).
 */
export function applyEpsilonGreedy<T extends { score: number; nanny: { id: string } }>(
  ranked: T[],
): { candidates: T[]; wildcardId: string | null } {
  if (ranked.length < 4) {
    return { candidates: [...ranked], wildcardId: null };
  }

  const roll = Math.random();
  if (roll >= EPSILON) {
    return { candidates: [...ranked], wildcardId: null };
  }

  const explorePool = ranked.slice(3, Math.min(8, ranked.length));
  if (explorePool.length === 0) {
    return { candidates: [...ranked], wildcardId: null };
  }

  const wildcardIdx = Math.floor(Math.random() * explorePool.length);
  const wildcard = explorePool[wildcardIdx];
  const result = [...ranked];

  const originalThird = result[2];
  const wildcardSourceIdx = 3 + wildcardIdx;
  result[2] = wildcard;
  result[wildcardSourceIdx] = originalThird;

  return {
    candidates: result,
    wildcardId: wildcard.nanny.id,
  };
}
