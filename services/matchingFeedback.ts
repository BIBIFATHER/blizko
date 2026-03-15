/**
 * Matching Feedback — RLHF Outcome Recording
 *
 * Records user actions on match results (interested, hired, rejected, ghosted)
 * to `matching_outcomes` table for future weight optimization.
 */

import { supabase } from './supabase';

export type MatchOutcome = 'hired' | 'rejected' | 'ghosted';
export type MatchAction = 'interested' | 'hired' | 'rejected' | 'ghosted';

/**
 * Record a matching outcome when user acts on a match result.
 *
 * Call this when:
 * - User opens chat with a nanny → 'interested'
 * - User books a nanny → 'hired'
 * - User skips/closes a match card → 'rejected'
 * - After 7 days with no action → 'ghosted' (via cron)
 */
export async function recordMatchOutcome(
  parentId: string,
  nannyId: string,
  outcome: MatchAction,
  feedbackText?: string,
  scoreAtMatch?: number,
): Promise<void> {
  if (!supabase || !parentId || !nannyId) return;

  try {
    // Map extended actions to DB enum ('interested' → stored but not in enum, use upsert)
    const dbOutcome: MatchOutcome = outcome === 'interested' ? 'hired' : outcome as MatchOutcome;

    const { error } = await supabase
      .from('matching_outcomes')
      .upsert(
        {
          parent_id: parentId,
          nanny_id: nannyId,
          outcome: dbOutcome,
          feedback_text: feedbackText || null,
          score_at_match: scoreAtMatch || null,
        },
        { onConflict: 'parent_id,nanny_id' }
      );

    if (error) {
      console.warn('[MatchingFeedback] Failed to record outcome:', error.message);
    }
  } catch (e) {
    console.warn('[MatchingFeedback] Error:', e);
  }
}

/**
 * Record micro-survey feedback (first-week check-in).
 * Stores feedback_text for NLP analysis by the insights cron.
 */
export async function recordMicroSurvey(
  parentId: string,
  nannyId: string,
  frictionScore: number,  // 1-5
  alignmentScore: number, // 1-5
  vibeWord: string,       // single word
): Promise<void> {
  if (!supabase || !parentId || !nannyId) return;

  const feedbackText = JSON.stringify({
    type: 'micro_survey',
    week: 1,
    friction: frictionScore,
    alignment: alignmentScore,
    vibe: vibeWord,
    timestamp: Date.now(),
  });

  try {
    await supabase
      .from('matching_outcomes')
      .update({ feedback_text: feedbackText })
      .eq('parent_id', parentId)
      .eq('nanny_id', nannyId);
  } catch (e) {
    console.warn('[MatchingFeedback] Survey error:', e);
  }
}
