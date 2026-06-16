import { describe, expect, it } from 'vitest';
import { sanitizeAnalyticsProperties } from '@/services/analytics';

describe('sanitizeAnalyticsProperties (BLI-110)', () => {
  it('keeps short scalar values (enums, numbers, booleans)', () => {
    const out = sanitizeAnalyticsProperties({
      owner: 'nanny',
      step: 3,
      score: 87,
      ok: true,
      session_id: 'sess_abc123',
    });
    expect(out).toEqual({
      owner: 'nanny',
      step: 3,
      score: 87,
      ok: true,
      session_id: 'sess_abc123',
    });
  });

  it('drops identifying keys regardless of value', () => {
    const out = sanitizeAnalyticsProperties({
      nanny_name: 'Екатерина Смирнова',
      name: 'Анна',
      email: 'a@b.ru',
      phone: '+7 999 123 45 67',
      position: 2,
    });
    expect(out).toEqual({ position: 2 });
  });

  it('drops contact-like values even under benign keys', () => {
    const out = sanitizeAnalyticsProperties({
      note: 'reach me at elena@example.ru',
      ref: 'call +7 999 123 45 67',
      passport: '4509123456',
      city: 'Москва',
    });
    expect(out).toEqual({ city: 'Москва' });
  });

  it('drops free-text (oversized strings), objects and arrays', () => {
    const out = sanitizeAnalyticsProperties({
      about: 'x'.repeat(200),
      story: 'y'.repeat(130),
      nested: { a: 1 },
      list: [1, 2, 3],
      tag: 'calm',
    });
    expect(out).toEqual({ tag: 'calm' });
  });

  it('drops opaque identifiers (UUID, user_id) under ordinary keys', () => {
    const out = sanitizeAnalyticsProperties({
      ref: '550e8400-e29b-41d4-a716-446655440000',
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      stage: 'fresh',
    });
    expect(out).toEqual({ stage: 'fresh' });
  });

  it('keeps server-issued correlation ids under trusted keys', () => {
    const out = sanitizeAnalyticsProperties({
      parent_id: '550e8400-e29b-41d4-a716-446655440000',
      nanny_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      score: 91,
    });
    expect(out).toEqual({
      parent_id: '550e8400-e29b-41d4-a716-446655440000',
      nanny_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      score: 91,
    });
  });

  it('still drops contact-like values even under a correlation key', () => {
    const out = sanitizeAnalyticsProperties({
      parent_id: 'elena@example.ru',
      nanny_id: '+7 999 123 45 67',
    });
    expect(out).toEqual({});
  });

  it('drops a correlation value that merely contains a UUID plus PII', () => {
    const out = sanitizeAnalyticsProperties({
      parent_id: '550e8400-e29b-41d4-a716-446655440000 elena@example.ru',
      nanny_id: '550e8400-e29b-41d4-a716-446655440000 extra',
    });
    expect(out).toEqual({});
  });

  it('keeps a generated UUID-shaped session_id (no regression)', () => {
    const out = sanitizeAnalyticsProperties({
      session_id: '550e8400-e29b-41d4-a716-446655440000',
      page: 'home',
    });
    expect(out).toEqual({
      session_id: '550e8400-e29b-41d4-a716-446655440000',
      page: 'home',
    });
  });

  it('returns an empty object for non-object input', () => {
    expect(sanitizeAnalyticsProperties(undefined)).toEqual({});
  });
});
