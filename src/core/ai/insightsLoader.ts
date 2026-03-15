/**
 * Insights Loader — Этап 1: RAG for Gemini System Prompt
 *
 * Reads active insights from `matching_insights` table and formats
 * them as a bullet-point block for injection into the Gemini prompt.
 *
 * Returns empty string if no insights exist → zero impact on matching.
 */

import { supabase } from '../../../services/supabase';

interface MatchingInsight {
  insight_text: string;
  segment: string;
  correlation: number | null;
  sample_count: number;
}

// Cache: reload every 10 minutes (insights change weekly, not per-request)
let cachedInsights: MatchingInsight[] = [];
let lastFetchedAt = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Load active insights from DB. Cached for 10 minutes.
 */
async function loadInsights(): Promise<MatchingInsight[]> {
  const now = Date.now();
  if (now - lastFetchedAt < CACHE_TTL_MS && cachedInsights.length > 0) {
    return cachedInsights;
  }

  try {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('matching_insights')
      .select('insight_text,segment,correlation,sample_count')
      .eq('active', true)
      .order('sample_count', { ascending: false })
      .limit(10); // Cap: don't overflow context window

    if (error || !data) return cachedInsights;

    cachedInsights = data as MatchingInsight[];
    lastFetchedAt = now;
    return cachedInsights;
  } catch {
    return cachedInsights;
  }
}

/**
 * Format insights as a block for Gemini System Prompt injection.
 *
 * @param segment - Optional segment filter ('infants', 'toddlers', 'all')
 * @returns Formatted string, or empty string if no insights
 */
export async function formatInsightsBlock(segment?: string): Promise<string> {
  const insights = await loadInsights();
  if (insights.length === 0) return '';

  const filtered = segment
    ? insights.filter(i => i.segment === segment || i.segment === 'all')
    : insights;

  if (filtered.length === 0) return '';

  const lines = filtered.map((i) => {
    const confidence = i.sample_count >= 50 ? '(высокая уверенность)' :
                       i.sample_count >= 20 ? '(средняя уверенность)' : '(ранний сигнал)';
    const corr = i.correlation != null ? `, r=${i.correlation.toFixed(2)}` : '';
    return `- ${i.insight_text} ${confidence}${corr}`;
  });

  return `\nLEARNED INSIGHTS FROM PLATFORM DATA (n=${insights.reduce((s, i) => s + i.sample_count, 0)} matches):\n${lines.join('\n')}\n`;
}
