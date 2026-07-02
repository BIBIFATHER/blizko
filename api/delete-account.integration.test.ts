/**
 * PG-backed lifecycle tests. Uses only per-run synthetic UUIDs and exact
 * fixture cleanup. Skipped when INTEGRATION_PG_URL is absent.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { Pool, type PoolClient } from 'pg';
import type { MockVercelResponse } from './_testUtils';

const identities = vi.hoisted(() => ({
  parentUid: crypto.randomUUID(),
  nannyUid: crypto.randomUUID(),
}));

const PG_URL = process.env.INTEGRATION_PG_URL;
const APP_NAME = `it_del_${process.pid}_${Date.now()}`;
const REQ_ID = `it_del_req_${process.pid}_${Date.now()}`;
const NANNY_ID = `it_del_nanny_${process.pid}_${Date.now()}`;
const { parentUid: PARENT_UID, nannyUid: NANNY_UID } = identities;

let pool: Pool;

async function waitFor(predicate: () => Promise<boolean>, timeout: number) {
  const startedAt = Date.now();
  while (!(await predicate())) {
    if (Date.now() - startedAt > timeout) throw new Error('waitFor timeout');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

vi.mock('./_cors.js', () => ({ setCors: vi.fn() }));
vi.mock('./_rate-limit.js', () => ({ rateLimit: vi.fn(() => ({ ok: true })) }));
vi.mock('./_logScrub.js', () => ({ logError: vi.fn(), logWarn: vi.fn() }));
vi.mock('./_auth.js', () => ({
  getServerEnv: vi.fn(() => ({ adminEmails: ['admin@example.test'] })),
  verifyBearerAdmin: vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.test' })),
  verifyBearerUser: vi.fn(async () => ({ id: identities.parentUid, email: 'parent@example.test' })),
}));
vi.mock('./_db.js', () => ({ getDbPool: () => pool }));

import createHandler from './bookings';
import deleteAccountHandler from './auth/delete-account';
import { createMockResponse } from './_testUtils';

describe.skipIf(!PG_URL)('PG integration: delete-account lifecycle', () => {
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
      `INSERT INTO parents (id, payload, user_id)
       VALUES ($1, '{"status":"new"}'::jsonb, $2)`,
      [REQ_ID, PARENT_UID],
    );
    await pool.query(`INSERT INTO nannies (id, payload, user_id) VALUES ($1, '{}'::jsonb, $2)`, [
      NANNY_ID,
      NANNY_UID,
    ]);
  });

  afterAll(async () => {
    if (!pool) return;
    try {
      await pool.query('DELETE FROM bookings WHERE request_id = $1 OR nanny_id = $2', [
        REQ_ID,
        NANNY_UID,
      ]);
      await pool.query('DELETE FROM account_deletions WHERE user_id = ANY($1::uuid[])', [
        [PARENT_UID, NANNY_UID],
      ]);
      await pool.query('DELETE FROM parents WHERE id = $1', [REQ_ID]);
      await pool.query('DELETE FROM nannies WHERE id = $1', [NANNY_ID]);
      await pool.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [
        [PARENT_UID, NANNY_UID],
      ]);
      const { rows } = await pool.query(
        `SELECT
           (SELECT count(*)::int FROM bookings WHERE request_id = $1 OR nanny_id = $2) +
           (SELECT count(*)::int FROM account_deletions WHERE user_id = ANY($4::uuid[])) +
           (SELECT count(*)::int FROM parents WHERE id = $1) +
           (SELECT count(*)::int FROM nannies WHERE id = $3) +
           (SELECT count(*)::int FROM auth.users WHERE id = ANY($4::uuid[])) AS remaining`,
        [REQ_ID, NANNY_UID, NANNY_ID, [PARENT_UID, NANNY_UID]],
      );
      expect(rows[0].remaining).toBe(0);
    } finally {
      delete process.env.BOOKINGS_ENDPOINT_ENABLED;
      await pool.end();
    }
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM bookings WHERE request_id = $1 OR nanny_id = $2', [
      REQ_ID,
      NANNY_UID,
    ]);
    await pool.query(`UPDATE parents SET payload = '{"status":"new"}'::jsonb WHERE id = $1`, [
      REQ_ID,
    ]);
    await pool.query('DELETE FROM account_deletions WHERE user_id = $1', [PARENT_UID]);
  });

  const makeCreateReq = () =>
    ({
      method: 'POST',
      headers: {},
      query: { op: 'create' },
      body: {
        request_id: REQ_ID,
        nanny_entity_id: NANNY_ID,
        idempotency_key: crypto.randomUUID(),
        date: '2026-08-01',
      },
    }) as unknown as VercelRequest;

  const makeDeleteReq = () => ({ method: 'DELETE', headers: {} }) as unknown as VercelRequest;
  const stubAuthFetchOk = () =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, text: async () => '' })),
    );

  it('cancels a confirmed booking and anonymizes the deleted parent side', async () => {
    const create = createMockResponse();
    await createHandler(makeCreateReq(), create);
    expect(create.statusCode).toBe(201);
    const bookingId = (create.body as { booking: { id: string } }).booking.id;
    await pool.query("UPDATE bookings SET status = 'confirmed' WHERE id = $1", [bookingId]);

    stubAuthFetchOk();
    const deletion = createMockResponse();
    await deleteAccountHandler(makeDeleteReq(), deletion);
    expect(deletion.statusCode).toBe(200);

    const { rows } = await pool.query('SELECT status, parent_id FROM bookings WHERE id = $1', [
      bookingId,
    ]);
    expect(rows[0]).toMatchObject({ status: 'cancelled', parent_id: null });
    const state = await pool.query('SELECT state FROM account_deletions WHERE user_id = $1', [
      PARENT_UID,
    ]);
    expect(state.rows[0].state).toBe('deleted');
  });

  it('deletes a pending booking and cascades its confirmation', async () => {
    const create = createMockResponse();
    await createHandler(makeCreateReq(), create);
    expect(create.statusCode).toBe(201);
    const bookingId = (create.body as { booking: { id: string } }).booking.id;
    const confirmation = await pool.query(
      `INSERT INTO booking_confirmations (booking_id, type, status)
       VALUES ($1, 't_24h', 'pending') RETURNING id`,
      [bookingId],
    );

    stubAuthFetchOk();
    const deletion = createMockResponse();
    await deleteAccountHandler(makeDeleteReq(), deletion);
    expect(deletion.statusCode).toBe(200);

    expect(
      (await pool.query('SELECT 1 FROM bookings WHERE id = $1', [bookingId])).rows,
    ).toHaveLength(0);
    expect(
      (
        await pool.query('SELECT 1 FROM booking_confirmations WHERE id = $1', [
          confirmation.rows[0].id,
        ])
      ).rows,
    ).toHaveLength(0);
  });

  it('serializes delete before create and leaves no active orphan booking', async () => {
    stubAuthFetchOk();
    const lockHolder: PoolClient = await pool.connect();
    const deleteResponse: MockVercelResponse = createMockResponse();
    const createResponse: MockVercelResponse = createMockResponse();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let deletion: Promise<unknown> | undefined;
    let creation: Promise<unknown> | undefined;
    try {
      await lockHolder.query('BEGIN');
      await lockHolder.query('SELECT id FROM parents WHERE id = $1 FOR UPDATE', [REQ_ID]);

      const countWaiters = async () => {
        await lockHolder.query('SELECT pg_stat_clear_snapshot()');
        const { rows } = await lockHolder.query(
          `SELECT count(*)::int AS n FROM pg_stat_activity
           WHERE application_name = $1 AND pid <> pg_backend_pid()
             AND wait_event_type = 'Lock' AND state = 'active'
             AND query ~* 'FROM\\s+parents' AND query ~* 'FOR\\s+UPDATE'`,
          [APP_NAME],
        );
        return rows[0].n as number;
      };

      deletion = deleteAccountHandler(makeDeleteReq(), deleteResponse);
      await waitFor(async () => (await countWaiters()) === 1, 5000);
      creation = createHandler(makeCreateReq(), createResponse);
      await waitFor(async () => (await countWaiters()) === 2, 5000);

      await lockHolder.query('ROLLBACK');
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('delete/create race timeout')), 10_000);
      });
      await Promise.race([Promise.all([deletion, creation]), timeout]);
    } finally {
      clearTimeout(timer);
      await lockHolder.query('ROLLBACK').catch(() => {});
      lockHolder.release();
      await Promise.allSettled([deletion, creation].filter(Boolean) as Promise<unknown>[]);
    }

    expect(deleteResponse.statusCode).toBe(200);
    expect(createResponse.statusCode).toBe(409);
    expect(String((createResponse.body as { error: string }).error)).toMatch(/delet/i);
    const active = await pool.query(
      `SELECT 1 FROM bookings
       WHERE (request_id = $1 OR nanny_id = $2) AND status <> 'cancelled'`,
      [REQ_ID, NANNY_UID],
    );
    expect(active.rows).toHaveLength(0);
  }, 20_000);

  it('repeated deletion of an already-deleted lifecycle is a no-op', async () => {
    stubAuthFetchOk();
    const first = createMockResponse();
    await deleteAccountHandler(makeDeleteReq(), first);
    expect(first.statusCode).toBe(200);

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const second = createMockResponse();
    await deleteAccountHandler(makeDeleteReq(), second);
    expect(second.statusCode).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    const state = await pool.query('SELECT state FROM account_deletions WHERE user_id = $1', [
      PARENT_UID,
    ]);
    expect(state.rows[0].state).toBe('deleted');
  });
});
