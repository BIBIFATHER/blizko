import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const connect = vi.fn();
const poolQuery = vi.fn(async () => ({ rows: [], rowCount: 0 }));

vi.mock('../_cors.js', () => ({ setCors: vi.fn() }));
vi.mock('../_rate-limit.js', () => ({ rateLimit: vi.fn(() => ({ ok: true })) }));
vi.mock('../_auth.js', () => ({
  verifyBearerUser: vi.fn(async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'u@example.test',
  })),
}));
vi.mock('../_logScrub.js', () => ({ logError: vi.fn(), logWarn: vi.fn() }));
vi.mock('../_db.js', () => ({
  getDbPool: vi.fn(() => ({ connect, query: poolQuery })),
}));

import handler from './delete-account';
import { createMockResponse } from '../_testUtils';

function mockClient(steps: Record<string, unknown>) {
  const query = vi.fn(async (sql: string) => {
    const key = Object.keys(steps).find((candidate) => sql.includes(candidate));
    const value = key ? steps[key] : { rows: [], rowCount: 0 };
    return typeof value === 'function' ? (value as () => unknown)() : value;
  });
  return { query, release: vi.fn() };
}

const UID = '11111111-1111-4111-8111-111111111111';
const makeReq = () => ({ method: 'DELETE', headers: {} }) as unknown as VercelRequest;

const successfulDbSteps = () => ({
  'FROM parents': { rows: [{ user_id: UID }], rowCount: 1 },
  'FROM nannies': { rows: [], rowCount: 0 },
  'INSERT INTO account_deletions': { rows: [], rowCount: 1 },
  'DELETE FROM bookings': { rows: [], rowCount: 0 },
  'UPDATE bookings': { rows: [], rowCount: 0 },
  'UPDATE parents': { rows: [], rowCount: 1 },
  'UPDATE nannies': { rows: [], rowCount: 0 },
  'DELETE FROM support_messages': { rows: [], rowCount: 0 },
  'DELETE FROM support_tickets': { rows: [], rowCount: 0 },
  'DELETE FROM matching_outcomes': { rows: [], rowCount: 0 },
  'DELETE FROM chat_threads': { rows: [], rowCount: 0 },
  'DELETE FROM chat_messages': { rows: [], rowCount: 0 },
  'DELETE FROM chat_participants': { rows: [], rowCount: 0 },
  'UPDATE referrals': { rows: [], rowCount: 0 },
  'UPDATE admin_actions': { rows: [], rowCount: 0 },
  'UPDATE account_deletions': { rows: [{ state: 'db_done' }], rowCount: 1 },
  BEGIN: { rows: [], rowCount: 0 },
  COMMIT: { rows: [], rowCount: 0 },
  ROLLBACK: { rows: [], rowCount: 0 },
});

describe('DELETE /api/auth/delete-account', () => {
  beforeEach(() => {
    connect.mockReset();
    poolQuery.mockClear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('locks, flags, cleans bookings, commits db_done, then deletes Auth user', async () => {
    const client = mockClient(successfulDbSteps());
    connect.mockResolvedValue(client);
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchMock);

    const res = createMockResponse();
    await handler(makeReq(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const methods = fetchMock.mock.calls.map((call) => (call[1] as RequestInit).method);
    expect(methods).toEqual(['PUT', 'DELETE']);
    expect(String((fetchMock.mock.calls[0][1] as RequestInit).body)).toContain('ban_duration');
    const sql = client.query.mock.calls.map((call) => String(call[0]));
    expect(sql.findIndex((value) => value.includes('FROM parents'))).toBeLessThan(
      sql.findIndex((value) => value.includes('FROM nannies')),
    );
    expect(sql.some((value) => /DELETE FROM bookings\s+WHERE status = 'pending'/.test(value))).toBe(
      true,
    );
    expect(sql.some((value) => value.includes('DELETE FROM matching_outcomes'))).toBe(true);
    expect(sql.some((value) => value.includes('DELETE FROM chat_threads'))).toBe(true);
    expect(sql.some((value) => value.includes('UPDATE referrals SET referrer_id = NULL'))).toBe(
      true,
    );
  });

  it('confirmed Auth user_not_found response is treated as success', async () => {
    connect.mockResolvedValue(mockClient(successfulDbSteps()));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === 'PUT'
          ? { ok: true, status: 200, text: async () => '' }
          : {
              ok: false,
              status: 404,
              text: async () => '{"error_code":"user_not_found","msg":"User not found"}',
            },
      ),
    );

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('404 substring outside exact Auth error code remains pending', async () => {
    connect.mockResolvedValue(mockClient(successfulDbSteps()));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === 'PUT'
          ? { ok: true, status: 200, text: async () => '' }
          : {
              ok: false,
              status: 404,
              text: async () => '{"code":"proxy_not_found","message":"not user_not_found"}',
            },
      ),
    );

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({ ok: true, pending: true });
  });

  it('commits DB and returns 202 when Auth deletion returns a transient failure', async () => {
    const client = mockClient(successfulDbSteps());
    connect.mockResolvedValue(client);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === 'PUT'
          ? { ok: true, status: 200, text: async () => '' }
          : { ok: false, status: 500, text: async () => 'transient failure' },
      ),
    );

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({ ok: true, pending: true });
    expect(client.query.mock.calls.some((call) => String(call[0]).includes('COMMIT'))).toBe(true);
  });

  it('returns 202 when Auth deletion fetch rejects', async () => {
    connect.mockResolvedValue(mockClient(successfulDbSteps()));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'PUT') return { ok: true, status: 200, text: async () => '' };
        throw new Error('fetch failed: ECONNRESET');
      }),
    );

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({ ok: true, pending: true });
  });

  it('already-deleted state is an idempotent no-op without another Auth call', async () => {
    const steps = successfulDbSteps();
    steps['UPDATE account_deletions'] = { rows: [], rowCount: 0 };
    connect.mockResolvedValue(mockClient(steps));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('locks own profile rows even when the account has zero bookings', async () => {
    const client = mockClient(successfulDbSteps());
    connect.mockResolvedValue(client);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, text: async () => '' })),
    );

    await handler(makeReq(), createMockResponse());
    const lockCalls = client.query.mock.calls.filter((call) =>
      /FROM (parents|nannies)/.test(String(call[0])),
    );
    expect(lockCalls).toHaveLength(2);
    expect(lockCalls.every((call) => String(call[0]).includes('FOR UPDATE'))).toBe(true);
  });

  it('returns 401 before opening a DB connection when unauthenticated', async () => {
    const { verifyBearerUser } = await import('../_auth.js');
    vi.mocked(verifyBearerUser).mockResolvedValueOnce(null);

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(401);
    expect(connect).not.toHaveBeenCalled();
  });
});
