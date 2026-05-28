import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * BLI-59: a final match outcome must emit `match_outcome_recorded` so the pilot
 * learning loop (matching_outcomes + update-matching-weights) can be measured —
 * but only when the row actually persisted, and never for an interim interest
 * signal. Pin both the emission and the "no false signal" guards.
 */

const mockUpsert = vi.fn();

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: () => ({ upsert: mockUpsert }),
  },
}));

vi.mock('@/services/analytics', () => ({
  trackMatchOutcomeRecorded: vi.fn(),
}));

import { recordMatchOutcome } from '@/services/matchingFeedback';
import { trackMatchOutcomeRecorded } from '@/services/analytics';

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsert.mockResolvedValue({ error: null });
});

describe('recordMatchOutcome — match_outcome_recorded emission (BLI-59)', () => {
  it('emits match_outcome_recorded after a successful final outcome', async () => {
    await recordMatchOutcome('p1', 'n1', 'hired', undefined, 0.82);
    expect(trackMatchOutcomeRecorded).toHaveBeenCalledWith('hired', 'p1', 'n1', 0.82);
  });

  it('does NOT emit for an interim interest signal', async () => {
    await recordMatchOutcome('p1', 'n1', 'interested');
    expect(trackMatchOutcomeRecorded).not.toHaveBeenCalled();
  });

  it('does NOT emit when the upsert fails (no false analytics signal)', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'RLS denied' } });
    await recordMatchOutcome('p1', 'n1', 'rejected');
    expect(trackMatchOutcomeRecorded).not.toHaveBeenCalled();
  });
});
