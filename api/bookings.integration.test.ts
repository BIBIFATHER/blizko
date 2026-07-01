/**
 * PG-backed integration тесты BLI-141 create/status (Plan B Task 7).
 * Проверяют то, что mock не может: реальный 23505 на bookings_idempotency_key_key,
 * реальную FOR UPDATE-сериализацию, eligibility по jsonb payload->>'status'.
 *
 * Запуск: INTEGRATION_PG_URL=postgres://…local… npm test -- api/bookings.integration.test.ts
 * Без env — describe.skipIf → CI не падает.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { Pool, type PoolClient } from 'pg';

const PG_URL = process.env.INTEGRATION_PG_URL;
const APP_NAME = 'bli141_ctest_' + process.pid + '_' + Date.now();

// Уникальные id фикстуры (per-run), чтобы параллельные прогоны не пересекались.
const REQ_ID = `it_req_${process.pid}_${Date.now()}`;
const NANNY_ID = `it_nanny_${process.pid}_${Date.now()}`;
const PARENT_UID = crypto.randomUUID();
const NANNY_UID = crypto.randomUUID();

let pool: Pool;

vi.mock('./_cors.js', () => ({ setCors: vi.fn() }));
vi.mock('./_rate-limit.js', () => ({ rateLimit: vi.fn(() => ({ ok: true })) }));
vi.mock('./_logScrub.js', () => ({ logError: vi.fn(), logWarn: vi.fn() }));
vi.mock('./_auth.js', () => ({
  getServerEnv: vi.fn(() => ({ adminEmails: ['admin@example.com'] })),
  verifyBearerAdmin: vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.com' })),
  verifyBearerUser: vi.fn(async () => null),
}));
// getDbPool отдаёт тестовый pool (max>=3 для case concurrency), НЕ app-singleton max:1.
vi.mock('./_db.js', () => ({ getDbPool: () => pool }));

import handler from './bookings';
import { createMockResponse, type MockVercelResponse } from './_testUtils';

const uuid = () => crypto.randomUUID();
const makeCreate = (idempotency_key: string, date = '2026-07-10', amount?: string) =>
  ({
    method: 'POST',
    headers: {},
    query: { op: 'create' },
    body: { request_id: REQ_ID, nanny_entity_id: NANNY_ID, idempotency_key, date, amount },
  }) as unknown as VercelRequest;
const makeStatus = (booking_id: string, expected_status: string, to_status: string) =>
  ({
    method: 'POST',
    headers: {},
    query: { op: 'status' },
    body: { booking_id, expected_status, to_status },
  }) as unknown as VercelRequest;

async function waitFor(p: () => Promise<boolean>, timeout: number) {
  const t0 = Date.now();
  while (!(await p())) {
    if (Date.now() - t0 > timeout) throw new Error('waitFor timeout');
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe.skipIf(!PG_URL)('PG integration: bookings create/status', () => {
  beforeAll(async () => {
    process.env.BOOKINGS_ENDPOINT_ENABLED = 'true';
    pool = new Pool({
      connectionString: PG_URL,
      max: 3,
      application_name: APP_NAME,
      statement_timeout: 8000,
      lock_timeout: 8000,
    });
    await pool.query('INSERT INTO auth.users (id) VALUES ($1), ($2)', [PARENT_UID, NANNY_UID]);
    await pool.query(
      `INSERT INTO parents (id, payload, user_id) VALUES ($1, '{"status":"new"}'::jsonb, $2)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, user_id = EXCLUDED.user_id`,
      [REQ_ID, PARENT_UID],
    );
    await pool.query(
      `INSERT INTO nannies (id, payload, user_id) VALUES ($1, '{}'::jsonb, $2)
       ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id`,
      [NANNY_ID, NANNY_UID],
    );
  });

  afterAll(async () => {
    if (!pool) return;
    try {
      await pool.query('DELETE FROM bookings WHERE request_id = $1', [REQ_ID]);
      await pool.query('DELETE FROM parents WHERE id = $1', [REQ_ID]);
      await pool.query('DELETE FROM nannies WHERE id = $1', [NANNY_ID]);
      await pool.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [
        [PARENT_UID, NANNY_UID],
      ]);
      const { rows } = await pool.query(
        `SELECT
           (SELECT count(*)::int FROM bookings WHERE request_id = $1) +
           (SELECT count(*)::int FROM parents WHERE id = $1) +
           (SELECT count(*)::int FROM nannies WHERE id = $2) +
           (SELECT count(*)::int FROM auth.users WHERE id = ANY($3::uuid[])) AS remaining`,
        [REQ_ID, NANNY_ID, [PARENT_UID, NANNY_UID]],
      );
      expect(rows[0].remaining).toBe(0);
    } finally {
      delete process.env.BOOKINGS_ENDPOINT_ENABLED;
      await pool.end();
    }
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM bookings WHERE request_id = $1', [REQ_ID]);
    await pool.query(`UPDATE parents SET payload = '{"status":"new"}'::jsonb WHERE id = $1`, [
      REQ_ID,
    ]);
  });

  it('1. create happy-path → 201, строка реально существует, parent_id=parents.user_id', async () => {
    const res = createMockResponse();
    await handler(makeCreate(uuid()), res);
    expect(res.statusCode).toBe(201);
    const booking = (res.body as { booking: { id: string; parent_id: string } }).booking;
    expect(booking.parent_id).toBe(PARENT_UID);
    const { rows } = await pool.query('SELECT id FROM bookings WHERE id = $1', [booking.id]);
    expect(rows).toHaveLength(1);
  });

  it('2. повтор с тем же ключом+payload → 200, тот же id', async () => {
    const key = uuid();
    const r1 = createMockResponse();
    await handler(makeCreate(key), r1);
    expect(r1.statusCode).toBe(201);
    const id1 = (r1.body as { booking: { id: string } }).booking.id;
    const r2 = createMockResponse();
    await handler(makeCreate(key), r2);
    expect(r2.statusCode).toBe(200);
    expect((r2.body as { booking: { id: string } }).booking.id).toBe(id1);
  });

  it('3. тот же ключ, иной amount → 409', async () => {
    const key = uuid();
    const r1 = createMockResponse();
    await handler(makeCreate(key, '2026-07-10', '100'), r1);
    expect(r1.statusCode).toBe(201);
    const r2 = createMockResponse();
    await handler(makeCreate(key, '2026-07-10', '200'), r2);
    expect(r2.statusCode).toBe(409);
  });

  it('constraint: duplicate idempotency_key → реальный 23505 с ожидаемым именем', async () => {
    const key = uuid();
    const insert = () =>
      pool.query(
        `INSERT INTO bookings
           (parent_id, nanny_id, request_id, nanny_profile_id, date, amount,
            status, idempotency_key, idempotency_fingerprint)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8)`,
        [PARENT_UID, NANNY_UID, REQ_ID, NANNY_ID, '2026-07-10', '100.00', key, 'sha256:v1:test'],
      );
    await insert();
    await expect(insert()).rejects.toMatchObject({
      code: '23505',
      constraint: 'bookings_idempotency_key_key',
    });
  });

  it('4. вторая активная бронь пары с иным ключом → 409', async () => {
    const first = createMockResponse();
    await handler(makeCreate(uuid()), first);
    expect(first.statusCode).toBe(201);

    const second = createMockResponse();
    await handler(makeCreate(uuid()), second);
    expect(second.statusCode).toBe(409);
    expect(String((second.body as { error: string }).error)).toMatch(/active booking/i);
  });

  it('5. parent status=rejected → 409 (eligibility на реальном jsonb)', async () => {
    await pool.query(`UPDATE parents SET payload = '{"status":"rejected"}'::jsonb WHERE id = $1`, [
      REQ_ID,
    ]);
    const res = createMockResponse();
    await handler(makeCreate(uuid()), res);
    expect(res.statusCode).toBe(409);
    expect(String((res.body as { error: string }).error)).toMatch(/eligible/i);
  });

  it('6. status expected_status не равен живому status → 409 без изменения строки', async () => {
    const createRes = createMockResponse();
    await handler(makeCreate(uuid()), createRes);
    expect(createRes.statusCode).toBe(201);
    const bookingId = (createRes.body as { booking: { id: string } }).booking.id;

    const statusRes = createMockResponse();
    await handler(makeStatus(bookingId, 'confirmed', 'cancelled'), statusRes);
    expect(statusRes.statusCode).toBe(409);
    const { rows } = await pool.query('SELECT status FROM bookings WHERE id = $1', [bookingId]);
    expect(rows[0].status).toBe('pending');
  });

  it('7. concurrency different-key same-pair → ровно один 201, второй 409 (FOR UPDATE)', async () => {
    const resA = createMockResponse();
    const resB = createMockResponse();
    await runBarrier(makeCreate(uuid()), resA, makeCreate(uuid()), resB);
    expect([resA.statusCode, resB.statusCode].sort()).toEqual([201, 409]);
  }, 20_000);

  it('8. concurrency same-key → [200, 201] (re-check под локом, round9)', async () => {
    const key = uuid();
    const resA = createMockResponse();
    const resB = createMockResponse();
    await runBarrier(makeCreate(key), resA, makeCreate(key), resB);
    expect([resA.statusCode, resB.statusCode].sort()).toEqual([200, 201]);
  }, 20_000);

  // Детерминированный barrier: внешний L держит FOR UPDATE на parent-row; A,B встают в очередь;
  // L отпускает → сериализация по row-lock. L всегда закрывается в finally.
  async function runBarrier(
    reqA: VercelRequest,
    resA: MockVercelResponse,
    reqB: VercelRequest,
    resB: MockVercelResponse,
  ) {
    const L: PoolClient = await pool.connect();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pA: Promise<unknown> | undefined, pB: Promise<unknown> | undefined;
    try {
      await L.query('BEGIN');
      await L.query('SELECT id FROM parents WHERE id = $1 FOR UPDATE', [REQ_ID]);
      pA = handler(reqA, resA);
      pB = handler(reqB, resB);
      let observed: Array<{ state: string; wait_event_type: string | null; query: string }> = [];
      await waitFor(async () => {
        // L живёт в одной транзакции; очистить transaction-local stats snapshot,
        // иначе pg_stat_activity не увидит подключившиеся после первого чтения A/B.
        await L.query('SELECT pg_stat_clear_snapshot()');
        const { rows } = await L.query(
          `SELECT application_name, state, wait_event_type, query FROM pg_stat_activity
           WHERE application_name = $1 AND pid <> pg_backend_pid()`,
          [APP_NAME],
        );
        observed = rows;
        return (
          observed.filter(
            (row) =>
              row.wait_event_type === 'Lock' &&
              row.state === 'active' &&
              /FROM\s+parents/i.test(row.query) &&
              /FOR\s+UPDATE/i.test(row.query),
          ).length === 2
        );
      }, 5000).catch((error) => {
        throw new Error(
          `${String(error)}; pool=${pool.totalCount}/${pool.idleCount}/${pool.waitingCount}; ` +
            `responses=${resA.statusCode}/${resB.statusCode}; observed=${JSON.stringify(observed)}`,
        );
      });
      await L.query('ROLLBACK');
      const guard = new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error('create race deadlock/timeout')), 10000);
      });
      await Promise.race([Promise.all([pA, pB]), guard]);
    } finally {
      clearTimeout(timer);
      await L.query('ROLLBACK').catch(() => {});
      L.release();
      await Promise.allSettled([pA, pB]);
    }
  }
});
