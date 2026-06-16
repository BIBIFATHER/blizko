import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

vi.mock('./_cors.js', () => ({
  setCors: vi.fn(),
}));

vi.mock('./_rate-limit.js', () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
}));

import handler from './ai-support';
import { createMockResponse } from './_testUtils';

describe('api/ai-support jurisdiction egress guard', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BLIZKO_SYNTHETIC_ONLY: 'false',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      GEMINI_API_KEY: 'gemini-key',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('blocks external AI after auth but before Gemini/context fetches when jurisdiction is UNKNOWN', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === 'https://example.supabase.co/auth/v1/user') {
        return {
          ok: true,
          json: async () => ({ id: 'user-1', email: 'real.user@example.com' }),
        };
      }

      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token' },
      body: { ticketId: 'test', message: 'This may contain personal data' },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'External AI on personal data is blocked by jurisdiction policy.',
      jurisdiction: 'UNKNOWN',
      reason: 'no_verified_country_signals',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
