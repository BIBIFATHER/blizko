import { MatchResult } from '../types';

const MATCH_FOLLOW_UP_KEY = 'blizko_match_follow_up';
const MAX_MATCH_FOLLOW_UP_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type MatchFollowUpStage = 'fresh' | 'engaged';

export interface MatchFollowUpState {
  matchResult: MatchResult;
  viewedAt: number;
  lastActionAt?: number;
  lastOpenedNannyId?: string;
  dismissedAt?: number;
  stage: MatchFollowUpStage;
}

function readState(): MatchFollowUpState | null {
  try {
    const raw = window.localStorage.getItem(MATCH_FOLLOW_UP_KEY);
    return raw ? JSON.parse(raw) as MatchFollowUpState : null;
  } catch {
    return null;
  }
}

function writeState(state: MatchFollowUpState | null): void {
  try {
    if (!state) {
      window.localStorage.removeItem(MATCH_FOLLOW_UP_KEY);
      return;
    }
    window.localStorage.setItem(MATCH_FOLLOW_UP_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function saveMatchFollowUp(matchResult: MatchResult): void {
  if (typeof window === 'undefined' || !matchResult?.candidates?.length) return;

  const existing = readState();
  const sameRequest = existing?.matchResult?.requestId && existing.matchResult.requestId === matchResult.requestId;

  if (sameRequest && existing) {
    writeState({ ...existing, matchResult });
    return;
  }

  writeState({
    matchResult,
    viewedAt: Date.now(),
    stage: 'fresh',
  });
}

export function getPendingMatchFollowUp(): MatchFollowUpState | null {
  if (typeof window === 'undefined') return null;
  const state = readState();
  if (!state) return null;

  if (state.dismissedAt) return null;
  if (Date.now() - state.viewedAt > MAX_MATCH_FOLLOW_UP_AGE_MS) {
    writeState(null);
    return null;
  }

  return state;
}

export function markMatchFollowUpProfileOpened(nannyId: string): void {
  const state = readState();
  if (!state) return;

  writeState({
    ...state,
    stage: 'engaged',
    lastActionAt: Date.now(),
    lastOpenedNannyId: nannyId,
  });
}

export function dismissMatchFollowUp(): void {
  const state = readState();
  if (!state) return;
  writeState({ ...state, dismissedAt: Date.now() });
}
