import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { createHash } from 'node:crypto';

const connect = vi.fn();
vi.mock('./_cors.js', () => ({ setCors: vi.fn() }));
vi.mock('./_rate-limit.js', () => ({ rateLimit: vi.fn(() => ({ ok: true })) }));
vi.mock('./_auth.js', () => ({
  getServerEnv: vi.fn(() => ({ adminEmails: ['admin@example.com'] })),
  verifyBearerAdmin: vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.com' })),
  verifyBearerUser: vi.fn(async () => ({ id: 'user-1', email: 'user@example.com' })),
}));
vi.mock('./_logScrub.js', () => ({ logError: vi.fn(), logWarn: vi.fn() }));
vi.mock('./_db.js', () => ({ getDbPool: vi.fn(() => ({ connect })) }));

import handler from './bookings';
import { createMockResponse } from './_testUtils';

// Простой SQL-роутер для mock-клиента: ключ = подстрока SQL.
function mockClient(steps: Record<string, unknown>) {
  const query = vi.fn(async (sql: string) => {
    const key = Object.keys(steps).find((k) => sql.includes(k));
    const v = key ? steps[key] : { rows: [], rowCount: 0 };
    return typeof v === 'function' ? (v as () => unknown)() : v;
  });
  return { query, release: vi.fn() };
}

const baseBody = {
  request_id: 'req-1',
  nanny_entity_id: 'nanny-1',
  idempotency_key: '11111111-1111-4111-8111-111111111111',
  date: '2026-07-10',
};
const makeReq = (body: unknown) =>
  ({ method: 'POST', headers: {}, query: { op: 'create' }, body } as unknown as VercelRequest);

function canonAmt(raw: string) {
  const [i, f = ''] = raw.split('.');
  return `${i}.${(f + '00').slice(0, 2)}`;
}
function fpOf(b: { request_id: string; nanny_entity_id: string; date: string; amount?: string }) {
  const amount = b.amount == null ? '\0' : canonAmt(b.amount.trim());
  const canon = [b.request_id, b.nanny_entity_id, b.date, amount].join('\x1f');
  return 'sha256:v1:' + createHash('sha256').update(canon, 'utf8').digest('hex');
}

// C9: маршрут default-closed. Все функциональные тесты включают флаг; отдельный тест — на 404 без него.
beforeEach(() => {
  process.env.BOOKINGS_ENDPOINT_ENABLED = 'true';
});
afterEach(() => {
  delete process.env.BOOKINGS_ENDPOINT_ENABLED;
});

describe('feature gate (C9)', () => {
  it('404 when BOOKINGS_ENDPOINT_ENABLED is not "true"', async () => {
    delete process.env.BOOKINGS_ENDPOINT_ENABLED;
    connect.mockReset();
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(404);
    expect(connect).not.toHaveBeenCalled();
  });
});

describe('POST /api/bookings?op=create', () => {
  beforeEach(() => connect.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it('derives auth uids from parents/nannies and inserts (201)', async () => {
    connect.mockResolvedValue(
      mockClient({
        'FROM parents': { rows: [{ user_id: 'parent-uid', status: 'new' }], rowCount: 1 },
        'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
        'FROM account_deletions': { rows: [], rowCount: 0 },
        'WHERE idempotency_key': { rows: [], rowCount: 0 },
        'FROM bookings WHERE parent_id': { rows: [], rowCount: 0 },
        'INSERT INTO bookings': {
          rows: [{ id: 'b1', parent_id: 'parent-uid', nanny_id: 'nanny-uid', status: 'pending' }],
          rowCount: 1,
        },
        BEGIN: { rows: [] },
        COMMIT: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(201);
    expect((res.body as { booking: { parent_id: string } }).booking.parent_id).toBe('parent-uid');
    expect((res.body as { booking: { nanny_id: string } }).booking.nanny_id).toBe('nanny-uid');
  });

  // Eligibility DB-контракт (C2): whitelist. new/in_review/absent → eligible; всё иное → 409.
  it.each(['approved', 'rejected', 'archived'])(
    'rejects not-eligible parent status "%s" (409)',
    async (status) => {
      connect.mockResolvedValue(
        mockClient({
          'WHERE idempotency_key': { rows: [], rowCount: 0 },
          'FROM parents': { rows: [{ user_id: 'parent-uid', status }], rowCount: 1 },
          'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
          BEGIN: { rows: [] },
          ROLLBACK: { rows: [] },
        }),
      );
      const res = createMockResponse();
      await handler(makeReq(baseBody), res);
      expect(res.statusCode).toBe(409);
      expect(String((res.body as { error: string }).error)).toMatch(/eligible/i);
    },
  );

  it.each(['new', 'in_review', null])(
    'allows eligible parent status "%s" → proceeds to insert (201)',
    async (status) => {
      connect.mockResolvedValue(
        mockClient({
          'WHERE idempotency_key': { rows: [], rowCount: 0 },
          'FROM parents': { rows: [{ user_id: 'parent-uid', status }], rowCount: 1 },
          'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
          'FROM account_deletions': { rows: [], rowCount: 0 },
          'FROM bookings WHERE parent_id': { rows: [], rowCount: 0 },
          'INSERT INTO bookings': {
            rows: [{ id: 'b1', parent_id: 'parent-uid', nanny_id: 'nanny-uid', status: 'pending' }],
            rowCount: 1,
          },
          BEGIN: { rows: [] },
          COMMIT: { rows: [] },
          ROLLBACK: { rows: [] },
        }),
      );
      const res = createMockResponse();
      await handler(makeReq(baseBody), res);
      expect(res.statusCode).toBe(201);
    },
  );

  it('rejects when a party is under account deletion (409)', async () => {
    connect.mockResolvedValue(
      mockClient({
        'WHERE idempotency_key': { rows: [], rowCount: 0 },
        'FROM parents': { rows: [{ user_id: 'parent-uid', status: 'new' }], rowCount: 1 },
        'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
        'FROM account_deletions': { rows: [{ '?column?': 1 }], rowCount: 1 },
        BEGIN: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(409);
    expect(String((res.body as { error: string }).error)).toMatch(/delet/i);
  });

  it('404 when request or nanny missing', async () => {
    connect.mockResolvedValue(
      mockClient({
        'WHERE idempotency_key': { rows: [], rowCount: 0 },
        'FROM parents': { rows: [], rowCount: 0 },
        'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
        BEGIN: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(404);
  });

  it('422 when a party has no auth account', async () => {
    connect.mockResolvedValue(
      mockClient({
        'WHERE idempotency_key': { rows: [], rowCount: 0 },
        'FROM parents': { rows: [{ user_id: null, status: 'new' }], rowCount: 1 },
        'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
        BEGIN: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(422);
  });

  it('400 on missing fields', async () => {
    const res = createMockResponse();
    await handler(makeReq({ request_id: '', nanny_entity_id: '', idempotency_key: '', date: '' }), res);
    expect(res.statusCode).toBe(400);
  });

  it.each([
    ['bad date', { ...baseBody, date: '2026-13-40' }],
    ['non-uuid key', { ...baseBody, idempotency_key: 'not-a-uuid' }],
    ['overflow amount', { ...baseBody, amount: '99999999999.999' }],
    ['non-string amount', { ...baseBody, amount: 1000 }],
  ])('400 on %s', async (_label, body) => {
    const res = createMockResponse();
    await handler(makeReq(body), res);
    expect(res.statusCode).toBe(400);
    expect(connect).not.toHaveBeenCalled();
  });

  // Task 2: idempotency replay/conflict/pair
  it('same-key same-payload replay → 200 existing row', async () => {
    const fp = fpOf(baseBody);
    connect.mockResolvedValue(
      mockClient({
        'WHERE idempotency_key': { rows: [{ id: 'b1', idempotency_fingerprint: fp }], rowCount: 1 },
        BEGIN: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(200);
    expect((res.body as { booking: { id: string } }).booking.id).toBe('b1');
  });

  it('same-key different-payload → 409', async () => {
    connect.mockResolvedValue(
      mockClient({
        'WHERE idempotency_key': { rows: [{ id: 'b1', idempotency_fingerprint: 'sha256:v1:OTHER' }], rowCount: 1 },
        BEGIN: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(409);
    expect(String((res.body as { error: string }).error)).toMatch(/different payload/i);
  });

  it('active pair exists (new key) → 409', async () => {
    connect.mockResolvedValue(
      mockClient({
        'WHERE idempotency_key': { rows: [], rowCount: 0 },
        'FROM parents': { rows: [{ user_id: 'parent-uid', status: 'new' }], rowCount: 1 },
        'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
        'FROM account_deletions': { rows: [], rowCount: 0 },
        'FROM bookings WHERE parent_id': { rows: [{ id: 'old' }], rowCount: 1 },
        BEGIN: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(409);
    expect(String((res.body as { error: string }).error)).toMatch(/pair/i);
  });
});
