/**
 * Dynamic Matching Weights — Self-Evolving Weight System
 *
 * Starts with current hardcoded values. Reads overrides from
 * `matching_weights` table when available. Falls back to defaults
 * if table is empty or unreachable.
 *
 * Day 1: identical behavior to current static weights.
 * After RLHF data accumulates: weights auto-adjust.
 */

import { supabase } from '@/services/supabase';

export interface MatchingWeights {
  base: number;
  verification: number;
  childAge: number;
  schedule: number;
  requirementMatch: number;   // per requirement
  mirrorMax: number;          // cap for mirror scoring
  softSkillsMax: number;
  qualityPremium: number;
  qualityGood: number;
  nannySharing: number;
  familyStyleMatch: number;
  disciplineMatch: number;
  communicationMatch: number;
  stressResponseMatch: number;
  pcmMatch: number;
  growthPerNeed: number;
  growthMax: number;
}

// Current hardcoded values — extracted from matchingAi.ts rankCandidates()
const DEFAULT_WEIGHTS: MatchingWeights = {
  base: 40,
  verification: 12,
  childAge: 10,
  schedule: 6,
  requirementMatch: 6,
  mirrorMax: 18,
  softSkillsMax: 8,
  qualityPremium: 10,
  qualityGood: 6,
  nannySharing: 8,
  familyStyleMatch: 10,
  disciplineMatch: 6,
  communicationMatch: 6,
  stressResponseMatch: 6,
  pcmMatch: 6,
  growthPerNeed: 6,
  growthMax: 12,
};

// Cache: reload every 5 minutes
let cachedWeights: MatchingWeights = { ...DEFAULT_WEIGHTS };
let lastFetchedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Load weights from DB with caching. Falls back to defaults.
 */
export async function getWeights(): Promise<MatchingWeights> {
  const now = Date.now();
  if (now - lastFetchedAt < CACHE_TTL_MS) return cachedWeights;

  try {
    if (!supabase) return DEFAULT_WEIGHTS;

    const { data, error } = await supabase
      .from('matching_weights')
      .select('factor,weight');

    if (error || !data || data.length === 0) {
      return DEFAULT_WEIGHTS;
    }

    // Overlay DB values onto defaults
    const overrides: Partial<MatchingWeights> = {};
    for (const row of data) {
      if (row.factor in DEFAULT_WEIGHTS) {
        (overrides as any)[row.factor] = row.weight;
      }
    }

    cachedWeights = { ...DEFAULT_WEIGHTS, ...overrides };
    lastFetchedAt = now;
    return cachedWeights;
  } catch {
    return DEFAULT_WEIGHTS;
  }
}

/**
 * Get current weights synchronously (from cache).
 * Use after at least one async getWeights() call.
 */
export function getWeightsSync(): MatchingWeights {
  return cachedWeights;
}

/**
 * Get default weights (for snapshot/comparison).
 */
export function getDefaultWeights(): MatchingWeights {
  return { ...DEFAULT_WEIGHTS };
}
