import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { MatchResult, Language } from '@/core/types';
import { getItem, setItem } from '@/core/platform/storage';

const CACHE_KEY = 'blizko_last_match_result';

interface MatchResultsLocationState {
  matchResult?: MatchResult;
}

interface UseMatchResultsReturn {
  data: MatchResult | null;
  loading: boolean;
  error: boolean;
}

/**
 * Resolves match results with priority:
 * 1. location.state (from matching flow navigation)
 * 2. localStorage cache (page refresh resilience)
 * 3. null (empty state)
 */
export function useMatchResults(_lang: Language): UseMatchResultsReturn {
  const location = useLocation() as ReturnType<typeof useLocation> & {
    state: MatchResultsLocationState | null;
  };

  const stateResult = location.state?.matchResult ?? null;

  const data = useMemo<MatchResult | null>(() => {
    // Priority 1: navigation state from matching flow
    if (stateResult) {
      // Cache for page-refresh resilience
      try { setItem(CACHE_KEY, JSON.stringify(stateResult)); } catch { /* quota */ }
      return stateResult;
    }

    // Priority 2: localStorage cache
    try {
      const cached = getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as MatchResult;
        if (parsed?.candidates?.length) return parsed;
      }
    } catch {
      // corrupt cache — ignore
    }

    return null;
  }, [stateResult]);

  return { data, loading: false, error: false };
}
