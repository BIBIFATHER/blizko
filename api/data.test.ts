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
import { createMockResponse } from './_testUtils';

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

  it('admin PATCH updates parent payload with audit change log and service-role auth', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'parent-1',
            user_id: 'family-1',
            payload: {
              id: 'parent-1',
              type: 'parent',
              status: 'rejected',
              city: 'Москва',
              rejectionInfo: {
                reasonCode: 'profile_incomplete',
                reasonText: 'Нужно дополнить анкету',
                rejectedAt: 1_700_000_000_000,
                rejectedBy: 'admin',
              },
              changeLog: [
                {
                  at: 1_700_000_000_000,
                  type: 'status_changed',
                  by: 'admin',
                  note: 'Отклонено',
                },
              ],
              createdAt: 1_700_000_000_000,
            },
            created_at: '2026-04-08T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'parent-1',
            user_id: 'family-1',
            payload: {
              id: 'parent-1',
              type: 'parent',
              status: 'in_review',
              city: 'Москва',
              rejectionInfo: undefined,
              changeLog: [
                {
                  at: 1_700_000_000_000,
                  type: 'status_changed',
                  by: 'admin',
                  note: 'Отклонено',
                },
                {
                  at: 1_700_000_100_000,
                  type: 'status_changed',
                  by: 'admin',
                  note: 'Админ изменил статус на: in_review',
                },
              ],
              createdAt: 1_700_000_000_000,
              updatedAt: 1_700_000_100_000,
            },
            created_at: '2026-04-08T00:00:00.000Z',
          },
        ],
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_100_000);

    const req = {
      method: 'PATCH',
      headers: { authorization: 'Bearer admin-token' },
      query: { resource: 'parents' },
      body: {
        id: 'parent-1',
        changes: { status: 'in_review' },
        note: 'Админ изменил статус на: in_review',
      },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    const body = res.body as { item: any };
    expect(res.statusCode).toBe(200);
    expect(body.item).toMatchObject({
      id: 'parent-1',
      status: 'in_review',
      updatedAt: 1_700_000_100_000,
    });
    expect(body.item.rejectionInfo).toBeUndefined();
    expect(body.item.changeLog.at(-1)).toEqual({
      at: 1_700_000_100_000,
      type: 'status_changed',
      by: 'admin',
      note: 'Админ изменил статус на: in_review',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://example.supabase.co/rest/v1/parents?id=eq.parent-1&select=id,user_id,payload,created_at&limit=1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          apikey: 'service-role-key',
          Authorization: 'Bearer service-role-key',
        }),
      }),
    );

    const patchInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://example.supabase.co/rest/v1/parents?id=eq.parent-1',
    );
    expect(patchInit).toEqual(
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          apikey: 'service-role-key',
          Authorization: 'Bearer service-role-key',
          Prefer: 'return=representation',
        }),
      }),
    );
    expect(JSON.parse(String(patchInit.body))).toMatchObject({
      user_id: 'family-1',
      payload: {
        id: 'parent-1',
        status: 'in_review',
        updatedAt: 1_700_000_100_000,
      },
    });
    expect(JSON.parse(String(patchInit.body)).payload.rejectionInfo).toBeUndefined();
  });

  it('admin-actions POST writes admin id and metadata through service-role auth', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'action-1',
          action: 'parent_status_change',
          admin_id: 'admin-1',
          meta: { parentId: 'parent-1', status: 'approved' },
          created_at: '2026-04-08T10:00:00.000Z',
        },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer admin-token' },
      query: { resource: 'admin-actions' },
      body: {
        action: 'parent_status_change',
        meta: { parentId: 'parent-1', status: 'approved' },
      },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    const body = res.body as { item: any };
    expect(res.statusCode).toBe(201);
    expect(body.item).toEqual({
      id: 'action-1',
      action: 'parent_status_change',
      adminId: 'admin-1',
      meta: { parentId: 'parent-1', status: 'approved' },
      at: new Date('2026-04-08T10:00:00.000Z').getTime(),
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://example.supabase.co/rest/v1/admin_actions');
    expect(init).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'service-role-key',
          Authorization: 'Bearer service-role-key',
          Prefer: 'return=representation',
        }),
      }),
    );
    expect(JSON.parse(String(init.body))).toEqual([
      {
        admin_id: 'admin-1',
        action: 'parent_status_change',
        meta: { parentId: 'parent-1', status: 'approved' },
      },
    ]);
  });
});
