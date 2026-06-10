import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Capture upsert calls and control the returned error.
type UpsertRow = Record<string, unknown>;
const upsert = vi.fn(
  (_rows: UpsertRow[], _options: { onConflict: string }): Promise<{ error: unknown }> =>
    Promise.resolve({ error: null }),
);
const from = vi.fn(() => ({ upsert }));

vi.mock('@/services/supabase', () => ({
  get supabase() {
    return { from };
  },
}));

import { applyEpsilonGreedy, logShadowScores, type ScoredCandidate } from './shadowScoring';

function candidate(id: string, score: number, factors?: Record<string, number>): ScoredCandidate {
  return {
    nanny: { id } as ScoredCandidate['nanny'],
    score,
    reasons: [],
    riskFlags: [],
    factors,
  };
}

// logShadowScores is fire-and-forget; let its internal promise settle.
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('logShadowScores', () => {
  beforeEach(() => {
    upsert.mockReset();
    upsert.mockResolvedValue({ error: null });
    from.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('upserts rows with the shadow-scoring columns and conflict target', async () => {
    logShadowScores(
      [candidate('n1', 0.9, { geo: 1 }), candidate('n2', 0.5)],
      'req-1',
      'parent-1',
      null,
    );
    await flush();

    expect(from).toHaveBeenCalledWith('matching_outcomes');
    expect(upsert).toHaveBeenCalledTimes(1);

    const [rows, options] = upsert.mock.calls[0]!;
    expect(options).toEqual({ onConflict: 'parent_id,nanny_id' });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      parent_id: 'parent-1',
      nanny_id: 'n1',
      heuristic_score: 0.9,
      factors: { geo: 1 },
      weight_snapshot: null,
      score_at_match: 0.9,
      display_position: 1,
      explore_flag: false,
    });
    // outcome is intentionally absent so the UPDATE branch never overwrites it.
    expect('outcome' in rows[0]).toBe(false);
    // factors defaults to {} when the candidate has none.
    expect(rows[1].factors).toEqual({});
  });

  it('sets explore_flag only for the wildcard nanny', async () => {
    logShadowScores(
      [candidate('n1', 0.9), candidate('n2', 0.5), candidate('n3', 0.4)],
      'req-2',
      'parent-2',
      'n3',
    );
    await flush();

    const [rows] = upsert.mock.calls[0]!;
    const byId = Object.fromEntries(rows.map((r) => [r.nanny_id as string, r]));
    expect(byId.n3.explore_flag).toBe(true);
    expect(byId.n1.explore_flag).toBe(false);
    expect(byId.n2.explore_flag).toBe(false);
  });

  it('logs the PostgREST error instead of swallowing it silently', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    upsert.mockResolvedValue({ error: { message: 'column "factors" does not exist' } });

    logShadowScores([candidate('n1', 0.9)], 'req-3', 'parent-3', null);
    await flush();

    expect(errSpy).toHaveBeenCalledWith(
      '[shadowScoring] matching_outcomes upsert error:',
      expect.objectContaining({ message: 'column "factors" does not exist' }),
    );
  });

  it('does nothing when parentId is missing', async () => {
    logShadowScores([candidate('n1', 0.9)], 'req-4', undefined, null);
    await flush();
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('applyEpsilonGreedy', () => {
  afterEach(() => vi.restoreAllMocks());

  it('never touches the top 2 and returns no wildcard below 4 candidates', () => {
    const ranked = [
      { score: 9, nanny: { id: 'a' } },
      { score: 8, nanny: { id: 'b' } },
      { score: 7, nanny: { id: 'c' } },
    ];
    const { candidates, wildcardId } = applyEpsilonGreedy(ranked);
    expect(wildcardId).toBeNull();
    expect(candidates.map((c) => c.nanny.id)).toEqual(['a', 'b', 'c']);
  });

  it('promotes a wildcard into position 3 when the ε roll hits', () => {
    // roll < EPSILON triggers exploration; pick first of the explore pool.
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0);
    const ranked = [
      { score: 9, nanny: { id: 'a' } },
      { score: 8, nanny: { id: 'b' } },
      { score: 7, nanny: { id: 'c' } },
      { score: 6, nanny: { id: 'd' } },
      { score: 5, nanny: { id: 'e' } },
    ];
    const { candidates, wildcardId } = applyEpsilonGreedy(ranked);
    expect(wildcardId).toBe('d');
    expect(candidates[2].nanny.id).toBe('d');
    expect(candidates[3].nanny.id).toBe('c');
    // positions 1-2 untouched
    expect(candidates[0].nanny.id).toBe('a');
    expect(candidates[1].nanny.id).toBe('b');
  });
});
