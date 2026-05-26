import { Language, NannyProfile, SubmissionResult } from '../types';
import { getWeights, type MatchingWeights } from './matchingWeights';
import { logShadowScores, applyEpsilonGreedy, type ScoredCandidate } from './shadowScoring';
import { rankCandidates } from './matchingAiRanking';
import { buildMatchResult, buildHeuristicFallback } from './matchingAiResult';
import { getAiMatchSummary } from './matchingAiPrompt';
import type { MatchingRequest } from './matchingAi.types';

export const findBestMatch = async (
  request: MatchingRequest,
  candidates: NannyProfile[],
  lang: Language,
  parentId?: string,
): Promise<SubmissionResult> => {
  const w = await getWeights();
  const ranked = rankCandidates(request, candidates, w as MatchingWeights);

  // Apply ε-greedy first, then log the post-greedy order as display_position.
  // wildcardId is passed into logShadowScores so explore_flag is set atomically
  // in the same upsert row — no separate UPDATE, no race condition.
  const { candidates: greedyRanked, wildcardId } = applyEpsilonGreedy(ranked);
  logShadowScores(greedyRanked.slice(0, 10) as ScoredCandidate[], undefined, parentId, wildcardId);

  const heuristicFallback = buildHeuristicFallback(greedyRanked, lang);
  const matchResult = await buildMatchResult(greedyRanked, request, lang);
  const aiSummary = await getAiMatchSummary(request, greedyRanked, lang, heuristicFallback);

  return {
    matchScore: aiSummary.matchScore,
    recommendations: aiSummary.recommendations,
    matchResult,
  };
};
