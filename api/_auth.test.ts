import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { verifyBearerUser } from './_auth';

describe('verifyBearerUser', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('returns null when auth prerequisites are missing', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;

    const req = {
      headers: {},
    } as VercelRequest;

    await expect(verifyBearerUser(req)).resolves.toBeNull();
  });

  it('returns null when Supabase rejects the bearer token', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    const req = {
      headers: { authorization: 'Bearer bad-token' },
    } as VercelRequest;

    await expect(verifyBearerUser(req)).resolves.toBeNull();
  });

  it('returns normalized user data when Supabase accepts the token', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'user-123',
          email: 'Anton@Example.com',
        }),
      }),
    );

    const req = {
      headers: { authorization: 'Bearer good-token' },
    } as VercelRequest;

    await expect(verifyBearerUser(req)).resolves.toEqual({
      id: 'user-123',
      email: 'anton@example.com',
    });
  });
});
