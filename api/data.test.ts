import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const poolQuery = vi.fn();

vi.mock('./_cors.js', () => ({
  setCors: vi.fn(),
}));

vi.mock('./_rate-limit.js', () => ({
  rateLimit: vi.fn(() => ({ ok: true })),
}));

vi.mock('./_auth.js', () => ({
  getServerEnv: vi.fn(() => ({
    supabaseUrl: 'https://example.supabase.co',
    supabaseServiceRoleKey: 'service-role-key',
    supabaseAnonKey: 'anon-key',
  })),
  verifyBearerAdmin: vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.com' })),
  verifyBearerUser: vi.fn(async () => ({ id: 'user-1', email: 'user@example.com' })),
}));

vi.mock('./_db.js', () => ({
  getDbPool: vi.fn(() => ({
    query: poolQuery,
  })),
}));

import handler from './data';
import { createMockResponse } from './testUtils';

describe('api/data handler', () => {
  beforeEach(() => {
    poolQuery.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects destructive delete without explicit confirmation', async () => {
    const req = {
      method: 'DELETE',
      headers: {},
      query: { resource: 'parents' },
      body: {},
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Destructive delete requires explicit confirmation',
      hint: 'Pass ?confirm=DELETE or use testOnly=1',
    });
  });

  it('rejects parent writes that do not include an owner user id', async () => {
    const req = {
      method: 'POST',
      headers: {},
      query: { resource: 'parents' },
      body: {
        item: {
          id: 'parent-1',
          city: 'Almaty',
        },
      },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: 'Missing parents owner user_id',
    });
  });

  it('rejects invalid analytics records before touching storage', async () => {
    const req = {
      method: 'POST',
      headers: {},
      query: { resource: 'analytics' },
      body: {
        record: {
          event: 'unknown_event',
          properties: {},
        },
      },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid analytics record' });
    expect(poolQuery).not.toHaveBeenCalled();
  });

  it('persists valid analytics records through postgres when available', async () => {
    poolQuery.mockResolvedValue({ rows: [] });

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer user-token' },
      query: { resource: 'analytics' },
      body: {
        record: {
          id: 'evt-1',
          event: 'page_view',
          properties: { session_id: 'session-1' },
          timestamp: '2026-04-07T10:00:00.000Z',
          url: 'https://blizko.app/',
        },
      },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ ok: true, source: 'postgres' });
    expect(poolQuery).toHaveBeenCalledTimes(1);
  });

  it('persists parent records through supabase rest when owner user_id is present', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: 'parent-1',
            payload: {
              id: 'parent-1',
              city: 'Almaty',
              user_id: 'user-1',
              createdAt: 1_700_000_000_000,
            },
            created_at: '2026-04-08T00:00:00.000Z',
          },
        ],
      }),
    );

    const req = {
      method: 'POST',
      headers: {},
      query: { resource: 'parents' },
      body: {
        item: {
          id: 'parent-1',
          city: 'Almaty',
          user_id: 'user-1',
        },
      },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      item: {
        id: 'parent-1',
        city: 'Almaty',
        user_id: 'user-1',
        createdAt: 1_700_000_000_000,
      },
    });
  });
});
