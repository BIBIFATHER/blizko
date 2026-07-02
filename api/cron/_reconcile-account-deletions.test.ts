import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const query = vi.fn();
vi.mock('../_db.js', () => ({ getDbPool: vi.fn(() => ({ query })) }));
vi.mock('../_logScrub.js', () => ({ logError: vi.fn(), logWarn: vi.fn() }));

import handler from './_reconcile-account-deletions';
import { createMockResponse } from '../_testUtils';

function makeReq(): VercelRequest {
  return {
    method: 'GET',
    headers: { authorization: 'Bearer test-secret' },
  } as unknown as VercelRequest;
}

function mockBatch(rows: Array<{ user_id: string; attempts: number }>, completionRowCount = 1) {
  query.mockImplementation(async (sql: string) => {
    if (sql.includes('FOR UPDATE SKIP LOCKED')) return { rows, rowCount: rows.length };
    return { rows: [], rowCount: completionRowCount };
  });
}

describe('reconcile-account-deletions cron', () => {
  beforeEach(() => {
    query.mockReset();
    process.env.CRON_SECRET = 'test-secret';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('returns 401 without the correct CRON_SECRET', async () => {
    delete process.env.CRON_SECRET;
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('marks a successfully deleted leased row as deleted', async () => {
    mockBatch([{ user_id: 'u1', attempts: 0 }]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, text: async () => '' })),
    );

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.body).toMatchObject({ ok: true, deleted: 1, stillPending: 0, failed: 0 });
    const completion = query.mock.calls.find((call) =>
      String(call[0]).includes("SET state = 'deleted'"),
    );
    expect(completion).toBeTruthy();
    expect(String(completion![0])).toContain("state = 'db_done'");
  });

  it('continues the batch after one fetch rejection', async () => {
    mockBatch([
      { user_id: 'u1', attempts: 0 },
      { user_id: 'u2', attempts: 0 },
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('u1')) throw new Error('ETIMEDOUT');
        return { ok: true, status: 200, text: async () => '' };
      }),
    );

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.body).toMatchObject({ ok: true, deleted: 1, stillPending: 1, failed: 0 });
    expect(
      query.mock.calls.some(
        (call) => String(call[0]).includes('attempts = attempts + 1') && call[1]?.[0] === 'u1',
      ),
    ).toBe(true);
  });

  it('treats exact Auth user_not_found JSON code as deleted', async () => {
    mockBatch([{ user_id: 'u1', attempts: 2 }]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
        text: async () => '{"error_code":"user_not_found"}',
      })),
    );

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.body).toMatchObject({ ok: true, deleted: 1, stillPending: 0, failed: 0 });
  });

  it('does not accept a user_not_found substring outside the exact code', async () => {
    mockBatch([{ user_id: 'u1', attempts: 1 }]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
        text: async () => '{"code":"proxy_not_found","message":"not user_not_found"}',
      })),
    );

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.body).toMatchObject({ ok: true, deleted: 0, stillPending: 1, failed: 0 });
    expect(
      query.mock.calls.some(
        (call) =>
          String(call[0]).includes('attempts = attempts + 1') &&
          String(call[0]).includes('lease_until = NULL'),
      ),
    ).toBe(true);
  });

  it('moves the fifth failed attempt to failed', async () => {
    mockBatch([{ user_id: 'u1', attempts: 4 }]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, text: async () => 'still failing' })),
    );

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.body).toMatchObject({ ok: true, deleted: 0, stillPending: 0, failed: 1 });
    expect(query.mock.calls.some((call) => String(call[0]).includes("state = 'failed'"))).toBe(
      true,
    );
  });

  it('does not inflate counters when a stale worker completion affects zero rows', async () => {
    mockBatch([{ user_id: 'u1', attempts: 0 }], 0);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, text: async () => '' })),
    );

    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.body).toMatchObject({ ok: true, deleted: 0, stillPending: 0, failed: 0 });
  });
});
