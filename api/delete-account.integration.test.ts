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
  threadId: crypto.randomUUID(),
  referralId: crypto.randomUUID(),
  adminActionId: crypto.randomUUID(),
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
      await pool.query('DELETE FROM referrals WHERE id = $1', [identities.referralId]);
      await pool.query('DELETE FROM admin_actions WHERE id = $1', [identities.adminActionId]);
      await pool.query('DELETE FROM parents WHERE id = $1', [REQ_ID]);
      await pool.query('DELETE FROM nannies WHERE id = $1', [NANNY_ID]);
      await pool.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [
        [PARENT_UID, NANNY_UID],
      ]);
      const { rows } = await pool.query(
        `SELECT
           (SELECT count(*)::int FROM bookings WHERE request_id = $1 OR nanny_id = $2) +
           (SELECT count(*)::int FROM account_deletions WHERE user_id = ANY($4::uuid[])) +
           (SELECT count(*)::int FROM referrals WHERE id = $5) +
           (SELECT count(*)::int FROM admin_actions WHERE id = $6) +
           (SELECT count(*)::int FROM parents WHERE id = $1) +
           (SELECT count(*)::int FROM nannies WHERE id = $3) +
           (SELECT count(*)::int FROM auth.users WHERE id = ANY($4::uuid[])) AS remaining`,
        [
          REQ_ID,
          NANNY_UID,
          NANNY_ID,
          [PARENT_UID, NANNY_UID],
          identities.referralId,
          identities.adminActionId,
        ],
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
    await pool.query('DELETE FROM referrals WHERE id = $1', [identities.referralId]);
    await pool.query('DELETE FROM admin_actions WHERE id = $1', [identities.adminActionId]);
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

  it('cleans NOT NULL identity rows and nulls remaining auth FK blockers', async () => {
    await pool.query(
      `INSERT INTO matching_outcomes (parent_id, nanny_id, outcome)
       VALUES ($1, $2, 'hired')`,
      [PARENT_UID, NANNY_UID],
    );
    await pool.query(
      `INSERT INTO chat_threads (id, type, family_id, nanny_id)
       VALUES ($1, 'match', $2, $3)`,
      [identities.threadId, PARENT_UID, NANNY_UID],
    );
    await pool.query(
      `INSERT INTO chat_participants (thread_id, user_id, role)
       VALUES ($1, $2, 'family')`,
      [identities.threadId, PARENT_UID],
    );
    await pool.query(
      `INSERT INTO chat_messages (thread_id, sender_id, text)
       VALUES ($1, $2, 'synthetic lifecycle fixture')`,
      [identities.threadId, PARENT_UID],
    );
    await pool.query(
      `INSERT INTO referrals (id, referrer_id, referrer_name, code)
       VALUES ($1, $2, 'Synthetic Parent', $3)`,
      [identities.referralId, PARENT_UID, `it-ref-${process.pid}`],
    );
    await pool.query(
      `INSERT INTO admin_actions (id, admin_id, action)
       VALUES ($1, $2, 'synthetic_lifecycle_fixture')`,
      [identities.adminActionId, PARENT_UID],
    );

    stubAuthFetchOk();
    const deletion = createMockResponse();
    await deleteAccountHandler(makeDeleteReq(), deletion);
    expect(deletion.statusCode).toBe(200);

    expect(
      (await pool.query('SELECT 1 FROM matching_outcomes WHERE parent_id = $1', [PARENT_UID])).rows,
    ).toHaveLength(0);
    expect(
      (await pool.query('SELECT 1 FROM chat_threads WHERE id = $1', [identities.threadId])).rows,
    ).toHaveLength(0);
    expect(
      (await pool.query('SELECT 1 FROM chat_messages WHERE sender_id = $1', [PARENT_UID])).rows,
    ).toHaveLength(0);
    expect(
      (await pool.query('SELECT 1 FROM chat_participants WHERE user_id = $1', [PARENT_UID])).rows,
    ).toHaveLength(0);
    expect(
      (
        await pool.query('SELECT referrer_id, referrer_name FROM referrals WHERE id = $1', [
          identities.referralId,
        ])
      ).rows[0],
    ).toMatchObject({ referrer_id: null, referrer_name: null });
    expect(
      (
        await pool.query('SELECT admin_id FROM admin_actions WHERE id = $1', [
          identities.adminActionId,
        ])
      ).rows[0].admin_id,
    ).toBeNull();
  });

  it('blocks an existing authenticated JWT from restoring data after deletion starts', async () => {
    await pool.query("INSERT INTO account_deletions (user_id, state) VALUES ($1, 'db_done')", [
      PARENT_UID,
    ]);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: PARENT_UID, role: 'authenticated' }),
      ]);
      await client.query('SET LOCAL ROLE authenticated');

      const update = await client.query(
        `UPDATE parents SET payload = '{"resurrected":true}'::jsonb WHERE user_id = $1`,
        [PARENT_UID],
      );
      expect(update.rowCount).toBe(0);

      await expect(
        client.query("INSERT INTO parents (id, payload, user_id) VALUES ($1, '{}'::jsonb, $2)", [
          `${REQ_ID}_resurrect`,
          PARENT_UID,
        ]),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
  });

  it('has the exact restrictive deletion barrier contract on all writer tables', async () => {
    const expectedTables = [
      'parents',
      'nannies',
      'bookings',
      'booking_confirmations',
      'chat_threads',
      'chat_messages',
      'chat_participants',
      'support_tickets',
      'support_messages',
      'matching_outcomes',
    ];
    const { rows } = await pool.query(
      `SELECT c.relname AS table_name, c.relrowsecurity, p.permissive,
              p.roles = ARRAY['authenticated']::name[] AS roles_ok,
              p.cmd, p.qual, p.with_check
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
       JOIN pg_policies p ON p.schemaname = n.nspname
                         AND p.tablename = c.relname
                         AND p.policyname = c.relname || '_deletion_barrier'
       WHERE c.relname = ANY($1::text[])
       ORDER BY c.relname`,
      [expectedTables],
    );
    expect(rows.map((row) => row.table_name)).toEqual([...expectedTables].sort());
    for (const row of rows) {
      expect(row.relrowsecurity).toBe(true);
      expect(row.permissive).toBe('RESTRICTIVE');
      expect(row.roles_ok).toBe(true);
      expect(row.cmd).toBe('ALL');
      expect(row.qual).toContain('NOT account_in_deletion()');
      expect(row.with_check).toContain('NOT account_in_deletion()');
    }

    const helper = await pool.query(
      `SELECT p.prosecdef, p.provolatile, p.proconfig,
              has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
              has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
              NOT EXISTS (
                SELECT 1
                FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
                WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
              ) AS public_revoked
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'account_in_deletion'
         AND p.pronargs = 0`,
    );
    expect(helper.rows).toHaveLength(1);
    expect(helper.rows[0]).toMatchObject({
      prosecdef: true,
      provolatile: 's',
      auth_exec: true,
      anon_exec: false,
      public_revoked: true,
    });
    expect(helper.rows[0].proconfig).toContain('search_path=public');
  });
});
