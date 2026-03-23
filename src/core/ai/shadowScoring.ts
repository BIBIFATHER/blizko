/**
 * Shadow Scoring + ε-Greedy — Self-Evolving Matching Этап 0
 *
 * Shadow Mode: Logs heuristic scores + factor breakdowns to matching_outcomes
 * for future RLHF training. Fire-and-forget (does not block match results).
 *
 * ε-Greedy: 10% chance to swap position 3 with a "wildcard" from positions 4-8.
 * Prevents filter bubble. Tracks explore_flag for measurement.
 */

import { supabase } from '@/services/supabase';
import { NannyProfile, ParentRequest } from '@/core/types';

export interface ScoredCandidate {
  nanny: NannyProfile;
  score: number;
  reasons: string[];
  riskFlags: any[];
  factors?: Record<string, number>;
}

/**
 * Log shadow scores to matching_outcomes (fire-and-forget).
 * Records heuristic_score + factor breakdown for top candidates.
 * Does NOT block the matching flow.
 */
export function logShadowScores(
  ranked: ScoredCandidate[],
  requestId?: string,
  parentId?: string,
): void {
  // Fire-and-forget — no await, no blocking
  _logShadowScoresAsync(ranked, requestId, parentId).catch(() => {
    // Silent fail — shadow scoring must never break matching
  });
}

async function _logShadowScoresAsync(
  ranked: ScoredCandidate[],
  requestId?: string,
  parentId?: string,
): Promise<void> {
  if (!supabase || !parentId || ranked.length === 0) return;

  const rows = ranked.slice(0, 10).map((r) => ({
    parent_id: parentId,
    nanny_id: r.nanny.id,
    heuristic_score: r.score,
    factors: r.factors || {},
    weight_snapshot: null, // filled by weight update cron later
    score_at_match: r.score,
    // outcome left NULL — filled when user acts (hired/rejected/ghosted)
  }));

  try {
    // Use upsert with conflict on (parent_id, nanny_id) to avoid duplicates
    // within the same session
    await supabase
      .from('matching_outcomes')
      .upsert(rows, { onConflict: 'parent_id,nanny_id', ignoreDuplicates: true });
  } catch {
    // Silent fail
  }
}

// ε-Greedy configuration
const EPSILON = 0.10; // 10% exploration rate

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
  // Need at least 4 candidates to explore
  if (ranked.length < 4) {
    return { candidates: [...ranked], wildcardId: null };
  }

  const roll = Math.random();
  if (roll >= EPSILON) {
    // Exploit: return as-is
    return { candidates: [...ranked], wildcardId: null };
  }

  // Explore: pick random candidate from positions 3-7 (0-indexed)
  const explorePool = ranked.slice(3, Math.min(8, ranked.length));
  if (explorePool.length === 0) {
    return { candidates: [...ranked], wildcardId: null };
  }

  const wildcardIdx = Math.floor(Math.random() * explorePool.length);
  const wildcard = explorePool[wildcardIdx];
  const result = [...ranked];

  // Swap: move wildcard to position 2 (0-indexed), shift others down
  const originalThird = result[2];
  const wildcardSourceIdx = 3 + wildcardIdx;
  result[2] = wildcard;
  result[wildcardSourceIdx] = originalThird;

  return {
    candidates: result,
    wildcardId: wildcard.nanny.id,
  };
}
