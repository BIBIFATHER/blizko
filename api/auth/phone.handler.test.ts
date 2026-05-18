import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const { getServiceSupabase } = vi.hoisted(() => ({
  getServiceSupabase: vi.fn(),
}));

vi.mock('./_supabase.js', () => ({
  getServiceSupabase,
}));

vi.mock('../_cors.js', () => ({
  setCors: vi.fn(),
}));

vi.mock('../_rate-limit.js', () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
}));

vi.mock('../_audit.js', () => ({
  auditLog: vi.fn(),
  maskPhone: vi.fn((phone: string) => phone),
}));

import handler from './phone';
import { createMockResponse } from '../testUtils';

describe('api/auth/phone handler', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    getServiceSupabase.mockReset();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('rejects unknown actions', async () => {
    const req = {
      method: 'POST',
      headers: {},
      query: {},
      body: { action: 'noop' },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ ok: false, error: 'Unknown action' });
  });

  it('rejects invalid phone numbers before accessing OTP storage', async () => {
    getServiceSupabase.mockReturnValue(null);

    const req = {
      method: 'POST',
      headers: {},
      query: {},
      body: { action: 'send', phone: '123' },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ ok: false, error: 'Некорректный номер телефона' });
  });

  it('stores and returns a demo otp when sms provider is not configured', async () => {
    process.env.NODE_ENV = 'development';

    const upsert = vi.fn(async () => ({ error: null }));
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));

    getServiceSupabase.mockReturnValue({
      from: (table: string) => {
        if (table === 'phone_otps') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle,
              }),
            }),
            upsert,
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      },
    });

    const req = {
      method: 'POST',
      headers: {},
      query: {},
      body: { action: 'send', phone: '+7 700 123 45 67' },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      expiresInSec: 300,
      demo: true,
    });
    expect((res.body as { demoCode?: string }).demoCode).toMatch(/^\d{6}$/);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('verifies otp and returns a supabase token for an existing phone user', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    const deleteEq = vi.fn(async () => ({ error: null }));
    const updateEq = vi.fn(async () => ({ error: null }));

    getServiceSupabase.mockReturnValue({
      from: (table: string) => {
        if (table === 'phone_otps') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    phone: '+77001234567',
                    code: '123456',
                    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                    attempts: 0,
                  },
                  error: null,
                }),
              }),
            }),
            delete: () => ({
              eq: deleteEq,
            }),
            update: () => ({
              eq: updateEq,
            }),
          };
        }

        if (table === 'auth_phone_lookup') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { user_id: 'user-1' },
                  error: null,
                }),
              }),
            }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      },
      auth: {
        admin: {
          createUser: vi.fn(),
          listUsers: vi.fn(),
        },
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          action_link: 'https://example.supabase.co/auth/v1/verify?token=magic-token-1',
        }),
      }),
    );

    const req = {
      method: 'POST',
      headers: {},
      query: {},
      body: { action: 'verify', phone: '+7 700 123 45 67', code: '123456' },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      phone: '+77001234567',
      userId: 'user-1',
      supabaseToken: 'magic-token-1',
      tokenType: 'magiclink',
    });
    expect(deleteEq).toHaveBeenCalledWith('phone', '+77001234567');
    expect(updateEq).not.toHaveBeenCalled();
  });
});
