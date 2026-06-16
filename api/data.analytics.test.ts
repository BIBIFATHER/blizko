import { describe, expect, it } from 'vitest';
// Server ingest shares the SAME analytics schema module as the client tracker
// (single source of truth). This proves the shared module is importable from the
// api/ side and enforces the per-event allowlist identically.
import { sanitizeEventProperties } from '../src/services/analyticsSchema';

describe('analytics schema — server side (BLI-116)', () => {
  it('keeps only the per-event allowlist; drops PII / free-text / opaque ids / objects', () => {
    const out = sanitizeEventProperties('match_outcome_recorded', {
      session_id: 'b3f1c2d4-5e6a-47b8-9c0d-1e2f3a4b5c6d',
      outcome: 'hired',
      parent_id: '550e8400-e29b-41d4-a716-446655440000',
      nanny_name: 'Екатерина',
      note: 'ping +7 999 123 45 67',
      passport: '4509123456',
      ref: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      nested: { a: 1 },
      city: 'Москва',
    });
    expect(out).toEqual({
      session_id: 'b3f1c2d4-5e6a-47b8-9c0d-1e2f3a4b5c6d',
      outcome: 'hired',
      parent_id: '550e8400-e29b-41d4-a716-446655440000',
    });
  });
});
