import { describe, expect, it, vi } from 'vitest';

// api/data.ts pulls infra deps at import time; stub them so the pure analytics
// property filter can be tested in isolation.
vi.mock('./_cors.js', () => ({ setCors: vi.fn() }));
vi.mock('./_db.js', () => ({ getDbPool: vi.fn() }));
vi.mock('./_auth.js', () => ({
  getServerEnv: () => ({}),
  verifyBearerUser: vi.fn(),
  verifyBearerAdmin: vi.fn(),
}));
vi.mock('./_rate-limit.js', () => ({ rateLimit: () => ({ ok: true }) }));

import { sanitizeAnalyticsPropertiesServer } from './data';

describe('sanitizeAnalyticsPropertiesServer (BLI-110)', () => {
  it('drops PII keys, contact-like values, free-text, objects; keeps safe scalars', () => {
    const out = sanitizeAnalyticsPropertiesServer({
      session_id: 'sess_abc',
      step: 3,
      ok: true,
      nanny_name: 'Екатерина',
      email: 'a@b.ru',
      note: 'ping +7 999 123 45 67',
      passport: '4509123456',
      about: 'z'.repeat(200),
      nested: { a: 1 },
      city: 'Москва',
    });
    expect(out).toEqual({ session_id: 'sess_abc', step: 3, ok: true, city: 'Москва' });
  });
});
