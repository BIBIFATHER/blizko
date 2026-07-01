# BLI-141 План B — Server-authoritative endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести создание и смену статуса booking на сервер (service-role, транзакционно): сервер выводит auth-uid сторон из `parents`/`nannies`, применяет idempotency и eligibility, возвращает реальный результат; клиент перестаёт писать local-first.

**Architecture:** Новый Vercel-эндпоинт `api/bookings.ts` (POST create — куратор; POST status — участник/куратор; GET — admin-чтение). Логика в pg-транзакции через `getDbPool().connect()` (паттерн `api/auth/delete-account.ts`). Клиент (`src/services/booking.ts`, `AdminCuratorTab.tsx`) вызывает endpoint и показывает истинный success/ошибку; local-first writers удаляются.

**Tech Stack:** Vercel serverless (`@vercel/node`), `pg` pool, Supabase Auth (`verifyBearerAdmin`/`verifyBearerUser`), Node `crypto` (fingerprint), Vitest.

## Global Constraints

- Дизайн-источник: `docs/superpowers/specs/2026-06-30-bli141-booking-integrity-lifecycle-epic-design.md` (ред. 3), §3/§4/§5. Foundation-схема — План A (уже применён): `bookings.idempotency_key` (UNIQUE `bookings_idempotency_key_key`), `idempotency_fingerprint`, `nanny_profile_id`, `account_deletions`.
- Идентичность: клиент шлёт `request_id` (=`parents.id`, TEXT) + `nanny_entity_id` (=`nannies.id`, TEXT) + `idempotency_key`; сервер выводит `parent_id=parents.user_id`, `nanny_id=nannies.user_id`. **Клиент НЕ шлёт auth-uid; нет fallback `?? id`.**
- **Секвенс (важно):** partial unique pair-index `bookings_active_pair_uq` создаётся в Плане E, НЕ в A. Поэтому в Плане B cardinality-контроль пары — **app-level SELECT под `FOR UPDATE`** на строках parents/nannies (сериализует конкурентные create той же пары); DB-индекс в E добавится как defense-in-depth. Idempotency_key-уникальность DB-enforced уже (План A).
- Существующий CHECK `bookings_status_check` = pending/confirmed/active/completed/cancelled — НЕ трогаем (это План E добавляет active-CHECK/self-booking).
- Транзакции: `pool.connect()` → `BEGIN`/`COMMIT`/`ROLLBACK`, `client.release()` в `finally`.
- Ошибки логировать через `logError` (`api/_logScrub.ts`), не светить ПДн. `setCors` + `rateLimit` на каждом хендлере.
- State-machine actor (owner-решение): `confirmed→active` и `active→completed` двигает **няня** (auth-uid=nanny_id) или куратор. Матрица §5. Переход вне матрицы → 403; stale-status → 409.
- Тесты: Vitest, паттерн `api/data.test.ts` (mock `_cors`/`_rate-limit`/`_auth`/`_db`, `createMockResponse`). Русский в артефактах; идентификаторы английские.
- Команды: `npm test -- api/bookings.test.ts`, `npm run lint`, `npm run build`.

---

## File Structure

- `api/bookings.ts` — Create: `create booking fingerprint helper`, provenance derivation, idempotency, status-переходы, admin GET. Одна функция-хендлер, роутинг по `req.method` + `req.query.op`.
- `api/bookings.test.ts` — Vitest тесты хендлера.
- `src/services/booking.ts` — заменить `createBooking`/`updateBookingStatus` на серверные вызовы; удалить local-first writers (`remoteSaveBooking`, `markPendingBooking` в write-path). Local readers/pending-merge — **План отдельно** (§7, здесь только writers).
- `src/components/admin/AdminCuratorTab.tsx` — `handleAssign` шлёт `request_id`+`nanny_entity_id`+`idempotency_key`; показывает истинный результат.

---

### Task 1: fingerprint helper + create endpoint (provenance + idempotency)

**Files:**
- Create: `api/bookings.ts`
- Test: `api/bookings.test.ts`

**Interfaces:**
- Produces: `POST /api/bookings?op=create` (verifyBearerAdmin). Тело `{ request_id: string, nanny_entity_id: string, idempotency_key: string, date: string, amount?: string }`. Ответ `201 {booking}` (создано) / `200 {booking}` (idempotent-replay) / `409` (конфликт ключа-diff-payload или активная пара) / `404` (нет parents/nannies) / `422` (нет auth-связи). Функция `computeFingerprint(input)` (не экспортируется, тестируется через endpoint).

- [ ] **Step 1: Write the failing test**

```ts
// api/bookings.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

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

function mockClient(steps: Record<string, any>) {
  // steps: keyed by SQL substring -> rows result
  const query = vi.fn(async (sql: string) => {
    const key = Object.keys(steps).find((k) => sql.includes(k));
    if (!key) return { rows: [], rowCount: 0 };
    const v = steps[key];
    if (typeof v === 'function') return v();
    return v;
  });
  return { query, release: vi.fn() };
}

describe('POST /api/bookings?op=create', () => {
  beforeEach(() => connect.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it('derives auth uids from parents/nannies and inserts booking', async () => {
    const client = mockClient({
      'FROM parents': { rows: [{ user_id: 'parent-uid' }], rowCount: 1 },
      'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
      'FROM account_deletions': { rows: [], rowCount: 0 },
      'FROM bookings WHERE parent_id': { rows: [], rowCount: 0 }, // no active pair
      'INSERT INTO bookings': { rows: [{ id: 'b1', parent_id: 'parent-uid', nanny_id: 'nanny-uid', status: 'pending' }], rowCount: 1 },
      BEGIN: { rows: [] }, COMMIT: { rows: [] },
    });
    connect.mockResolvedValue(client);

    const req = {
      method: 'POST',
      headers: {},
      query: { op: 'create' },
      body: { request_id: 'req-1', nanny_entity_id: 'nanny-1', idempotency_key: 'key-1', date: '2026-07-10' },
    } as unknown as VercelRequest;
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.booking.parent_id).toBe('parent-uid');
    expect(res.body.booking.nanny_id).toBe('nanny-uid');
    // клиент НЕ мог задать parent_id/nanny_id — они выведены сервером
    const insertCall = client.query.mock.calls.find((c) => String(c[0]).includes('INSERT INTO bookings'));
    expect(insertCall).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api/bookings.test.ts`
Expected: FAIL — `Cannot find module './bookings'`.

- [ ] **Step 3: Write the create endpoint**

```ts
// api/bookings.ts
/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { setCors } from './_cors.js';
import { rateLimit } from './_rate-limit.js';
import { verifyBearerAdmin, verifyBearerUser } from './_auth.js';
import { getDbPool } from './_db.js';
import { logError } from './_logScrub.js';

const json = (res: VercelResponse, status: number, payload: any) => res.status(status).json(payload);

const ACTIVE = ['pending', 'confirmed', 'active'];

// Canonical fingerprint (дизайн §4): sha256:v1 над нормализованными полями.
function computeFingerprint(input: {
  request_id: string;
  nanny_entity_id: string;
  date: string;
  amount?: string;
}): string {
  const date = new Date(input.date).toISOString().slice(0, 10); // UTC date
  const amount = (input.amount ?? '\0').trim();
  const canon = [input.request_id, input.nanny_entity_id, date, amount].join('\x1f');
  return 'sha256:v1:' + createHash('sha256').update(canon, 'utf8').digest('hex');
}

async function createBooking(req: VercelRequest, res: VercelResponse) {
  const admin = await verifyBearerAdmin(req);
  if (!admin) return json(res, 401, { error: 'Unauthorized' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const request_id = typeof body.request_id === 'string' ? body.request_id.trim() : '';
  const nanny_entity_id = typeof body.nanny_entity_id === 'string' ? body.nanny_entity_id.trim() : '';
  const idempotency_key = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : '';
  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const amount = typeof body.amount === 'string' ? body.amount.trim() : undefined;
  if (!request_id || !nanny_entity_id || !idempotency_key || !date) {
    return json(res, 400, { error: 'request_id, nanny_entity_id, idempotency_key, date required' });
  }

  const fingerprint = computeFingerprint({ request_id, nanny_entity_id, date, amount });
  const client = await getDbPool().connect();
  try {
    await client.query('BEGIN');
    // 1. lock+load parent(request) и nanny строки (сериализует create пары)
    const p = await client.query('SELECT user_id FROM parents WHERE id = $1 FOR UPDATE', [request_id]);
    const n = await client.query('SELECT user_id FROM nannies WHERE id = $1 FOR UPDATE', [nanny_entity_id]);
    if (p.rowCount === 0 || n.rowCount === 0) {
      await client.query('ROLLBACK');
      return json(res, 404, { error: 'request or nanny not found' });
    }
    const parent_id = p.rows[0].user_id as string | null;
    const nanny_id = n.rows[0].user_id as string | null;
    if (!parent_id || !nanny_id) {
      await client.query('ROLLBACK');
      return json(res, 422, { error: 'both parties must have auth accounts' });
    }
    // 2. deletion-guard (гонка create-vs-delete)
    const del = await client.query(
      `SELECT 1 FROM account_deletions WHERE user_id = ANY($1::uuid[]) AND state <> 'deleted' LIMIT 1`,
      [[parent_id, nanny_id]],
    );
    if (del.rowCount && del.rowCount > 0) {
      await client.query('ROLLBACK');
      return json(res, 409, { error: 'party account is being deleted' });
    }
    // 3. app-level cardinality (pair index — План E): активная бронь пары уже есть?
    const pair = await client.query(
      `SELECT id FROM bookings WHERE parent_id = $1 AND nanny_id = $2 AND status = ANY($3) LIMIT 1`,
      [parent_id, nanny_id, ACTIVE],
    );
    if (pair.rowCount && pair.rowCount > 0) {
      await client.query('ROLLBACK');
      return json(res, 409, { error: 'active booking for this pair already exists' });
    }
    // 4. insert; idempotency по ключу обрабатываем в catch
    try {
      const ins = await client.query(
        `INSERT INTO bookings (parent_id, nanny_id, request_id, nanny_profile_id, date, amount,
                               status, idempotency_key, idempotency_fingerprint)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8) RETURNING *`,
        [parent_id, nanny_id, request_id, nanny_entity_id, date, amount ?? null, idempotency_key, fingerprint],
      );
      await client.query('COMMIT');
      return json(res, 201, { booking: ins.rows[0] });
    } catch (e: any) {
      await client.query('ROLLBACK');
      if (e?.code === '23505' && String(e?.constraint) === 'bookings_idempotency_key_key') {
        // idempotent-replay: сравнить fingerprint существующей строки
        const ex = await getDbPool().query(
          'SELECT * FROM bookings WHERE idempotency_key = $1',
          [idempotency_key],
        );
        if (ex.rowCount && ex.rows[0].idempotency_fingerprint === fingerprint) {
          return json(res, 200, { booking: ex.rows[0] });
        }
        return json(res, 409, { error: 'idempotency key reused with different payload' });
      }
      throw e;
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    logError('[bookings] create failed:', e);
    return json(res, 500, { error: 'Internal error' });
  } finally {
    client.release();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const rl = rateLimit(req, { max: 30, windowMs: 60_000, prefix: 'bookings' });
  if (!rl.ok) return json(res, 429, { error: 'Too many requests' });

  const op = String((req.query as any)?.op || '');
  if (req.method === 'POST' && op === 'create') return createBooking(req, res);
  return json(res, 405, { error: 'Method not allowed' });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api/bookings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/bookings.ts api/bookings.test.ts
git commit -m "feat(bli141): create booking endpoint — server-authoritative provenance + idempotency"
```

---

### Task 2: idempotency + conflict tests

**Files:**
- Modify: `api/bookings.test.ts`

**Interfaces:**
- Consumes: `handler` из Task 1.

- [ ] **Step 1: Write failing tests (replay + conflict + pair)**

```ts
// добавить в api/bookings.test.ts, describe('POST create')
it('returns 200 with existing row on same-key same-payload replay', async () => {
  const err: any = new Error('dup'); err.code = '23505'; err.constraint = 'bookings_idempotency_key_key';
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('FROM parents')) return { rows: [{ user_id: 'parent-uid' }], rowCount: 1 };
    if (sql.includes('FROM nannies')) return { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 };
    if (sql.includes('FROM account_deletions')) return { rows: [], rowCount: 0 };
    if (sql.includes('FROM bookings WHERE parent_id')) return { rows: [], rowCount: 0 };
    if (sql.includes('INSERT INTO bookings')) throw err;
    if (sql.startsWith('BEGIN') || sql.startsWith('ROLLBACK') || sql.startsWith('COMMIT')) return { rows: [] };
    return { rows: [], rowCount: 0 };
  });
  const client = { query, release: vi.fn() };
  connect.mockResolvedValue(client);
  // pool.query (вне транзакции) для reread — тот же getDbPool mock:
  const { getDbPool } = await import('./_db.js');
  (getDbPool as any).mockReturnValue({
    connect,
    query: vi.fn(async () => ({ rows: [{ id: 'b1', idempotency_fingerprint: 'sha256:v1:' }], rowCount: 1 })),
  });
  // ...сконструировать req с idempotency_key и проверить статус.
  // ПРИМЕЧАНИЕ: fingerprint reread должен совпасть — тест подставляет ожидаемый fp.
});
```

Реализовать три теста: (a) replay same-payload → 200; (b) same-key diff-payload → 409; (c) active pair exists → 409. Для (a)/(b) мокнуть `getDbPool().query` reread так, чтобы fingerprint совпадал/не совпадал с `computeFingerprint`. Значение fp вычислить тем же алгоритмом в тесте-хелпере.

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -- api/bookings.test.ts`
Expected: FAIL (reread-ветка/pair-ветка не покрыты корректно до правок).

- [ ] **Step 3: Adjust endpoint if needed**

Логика уже в Task 1. Если тесты вскрывают дефект (напр. reread использует `getDbPool().query`, а тест мокал только `connect`) — согласовать: reread делать через **тот же** `client.query` до `release`, а не новый `getDbPool().query`. Исправить endpoint: заменить `getDbPool().query(...)` в catch на `client.query(...)` ПОСЛЕ `ROLLBACK` (reread не требует транзакции). Обновить Task 1 код соответственно.

```ts
// в catch, вместо getDbPool().query:
const ex = await client.query('SELECT * FROM bookings WHERE idempotency_key = $1', [idempotency_key]);
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- api/bookings.test.ts`
Expected: PASS (все три).

- [ ] **Step 5: Commit**

```bash
git add api/bookings.ts api/bookings.test.ts
git commit -m "feat(bli141): idempotency replay/conflict/pair-cardinality tests + reread via client"
```

---

### Task 3: status endpoint (actor state-machine)

**Files:**
- Modify: `api/bookings.ts`, `api/bookings.test.ts`

**Interfaces:**
- Produces: `POST /api/bookings?op=status` тело `{ booking_id: string, to_status: string }`. verifyBearerUser (участник) ИЛИ verifyBearerAdmin. Optimistic `UPDATE ... WHERE id=? AND status=expected`. Ответ `200 {booking}` / `403` (actor не вправе) / `409` (stale/недопустимый переход).

- [ ] **Step 1: Write failing tests**

```ts
// api/bookings.test.ts
describe('POST /api/bookings?op=status', () => {
  it('lets nanny move confirmed -> active', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('FROM bookings WHERE id')) return { rows: [{ id: 'b1', parent_id: 'p', nanny_id: 'user-1', status: 'confirmed' }], rowCount: 1 };
      if (sql.includes('UPDATE bookings SET status')) return { rows: [{ id: 'b1', status: 'active' }], rowCount: 1 };
      if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    connect.mockResolvedValue({ query, release: vi.fn() });
    const req = { method: 'POST', headers: {}, query: { op: 'status' }, body: { booking_id: 'b1', to_status: 'active' } } as unknown as VercelRequest;
    const res = createMockResponse();
    await handler(req, res);
    expect(res.statusCode).toBe(200);
  });

  it('rejects parent moving confirmed -> active (403)', async () => {
    // verifyBearerUser -> user-1, но user-1 = parent_id, а переход разрешён только няне/куратору
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('FROM bookings WHERE id')) return { rows: [{ id: 'b1', parent_id: 'user-1', nanny_id: 'n', status: 'confirmed' }], rowCount: 1 };
      if (sql.startsWith('BEGIN') || sql.startsWith('ROLLBACK')) return { rows: [] };
      return { rows: [], rowCount: 0 };
    });
    connect.mockResolvedValue({ query, release: vi.fn() });
    const req = { method: 'POST', headers: {}, query: { op: 'status' }, body: { booking_id: 'b1', to_status: 'active' } } as unknown as VercelRequest;
    const res = createMockResponse();
    await handler(req, res);
    expect(res.statusCode).toBe(403);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- api/bookings.test.ts`
Expected: FAIL (op=status не реализован → 405).

- [ ] **Step 3: Implement status endpoint**

```ts
// api/bookings.ts — добавить

// actor-transition matrix (§5): to_status -> роли, которым разрешён переход ИЗ валидного from
type Role = 'parent' | 'nanny' | 'curator';
const TRANSITIONS: Record<string, { from: string[]; roles: Role[] }> = {
  confirmed: { from: ['pending'], roles: ['nanny', 'curator'] },
  active:    { from: ['confirmed'], roles: ['nanny', 'curator'] },
  completed: { from: ['active'], roles: ['nanny', 'curator'] },
  cancelled: { from: ['pending', 'confirmed', 'active'], roles: ['parent', 'nanny', 'curator'] },
};

async function updateStatus(req: VercelRequest, res: VercelResponse) {
  const admin = await verifyBearerAdmin(req);
  const user = admin ? null : await verifyBearerUser(req);
  if (!admin && !user) return json(res, 401, { error: 'Unauthorized' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const booking_id = typeof body.booking_id === 'string' ? body.booking_id.trim() : '';
  const to_status = typeof body.to_status === 'string' ? body.to_status.trim() : '';
  const rule = TRANSITIONS[to_status];
  if (!booking_id || !rule) return json(res, 400, { error: 'booking_id and valid to_status required' });

  const client = await getDbPool().connect();
  try {
    await client.query('BEGIN');
    const b = await client.query('SELECT id, parent_id, nanny_id, status FROM bookings WHERE id = $1 FOR UPDATE', [booking_id]);
    if (b.rowCount === 0) { await client.query('ROLLBACK'); return json(res, 404, { error: 'booking not found' }); }
    const row = b.rows[0];
    // actor
    const role: Role | null = admin ? 'curator'
      : user!.id === row.parent_id ? 'parent'
      : user!.id === row.nanny_id ? 'nanny' : null;
    if (!role || !rule.roles.includes(role)) { await client.query('ROLLBACK'); return json(res, 403, { error: 'actor not allowed' }); }
    // optimistic transition (from-check в WHERE)
    const upd = await client.query(
      `UPDATE bookings SET status = $1 WHERE id = $2 AND status = ANY($3) RETURNING *`,
      [to_status, booking_id, rule.from],
    );
    if (upd.rowCount === 0) { await client.query('ROLLBACK'); return json(res, 409, { error: 'invalid or stale transition' }); }
    await client.query('COMMIT');
    return json(res, 200, { booking: upd.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    logError('[bookings] status failed:', e);
    return json(res, 500, { error: 'Internal error' });
  } finally {
    client.release();
  }
}
```

И в `handler` добавить роут:

```ts
  if (req.method === 'POST' && op === 'status') return updateStatus(req, res);
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- api/bookings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/bookings.ts api/bookings.test.ts
git commit -m "feat(bli141): status endpoint — actor state-machine (няня вручную) + optimistic lock"
```

---

### Task 4: admin GET endpoint

**Files:**
- Modify: `api/bookings.ts`, `api/bookings.test.ts`

**Interfaces:**
- Produces: `GET /api/bookings` (verifyBearerAdmin) → `200 { bookings: [...] }` (все брони, серверное чтение для куратора).

- [ ] **Step 1: Write failing test**

```ts
it('admin GET returns all bookings', async () => {
  connect.mockResolvedValue({
    query: vi.fn(async (sql: string) =>
      sql.includes('FROM bookings') ? { rows: [{ id: 'b1' }, { id: 'b2' }], rowCount: 2 } : { rows: [] }),
    release: vi.fn(),
  });
  const req = { method: 'GET', headers: {}, query: {} } as unknown as VercelRequest;
  const res = createMockResponse();
  await handler(req, res);
  expect(res.statusCode).toBe(200);
  expect(res.body.bookings).toHaveLength(2);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- api/bookings.test.ts`
Expected: FAIL (GET → 405).

- [ ] **Step 3: Implement admin GET**

```ts
// api/bookings.ts — добавить
async function adminList(req: VercelRequest, res: VercelResponse) {
  const admin = await verifyBearerAdmin(req);
  if (!admin) return json(res, 401, { error: 'Unauthorized' });
  const client = await getDbPool().connect();
  try {
    const r = await client.query('SELECT * FROM bookings ORDER BY created_at DESC');
    return json(res, 200, { bookings: r.rows });
  } catch (e) {
    logError('[bookings] admin list failed:', e);
    return json(res, 500, { error: 'Internal error' });
  } finally {
    client.release();
  }
}
```

И в `handler`:

```ts
  if (req.method === 'GET') return adminList(req, res);
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- api/bookings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/bookings.ts api/bookings.test.ts
git commit -m "feat(bli141): admin GET bookings (серверное чтение для куратора)"
```

---

### Task 5: client createBooking → endpoint (remove local-first write)

**Files:**
- Modify: `src/services/booking.ts:124-155`

**Interfaces:**
- Consumes: `POST /api/bookings?op=create`.
- Produces: `createBooking({ request_id, nanny_entity_id, idempotency_key, date, amount? })` — возвращает `Booking` или **бросает** ошибку (нет ложного local success).

- [ ] **Step 1: Write failing test**

Создать `src/services/booking.test.ts` (если нет) с тестом: `createBooking` вызывает `/api/bookings?op=create` через authed fetch и возвращает booking; при non-2xx — бросает. Мокнуть fetch/authedFetch-хелпер репозитория (проверить, как booking.ts делает authed-запросы — вероятно через `supabase.auth.getSession()` + fetch; согласовать с существующим паттерном сервисов).

```ts
// src/services/booking.test.ts (скелет — согласовать с реальным authed-fetch хелпером)
import { describe, it, expect, vi } from 'vitest';
// mock fetch to return 201 { booking }
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- src/services/booking.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite createBooking**

Заменить тело `createBooking` (booking.ts:124-155): убрать `upsertLocalBookings`/`markPendingBooking`/`remoteSaveBooking`; сделать authed POST на `/api/bookings?op=create`; при `res.ok` вернуть `body.booking`; иначе `throw new Error(body.error || 'create failed')`. `trackBookingCreated` вызывать ТОЛЬКО после успешного ответа. Клиент генерирует `idempotency_key = crypto.randomUUID()`. Сигнатура меняется: принимает `request_id`, `nanny_entity_id`, `date`, `amount?` (без `parent_id`/`nanny_id`).

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/services/booking.test.ts && npm run build`
Expected: PASS + типы сходятся (сигнатура обновлена у всех вызывающих — см. Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/services/booking.ts src/services/booking.test.ts
git commit -m "feat(bli141): client createBooking -> server endpoint (истинный success, без local-first write)"
```

---

### Task 6: AdminCuratorTab.handleAssign → new contract

**Files:**
- Modify: `src/components/admin/AdminCuratorTab.tsx:82-110`

**Interfaces:**
- Consumes: обновлённый `createBooking`.

- [ ] **Step 1: Write failing test**

Тест компонента (или юнит на handleAssign-логику): при назначении вызывается `createBooking` с `request_id = selectedParent.id`, `nanny_entity_id = nanny.id`, `idempotency_key` (uuid), БЕЗ `parent_id`/`nanny_id`. При ошибке — `reportError`, без ложного success.

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- src/components/admin`
Expected: FAIL (handleAssign всё ещё шлёт старый контракт с `?? id`).

- [ ] **Step 3: Rewrite handleAssign**

Заменить `AdminCuratorTab.tsx:92-98`:

```tsx
await createBooking({
  request_id: selectedParent.id,
  nanny_entity_id: nanny.id,
  idempotency_key: crypto.randomUUID(),
  date: new Date().toISOString().slice(0, 10),
});
```

Убрать fallback `?? id` полностью. `reportSuccess` только в try после await; `catch` → `reportError('Не удалось создать бронирование.')` (уже есть). idempotency_key генерить один раз на попытку назначения (не на ретрай — но повтор той же кнопки создаст новый key; серверная pair-cardinality не даст дубль активной пары → 409 → reportError, приемлемо).

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/components/admin && npm run lint && npm run build`
Expected: PASS + lint + build чисто.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminCuratorTab.tsx
git commit -m "feat(bli141): handleAssign шлёт request_id+nanny_entity_id+idempotency_key (без entity-id fallback)"
```

---

## Postconditions (Плана B)

- `api/bookings.ts`: create (провенанс+idempotency+deletion-guard+pair-cardinality), status (actor state-machine, optimistic), admin GET.
- Клиентский `createBooking`/`handleAssign` шлют entity-id + idempotency_key; сервер выводит auth-uid; нет `?? id` fallback; нет ложного local success.
- Local-first **write**-path удалён из `createBooking`.

## Out of scope (следующие планы)

- План C: `updateBookingStatus` клиента → status endpoint; delete-account lifecycle + reconciler; удаление local **readers**/pending-merge (§7).
- План D: booking_confirmations server-authoritative + recipient authz.
- План E: contract-lockdown — active-CHECK, self-booking CHECK, `date` NOT-NULL-для-активных, partial unique pair-index `bookings_active_pair_uq`, RLS-split bookings, backfill idempotency_key, `SET NOT NULL`, REVOKE. amount типизация (numeric).
- Интеграционный тест реальной формы 23505 от Supabase/PostgREST (если endpoint пойдёт через PostgREST, а не pg) — здесь endpoint использует **pg pool напрямую**, поэтому `e.code`/`e.constraint` доступны структурно (node-postgres). Подтвердить на локальном прогоне.
