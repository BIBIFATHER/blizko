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

  it('returns an empty object for non-object input', () => {
    expect(sanitizeAnalyticsProperties(undefined)).toEqual({});
  });
});
