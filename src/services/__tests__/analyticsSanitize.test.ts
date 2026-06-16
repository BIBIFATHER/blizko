import { describe, expect, it } from 'vitest';
import { sanitizeEventProperties, ANALYTICS_EVENT_PROPERTIES } from '@/services/analyticsSchema';

describe('sanitizeEventProperties (BLI-116 per-event allowlist)', () => {
  it('keeps only allowlisted scalar keys for the event', () => {
    const out = sanitizeEventProperties('form_step_completed', {
      form_type: 'nanny',
      step: 3,
      step_name: 'verification',
      session_id: 'sess_abc123',
    });
    expect(out).toEqual({
      form_type: 'nanny',
      step: 3,
      step_name: 'verification',
      session_id: 'sess_abc123',
    });
  });

  it('drops keys that are not in the event allowlist (even benign free-text)', () => {
    const out = sanitizeEventProperties('cta_clicked', {
      button: 'find_nanny',
      location: 'hero',
      note: 'Екатерина Смирнова',
      city: 'Москва',
    });
    expect(out).toEqual({ button: 'find_nanny', location: 'hero' });
  });

  it('drops everything for an unknown event', () => {
    const out = sanitizeEventProperties('definitely_not_an_event', {
      session_id: 'sess_abc',
      page: 'home',
    });
    expect(out).toEqual({});
  });

  it('keeps a whole-UUID correlation id under an allowed event', () => {
    const out = sanitizeEventProperties('match_outcome_recorded', {
      outcome: 'hired',
      parent_id: '550e8400-e29b-41d4-a716-446655440000',
      nanny_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      score_at_match: 91,
    });
    expect(out).toEqual({
      outcome: 'hired',
      parent_id: '550e8400-e29b-41d4-a716-446655440000',
      nanny_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      score_at_match: 91,
    });
  });

  it('drops a correlation value that only contains a UUID plus PII', () => {
    const out = sanitizeEventProperties('booking_created', {
      parent_id: '550e8400-e29b-41d4-a716-446655440000 elena@example.ru',
      nanny_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    });
    expect(out).toEqual({ nanny_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7' });
  });

  it('keeps a generated UUID-shaped session_id (no regression)', () => {
    const out = sanitizeEventProperties('page_view', {
      page: 'home',
      session_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(out).toEqual({
      page: 'home',
      session_id: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('drops objects, arrays and oversized free-text under allowed keys', () => {
    const out = sanitizeEventProperties('cta_clicked', {
      button: 'x'.repeat(200),
      location: 'hero',
    });
    expect(out).toEqual({ location: 'hero' });
  });

  it('returns an empty object for non-object input', () => {
    expect(sanitizeEventProperties('page_view', undefined)).toEqual({});
  });

  it('every declared event lists only string keys (schema sanity)', () => {
    for (const [event, keys] of Object.entries(ANALYTICS_EVENT_PROPERTIES)) {
      expect(Array.isArray(keys), `${event} keys must be an array`).toBe(true);
      for (const k of keys) expect(typeof k).toBe('string');
    }
  });
});
