# BLI-141 План B — Server-authoritative endpoints Implementation Plan (rev 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести создание и смену статуса booking на сервер (service-role, транзакционно): сервер выводит auth-uid сторон из `parents`/`nannies`, применяет eligibility + idempotency + deletion-guard + pair-cardinality, возвращает реальный результат; клиент перестаёт писать local-first / напрямую в PostgREST.

**Architecture:** Новый Vercel-эндпоинт `api/bookings.ts` (POST `op=create` — куратор; POST `op=status` — участник/куратор; GET — admin-чтение). Логика в pg-транзакции через `getDbPool().connect()` (паттерн `api/auth/delete-account.ts`). Клиент (`src/services/booking.ts`, `AdminCuratorTab.tsx`) вызывает endpoint authed-fetch (bearer сессии, паттерн `src/services/adminApi.ts`) и показывает истинный success/ошибку; local-first / прямой `supabase.from('bookings')` write-path удаляется.

**Tech Stack:** Vercel serverless (`@vercel/node`), `pg` pool, Supabase Auth (`verifyBearerAdmin`/`verifyBearerUser`), Node `crypto` (fingerprint + stable key), Vitest (unit mock + PG-backed integration).

## Global Constraints

- Дизайн-источник: `docs/superpowers/specs/2026-06-30-bli141-booking-integrity-lifecycle-epic-design.md` (ред. 3), §3/§4/§5/§10. Foundation-схема — План A (применён): `bookings.idempotency_key` (UNIQUE `bookings_idempotency_key_key`), `idempotency_fingerprint`, `nanny_profile_id`, `account_deletions` (RLS+REVOKE, service-only).
- Идентичность: клиент шлёт `request_id` (=`parents.id`, TEXT) + `nanny_entity_id` (=`nannies.id`, TEXT) + `idempotency_key` (клиент-UUID, см. C3); сервер выводит `parent_id=parents.user_id`, `nanny_id=nannies.user_id`. **Клиент НЕ шлёт auth-uid; нет fallback `?? id`.** Схема (`00000000000000_remote_schema.sql`): `parents(id text, payload jsonb, user_id uuid NOT NULL default auth.uid())`, `nannies` симметрично.

- **C0 — Плана B НЕ деплоится в прод отдельно (rollout-секвенс, Codex P1 #2).** До Плана E политика `bookings_participant` (ALL) и `GRANT ALL … authenticated` на `bookings` сохраняются → клиент физически может писать в `bookings` напрямую через PostgREST в обход всех инвариантов эндпойнта (провенанс, eligibility, idempotency, cardinality). Поэтому:
  - Плана B код (endpoint + клиентский switch) лендится и тестируется на **preview/staging**, а прод-включение стоит за фиче-флагом `BOOKINGS_ENDPOINT_ENABLED` (C9, default-closed → прод-endpoint 404 пока флаг не задан).
  - **Прод-cutover бандлит одним контролируемым релизом (§10):** (a) deploy `api/bookings.ts` (create+status+GET); (b) удаление **ВСЕХ** клиентских прямых writer'ов — не только create: `createBooking` (План B) **И** `updateBookingStatus` (План C) с его consumers `AdminPanel.tsx:338`, `BookingsTab.tsx:152`, `AdminPage.tsx:348`. Пока хоть один пишет через PostgREST, E-REVOKE его сломает (Codex round2 P1); (c) Плана E lockdown — RLS-split `bookings` + REVOKE write у `authenticated` + `bookings_active_pair_uq`; (d) lifecycle C — `account_deletions` наполняется (иначе deletion-guard спит, см. C4). **Порядок:** c (REVOKE) не выкатывается раньше b (все writer'ы сняты) — иначе прод-регрессия.
  - Это уточнение **порядка выката**, не переписывание архитектуры. A–E остаются implementation-юнитами; прод-безопасность даёт только их бандл.

- **C1 — Секвенс cardinality.** partial unique `bookings_active_pair_uq` создаётся в Плане E, НЕ в A. Поэтому в B cardinality пары — **app-level SELECT** после `FOR UPDATE` на строках parents/nannies (сериализует конкурентные create той же пары в рамках одной БД-транзакции); DB-индекс в E — defense-in-depth. Idempotency-key-уникальность DB-enforced уже (План A).
- **C2 — Eligibility как явный DB-контракт (Codex P1 #4).** `parents.status = payload->>'status'` (jsonb; индекс `idx_parents_status`). Server-authoritative eligible-предикат (буквально):

  ```sql
  payload->>'status' IS NULL
  OR payload->>'status' IN ('new', 'in_review')
  ```

  Всё остальное — не eligible: `approved`, `rejected`, **любое неизвестное значение** (`whitelist`, не blacklist) → **409 not eligible**. Зеркало клиентского `actionableParents` (`AdminCuratorTab.tsx:55`), но enforced на сервере (не полагаемся на клиентский фильтр). Обязательные тест-кейсы: `new`/`in_review`/отсутствует → eligible; `approved`/`rejected`/неизвестное → 409.
- **C3 — Idempotency-key = клиент-UUID на один intent (Codex round1 #5 + round2 §147).** Ключ — **глобально уникальный UUID** (`crypto.randomUUID()`), сгенерированный **один раз на один intent** (одно логическое действие пользователя — один клик «Назначить») и **переиспользуемый во ВСЕХ транспортных ретраях этого же intent** (сеть/таймаут отвалились → повтор с ТЕМ ЖЕ ключом → 200 replay). **НЕ новый UUID на каждую сетевую попытку** (иначе идемпотентность теряется) и **НЕ детерминированный hash** от `(request_id,nanny_entity_id,date)` (тот превращал бы токен в бизнес-дедуп: повтор пары после `cancelled`/`completed` вечно replay-ил бы старую строку, смена `amount` — вечный 409, Codex round2 P1). **Новый intent** (осознанное новое действие пользователя) = новый UUID. Бизнес-дедуп «одна активная бронь на пару» — отдельная забота **pair-cardinality** (C1), НЕ ключа. Fingerprint (server-side) отделяет legit-replay (тот же ключ+payload → 200) от reuse-конфликта (тот же ключ, иной payload → 409).
  - **Bounded/best-effort replay (Опция B, Codex round3 P1).** Гарантия replay ограничена **временем жизни строки `bookings`**. Lifecycle (§6 дизайна) **удаляет** unpaid-pending при удалении аккаунта → после lifecycle-delete replay **НЕ гарантируется** (строка-evidence исчезла). Это приемлемо: intent-ретраи происходят за секунды, а удаление аккаунта — редкое осознанное событие (минуты+); окно коллизии пренебрежимо. Отдельное durable idempotency-хранилище НЕ вводится (было бы само 152-ФЗ-объектом; YAGNI). Бизнес-дубли (новый intent после delete) ловит pair-cardinality, не ключ.
  - Реализация в клиенте: UUID генерится один раз в `handleAssign` (один intent) и передаётся в `createBooking`; любые автоматические транспортные ретраи внутри вызова переиспользуют его. Повторный клик пользователя = новый intent = новый UUID → упрётся в pair-cardinality (409, если активная пара уже есть), дубля не будет.
- **C4 — Deletion-guard семантика (Codex P1 #3).** Отвергаем create если существует **любая** строка `account_deletions` для parent_id ИЛИ nanny_id — **включая state='deleted'** (полностью удалённый аккаунт не должен получать новую бронь; `state<>'deleted'` из rev 1 был багом — пропускал удалённых). Guard **дремлет** пока lifecycle C не наполнит таблицу; в cutover C предшествует включению create (C0.d).
- Существующий CHECK `bookings_status_check` = pending/confirmed/active/completed/cancelled — НЕ трогаем (active-CHECK/self-booking — План E).
- Транзакции: `pool.connect()` → `BEGIN`/`COMMIT`/`ROLLBACK`, `client.release()` в `finally`. Reread при idempotency-гонке — через **тот же `client.query`** после `ROLLBACK` (не новый pool-query).
- Ошибки логировать через `logError` (`api/_logScrub.ts`), не светить ПДн. `setCors` на каждом хендлере.
- **C5 — Rate-limit actor-scoped (Codex P2 #8).** После auth: `rateLimit(req, { prefix: '<op>:'+actorId, max, windowMs })` — ключ становится `<op>:<actorId>:<ip>`, лимит по актору+IP, не только по IP. create: max 10/мин; status: 30/мин; общий IP-гейт в handler остаётся как первый барьер.
- **C9 — Default-closed feature-gate (Codex round3 P1).** Технический механизм запрета прод-активации до cutover: handler в самом начале (после CORS/OPTIONS) возвращает **404**, если `process.env.BOOKINGS_ENDPOINT_ENABLED !== 'true'`. Прод: переменная **не задана** до атомарного cutover (C0) → endpoint мёртв даже если код задеплоен обычным релизом. Preview/staging: `=true`. Документировать в `.env.example`. Тест: без флага → 404, `connect` не вызывается.
- State-machine actor (owner-решение): `confirmed→active` и `active→completed` двигает **няня** (auth-uid=nanny_id) или куратор. Матрица §5. Переход вне матрицы → 403; stale/невалидный from → 409.
- **C7 — Status optimistic concurrency c `expected_status` (Codex round2 P1, дизайн §174).** Тело status-эндпойнта = `{ booking_id, expected_status, to_status }`. Порядок: (1) actor-роль допустима для перехода по матрице? нет → **403** (transition-outside-matrix); (2) `expected_status` — валидный `from` для `to_status`? нет → **400**; (3) `UPDATE … WHERE id=? AND status=$expected_status RETURNING *`; 0 строк → **409** (stale: реальное состояние ≠ ожидаемого клиентом). Так `403` (нет права/переход невозможен) и `409` (устаревшее чтение) семантически разделены; клиент не может применить действие из устаревшего UI к более новому состоянию.
- **C8 — Строгая валидация + канонизация входа (Codex round2 P2 + round3 P2).** ДО транзакции: `date` строго `YYYY-MM-DD` + реальная календарная дата (отсекает `2026-02-31`); `idempotency_key` — UUID (regex); `request_id`/`nanny_entity_id` — лимит длины (≤128). `amount`: **present-but-not-string → 400** (не молча `undefined`); string проходит `^\d{1,9}(\.\d{1,2})?$`, затем **канонизируется в фикс. `NNNN.NN`** (§4: `1`/`1.0`/`1.00` → один `1.00`) — единый канон для `INSERT` И fingerprint (пока TEXT; numeric-тип — План E). Любой невалид → **400** ДО транзакции (`new Date` не бросает внутри). Тесты malformed: битая дата, не-UUID ключ, overflow-amount, non-string amount; тест-эквивалентность: `1` и `1.00` → тот же fingerprint (replay).
- **C6 — Тесты двухуровневые (Codex P2 #6/#7).** (1) Unit: Vitest mock (`_cors`/`_rate-limit`/`_auth`/`_db`, `createMockResponse`) — покрывают ветвление и **точные коды** (assert `expected_status` на каждую ветку). (2) Integration (Task 7): против **реального локального PG** (Supabase Docker-стек PoC / `INTEGRATION_PG_URL`) — реальный INSERT, реальный `23505` на `bookings_idempotency_key_key`, реальная `FOR UPDATE`-сериализация; `describe.skipIf(!process.env.INTEGRATION_PG_URL)`. Русский в артефактах; идентификаторы английские.
- Команды: `npm test -- api/bookings.test.ts`, `INTEGRATION_PG_URL=… npm test -- api/bookings.integration.test.ts`, `npm run lint`, `npm run build`.

---

## File Structure

- `api/bookings.ts` — `computeFingerprint`, provenance derivation, eligibility, deletion-guard, idempotency-first, pair-cardinality, INSERT; status actor state-machine; admin GET. Одна функция-хендлер, роутинг по `req.method` + `req.query.op`; default-closed gate (C9).
- `.env.example` — добавить `BOOKINGS_ENDPOINT_ENABLED` (default-closed, C9) с комментарием «preview/staging=true; прод — не задавать до cutover».
- `api/bookings.test.ts` — Vitest unit (mock).
- `api/bookings.integration.test.ts` — PG-backed integration (skipIf нет `INTEGRATION_PG_URL`).
- `src/services/booking.ts` — заменить `createBooking` на серверный вызов; удалить прямой `supabase.from('bookings')` write в create-path + local-first pending. `updateBookingStatus` client-switch — План C, НО его снятие входит в общий прод-cutover-бандл (C0). Local **readers**/pending-merge — План C (§7), здесь только create-writer.
- `src/components/admin/AdminCuratorTab.tsx` — `handleAssign` генерит `idempotency_key = crypto.randomUUID()` **один раз на intent** (C3), шлёт `request_id`+`nanny_entity_id`+`idempotency_key`; истинный результат.

---

### Task 1: fingerprint + create endpoint (provenance → eligibility → deletion-guard → idempotency-first → pair → insert)

**Files:**
- Create: `api/bookings.ts`
- Test: `api/bookings.test.ts`

**Interfaces:**
- Produces: `POST /api/bookings?op=create` (verifyBearerAdmin). Тело `{ request_id, nanny_entity_id, idempotency_key, date, amount? }`. Ответы: `201 {booking}` создано / `200 {booking}` idempotent-replay / `409 {error}` (not-eligible | deletion | пара | key-diff-payload) / `404` (нет parents/nannies) / `422` (нет auth-связи) / `400` (валидация) / `401`. `computeFingerprint` (не экспортируется).

**Порядок в транзакции (важен — фикс Codex round2 P1 #4: idempotency ПЕРЕД ВСЕМИ mutable-guards):**
```
BEGIN
0. валидация формата (date YYYY-MM-DD, длины ключа/entity-id, amount) → 400 (C8)
1. IDEMPOTENCY-FIRST: SELECT * FROM bookings WHERE idempotency_key=$1
     нашли + fp совпал → ROLLBACK, 200 replay   (guard-НЕЗАВИСИМО)
     нашли + fp иной   → ROLLBACK, 409
   ← замер ДО eligibility/deletion/parent-existence: успешный create с потерянным
     ответом должен реплеиться, даже если статус заявки/аккаунт изменились после.
2. SELECT user_id, (payload->>'status') AS status FROM parents WHERE id=$1 FOR UPDATE
   SELECT user_id FROM nannies WHERE id=$1 FOR UPDATE          → 404 если нет
3. parent_id/nanny_id NULL → 422
4. eligibility: status ∉ {NULL,'new','in_review'} → 409 (C2)
5. deletion-guard: любая строка account_deletions для [parent_id,nanny_id] → 409 (C4)
6. pair-cardinality: активная бронь пары есть → 409 (C1)
7. INSERT … ; на 23505/bookings_idempotency_key_key (гонка) → reread client.query → 200/409
COMMIT → 201
```
**Durability replay — bounded (Опция B, Codex round2 P1 #4 + round3 P1).** idempotency evidence — сама строка `bookings`; гарантия replay ограничена **временем её жизни**. Дизайн §6 **удаляет** unpaid-pending при удалении аккаунта (шаг 2) и обезличивает терминальные (шаг 4) → строка-evidence может исчезнуть. Поэтому replay гарантирован ТОЛЬКО пока строка существует (горизонт транспортного ретрая intent — секунды); **после lifecycle-delete replay НЕ гарантируется**. Это осознанно принято (C3): окно коллизии пренебрежимо (ретрай секунды vs удаление аккаунта — минуты, редко), бизнес-дубли ловит pair-cardinality. Отдельное durable idempotency-хранилище НЕ вводится (само стало бы 152-ФЗ-объектом; YAGNI). Прежняя посылка «lifecycle не DELETE-ит booking-строки» — **неверна** (противоречила §6), снята.

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
  request_id: 'req-1', nanny_entity_id: 'nanny-1',
  idempotency_key: '11111111-1111-4111-8111-111111111111', date: '2026-07-10',
};
const makeReq = (body: unknown) =>
  ({ method: 'POST', headers: {}, query: { op: 'create' }, body } as unknown as VercelRequest);

// C9: маршрут default-closed. Все функциональные тесты включают флаг; отдельный тест — на 404 без него.
beforeEach(() => { process.env.BOOKINGS_ENDPOINT_ENABLED = 'true'; });
afterEach(() => { delete process.env.BOOKINGS_ENDPOINT_ENABLED; });

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
    connect.mockResolvedValue(mockClient({
      'FROM parents': { rows: [{ user_id: 'parent-uid', status: 'new' }], rowCount: 1 },
      'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
      'FROM account_deletions': { rows: [], rowCount: 0 },
      'WHERE idempotency_key': { rows: [], rowCount: 0 },
      'FROM bookings WHERE parent_id': { rows: [], rowCount: 0 },
      'INSERT INTO bookings': { rows: [{ id: 'b1', parent_id: 'parent-uid', nanny_id: 'nanny-uid', status: 'pending' }], rowCount: 1 },
      BEGIN: { rows: [] }, COMMIT: { rows: [] }, ROLLBACK: { rows: [] },
    }));
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.booking.parent_id).toBe('parent-uid');
    expect(res.body.booking.nanny_id).toBe('nanny-uid');
  });

  // Eligibility DB-контракт (C2): whitelist. new/in_review/absent → eligible; всё иное → 409.
  it.each(['approved', 'rejected', 'archived' /* неизвестное значение */])(
    'rejects not-eligible parent status "%s" (409)', async (status) => {
      connect.mockResolvedValue(mockClient({
        'FROM parents': { rows: [{ user_id: 'parent-uid', status }], rowCount: 1 },
        'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
        BEGIN: { rows: [] }, ROLLBACK: { rows: [] },
      }));
      const res = createMockResponse();
      await handler(makeReq(baseBody), res);
      expect(res.statusCode).toBe(409);
      expect(String(res.body.error)).toMatch(/eligible/i);
    });

  it.each(['new', 'in_review', null /* статус отсутствует */])(
    'allows eligible parent status "%s" → proceeds to insert (201)', async (status) => {
      connect.mockResolvedValue(mockClient({
        'FROM parents': { rows: [{ user_id: 'parent-uid', status }], rowCount: 1 },
        'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
        'FROM account_deletions': { rows: [], rowCount: 0 },
        'WHERE idempotency_key': { rows: [], rowCount: 0 },
        'FROM bookings WHERE parent_id': { rows: [], rowCount: 0 },
        'INSERT INTO bookings': { rows: [{ id: 'b1', parent_id: 'parent-uid', nanny_id: 'nanny-uid', status: 'pending' }], rowCount: 1 },
        BEGIN: { rows: [] }, COMMIT: { rows: [] }, ROLLBACK: { rows: [] },
      }));
      const res = createMockResponse();
      await handler(makeReq(baseBody), res);
      expect(res.statusCode).toBe(201);
    });

  it('rejects when a party is under account deletion (409)', async () => {
    connect.mockResolvedValue(mockClient({
      'FROM parents': { rows: [{ user_id: 'parent-uid', status: 'new' }], rowCount: 1 },
      'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
      'FROM account_deletions': { rows: [{ '?column?': 1 }], rowCount: 1 },
      BEGIN: { rows: [] }, ROLLBACK: { rows: [] },
    }));
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(409);
    expect(String(res.body.error)).toMatch(/delet/i);
  });

  it('404 when request or nanny missing', async () => {
    connect.mockResolvedValue(mockClient({
      'FROM parents': { rows: [], rowCount: 0 },
      'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
      BEGIN: { rows: [] }, ROLLBACK: { rows: [] },
    }));
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(404);
  });

  it('422 when a party has no auth account', async () => {
    connect.mockResolvedValue(mockClient({
      'FROM parents': { rows: [{ user_id: null, status: 'new' }], rowCount: 1 },
      'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
      BEGIN: { rows: [] }, ROLLBACK: { rows: [] },
    }));
    const res = createMockResponse();
    await handler(makeReq(baseBody), res);
    expect(res.statusCode).toBe(422);
  });

  it('400 on missing fields', async () => {
    const res = createMockResponse();
    await handler(makeReq({ request_id: '', nanny_entity_id: '', idempotency_key: '', date: '' }), res);
    expect(res.statusCode).toBe(400);
  });

  // C8 malformed input → 400 ДО транзакции (connect не должен вызываться)
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api/bookings.test.ts`
Expected: FAIL — `Cannot find module './bookings'`.

- [ ] **Step 3: Write the create endpoint**

```ts
// api/bookings.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { setCors } from './_cors.js';
import { rateLimit } from './_rate-limit.js';
import { verifyBearerAdmin, verifyBearerUser } from './_auth.js';
import { getDbPool } from './_db.js';
import { logError } from './_logScrub.js';

const json = (res: VercelResponse, status: number, payload: unknown) => res.status(status).json(payload);

const ACTIVE = ['pending', 'confirmed', 'active'];
const ELIGIBLE_PARENT_STATUS = new Set(['new', 'in_review']); // NULL тоже eligible (C2)

// Валидация входа (C8, Codex round2 P2). Строгие форматы ДО любого парсинга/транзакции.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;                 // строго YYYY-MM-DD
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AMOUNT_RE = /^\d{1,9}(\.\d{1,2})?$/;             // допустимый ввод (amount пока TEXT; numeric — План E)
function isValidCalendarDate(d: string): boolean {
  if (!DATE_RE.test(d)) return false;
  const dt = new Date(d + 'T00:00:00.000Z');
  return !Number.isNaN(dt.getTime()) && dt.toISOString().slice(0, 10) === d; // отсекает 2026-02-31
}
// Канон amount → фикс. decimal NNNN.NN (§4): '1'/'1.0'/'1.00' → одинаковый '1.00'.
// Вход уже прошёл AMOUNT_RE. Возвращает строку; используется И для INSERT, И для fingerprint.
function canonicalizeAmount(raw: string): string {
  const [int, frac = ''] = raw.split('.');
  return `${int}.${(frac + '00').slice(0, 2)}`;
}

// Canonical fingerprint (§4): sha256:v1 над нормализованными полями интента + amount.
// date уже провалидирован (YYYY-MM-DD); amount уже канонизирован (NNNN.NN) или absent → без throw.
function computeFingerprint(input: {
  request_id: string; nanny_entity_id: string; date: string; amount?: string;
}): string {
  const amount = input.amount == null ? '\0' : input.amount; // canonicalizeAmount уже применён вызывающим
  const canon = [input.request_id, input.nanny_entity_id, input.date, amount].join('\x1f');
  return 'sha256:v1:' + createHash('sha256').update(canon, 'utf8').digest('hex');
}

async function createBooking(req: VercelRequest, res: VercelResponse) {
  const admin = await verifyBearerAdmin(req);
  if (!admin) return json(res, 401, { error: 'Unauthorized' });
  const rl = rateLimit(req, { prefix: 'bookings-create:' + admin.id, max: 10, windowMs: 60_000 });
  if (!rl.ok) return json(res, 429, { error: 'Too many requests' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const s = (k: string) => (typeof body[k] === 'string' ? (body[k] as string).trim() : '');
  const request_id = s('request_id');
  const nanny_entity_id = s('nanny_entity_id');
  const idempotency_key = s('idempotency_key');
  const date = s('date');
  // C8: строгая валидация форматов ДО транзакции (иначе new Date мог бы бросить).
  if (!request_id || !nanny_entity_id || !idempotency_key || !date) {
    return json(res, 400, { error: 'request_id, nanny_entity_id, idempotency_key, date required' });
  }
  if (!UUID_RE.test(idempotency_key)) return json(res, 400, { error: 'idempotency_key must be a UUID' });
  if (!isValidCalendarDate(date)) return json(res, 400, { error: 'date must be a valid YYYY-MM-DD' });
  if (request_id.length > 128 || nanny_entity_id.length > 128) return json(res, 400, { error: 'id too long' });
  // amount: present-but-not-string → 400 (не молча undefined); string → validate → canon NNNN.NN.
  let amount: string | undefined;
  if (body.amount != null) {
    if (typeof body.amount !== 'string' || !AMOUNT_RE.test(body.amount.trim())) {
      return json(res, 400, { error: 'amount must be a decimal string' });
    }
    amount = canonicalizeAmount(body.amount.trim()); // единый wire-канон для INSERT и fingerprint
  }

  const fingerprint = computeFingerprint({ request_id, nanny_entity_id, date, amount });
  const client = await getDbPool().connect();
  try {
    await client.query('BEGIN');
    // 1. IDEMPOTENCY-FIRST (Codex round2 P1 #4): проверить ключ ДО всех mutable-guards,
    //    чтобы replay был guard-независим (статус заявки/аккаунт мог измениться).
    const existing = await client.query(
      'SELECT * FROM bookings WHERE idempotency_key = $1', [idempotency_key]);
    if (existing.rowCount && existing.rowCount > 0) {
      const row = existing.rows[0];
      await client.query('ROLLBACK'); // read-only ветка
      if (row.idempotency_fingerprint === fingerprint) return json(res, 200, { booking: row });
      return json(res, 409, { error: 'idempotency key reused with different payload' });
    }
    // 2. lock+load parent(+status) и nanny (сериализует create пары под FOR UPDATE)
    const p = await client.query(
      `SELECT user_id, payload->>'status' AS status FROM parents WHERE id = $1 FOR UPDATE`, [request_id]);
    const n = await client.query('SELECT user_id FROM nannies WHERE id = $1 FOR UPDATE', [nanny_entity_id]);
    if (p.rowCount === 0 || n.rowCount === 0) {
      await client.query('ROLLBACK');
      return json(res, 404, { error: 'request or nanny not found' });
    }
    const parent_id = p.rows[0].user_id as string | null;
    const nanny_id = n.rows[0].user_id as string | null;
    const parentStatus = p.rows[0].status as string | null;
    // 3. auth-связь
    if (!parent_id || !nanny_id) {
      await client.query('ROLLBACK');
      return json(res, 422, { error: 'both parties must have auth accounts' });
    }
    // 4. eligibility (C2): NULL или new/in_review
    if (parentStatus != null && !ELIGIBLE_PARENT_STATUS.has(parentStatus)) {
      await client.query('ROLLBACK');
      return json(res, 409, { error: 'request is not eligible for booking' });
    }
    // 5. deletion-guard (C4): любая строка на любую сторону (в т.ч. state='deleted')
    const del = await client.query(
      `SELECT 1 FROM account_deletions WHERE user_id = ANY($1::uuid[]) LIMIT 1`, [[parent_id, nanny_id]]);
    if (del.rowCount && del.rowCount > 0) {
      await client.query('ROLLBACK');
      return json(res, 409, { error: 'a party account is being deleted' });
    }
    // 6. app-level cardinality (pair index — План E)
    const pair = await client.query(
      `SELECT id FROM bookings WHERE parent_id = $1 AND nanny_id = $2 AND status = ANY($3) LIMIT 1`,
      [parent_id, nanny_id, ACTIVE]);
    if (pair.rowCount && pair.rowCount > 0) {
      await client.query('ROLLBACK');
      return json(res, 409, { error: 'active booking for this pair already exists' });
    }
    // 7. insert; гонка на idempotency_key → reread ТЕМ ЖЕ client после ROLLBACK
    try {
      const ins = await client.query(
        `INSERT INTO bookings (parent_id, nanny_id, request_id, nanny_profile_id, date, amount,
                               status, idempotency_key, idempotency_fingerprint)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8) RETURNING *`,
        [parent_id, nanny_id, request_id, nanny_entity_id, date, amount ?? null, idempotency_key, fingerprint]);
      await client.query('COMMIT');
      return json(res, 201, { booking: ins.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      const err = e as { code?: string; constraint?: string };
      if (err?.code === '23505' && err?.constraint === 'bookings_idempotency_key_key') {
        const ex = await client.query('SELECT * FROM bookings WHERE idempotency_key = $1', [idempotency_key]);
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
  // C9 default-closed gate: маршрут неактивен, пока env не включён явно.
  // Прод остаётся закрыт до атомарного cutover (C0); preview/staging: BOOKINGS_ENDPOINT_ENABLED=true.
  if (process.env.BOOKINGS_ENDPOINT_ENABLED !== 'true') return json(res, 404, { error: 'Not found' });
  // Первый барьер — по IP (до auth). Actor-scoped лимит — внутри операций (C5).
  const rl = rateLimit(req, { max: 60, windowMs: 60_000, prefix: 'bookings-ip' });
  if (!rl.ok) return json(res, 429, { error: 'Too many requests' });

  const op = String((req.query as Record<string, unknown>)?.op || '');
  if (req.method === 'POST' && op === 'create') return createBooking(req, res);
  // op=status (Task 3), GET (Task 4) добавляются в свои задачи.
  return json(res, 405, { error: 'Method not allowed' });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api/bookings.test.ts`
Expected: PASS (все 6 веток, точные коды).

- [ ] **Step 5: Документировать флаг + Commit**

Добавить в `.env.example` строку `BOOKINGS_ENDPOINT_ENABLED=` (пусто = default-closed;
коммент: preview/staging `true`, прод не задавать до cutover, C9).

```bash
git add api/bookings.ts api/bookings.test.ts .env.example
git commit -m "feat(bli141): create booking endpoint — provenance, eligibility, deletion-guard, idempotency-first, pair-cardinality + default-closed gate"
```

---

### Task 2: idempotency replay/conflict tests (mock)

**Files:**
- Modify: `api/bookings.test.ts`

**Interfaces:** Consumes `handler` из Task 1.

- [ ] **Step 1: Write failing tests (replay + conflict + pair)**

Три теста внутри `describe('POST create')`. Для (a)/(b) реальный `computeFingerprint` вычисляется в самом endpoint из `baseBody`; чтобы `existing`-строка совпала/разошлась по fp, мок `WHERE idempotency_key` возвращает строку с нужным `idempotency_fingerprint`. Считаем ожидаемый fp тем же алгоритмом в тест-хелпере (скопировать формулу — endpoint не экспортирует функцию).

```ts
import { createHash } from 'node:crypto';
function canonAmt(raw: string) { const [i, f = ''] = raw.split('.'); return `${i}.${(f + '00').slice(0, 2)}`; }
function fpOf(b: { request_id: string; nanny_entity_id: string; date: string; amount?: string }) {
  const amount = b.amount == null ? '\0' : canonAmt(b.amount.trim()); // канон NNNN.NN как в endpoint
  const canon = [b.request_id, b.nanny_entity_id, b.date, amount].join('\x1f'); // date уже YYYY-MM-DD
  return 'sha256:v1:' + createHash('sha256').update(canon, 'utf8').digest('hex');
}

it('same-key same-payload replay → 200 existing row', async () => {
  const fp = fpOf(baseBody);
  connect.mockResolvedValue(mockClient({
    'FROM parents': { rows: [{ user_id: 'parent-uid', status: 'new' }], rowCount: 1 },
    'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
    'FROM account_deletions': { rows: [], rowCount: 0 },
    'WHERE idempotency_key': { rows: [{ id: 'b1', idempotency_fingerprint: fp }], rowCount: 1 },
    BEGIN: { rows: [] }, ROLLBACK: { rows: [] },
  }));
  const res = createMockResponse();
  await handler(makeReq(baseBody), res);
  expect(res.statusCode).toBe(200);
  expect(res.body.booking.id).toBe('b1');
});

it('same-key different-payload → 409', async () => {
  connect.mockResolvedValue(mockClient({
    'FROM parents': { rows: [{ user_id: 'parent-uid', status: 'new' }], rowCount: 1 },
    'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
    'FROM account_deletions': { rows: [], rowCount: 0 },
    'WHERE idempotency_key': { rows: [{ id: 'b1', idempotency_fingerprint: 'sha256:v1:OTHER' }], rowCount: 1 },
    BEGIN: { rows: [] }, ROLLBACK: { rows: [] },
  }));
  const res = createMockResponse();
  await handler(makeReq(baseBody), res);
  expect(res.statusCode).toBe(409);
  expect(String(res.body.error)).toMatch(/different payload/i);
});

it('active pair exists (new key) → 409', async () => {
  connect.mockResolvedValue(mockClient({
    'FROM parents': { rows: [{ user_id: 'parent-uid', status: 'new' }], rowCount: 1 },
    'FROM nannies': { rows: [{ user_id: 'nanny-uid' }], rowCount: 1 },
    'FROM account_deletions': { rows: [], rowCount: 0 },
    'WHERE idempotency_key': { rows: [], rowCount: 0 },
    'FROM bookings WHERE parent_id': { rows: [{ id: 'old' }], rowCount: 1 },
    BEGIN: { rows: [] }, ROLLBACK: { rows: [] },
  }));
  const res = createMockResponse();
  await handler(makeReq(baseBody), res);
  expect(res.statusCode).toBe(409);
  expect(String(res.body.error)).toMatch(/pair/i);
});
```

- [ ] **Step 2: Run to verify they fail → then pass**

Run: `npm test -- api/bookings.test.ts`
Expected: три ветки зелёные (логика в Task 1). Если реальный порядок SQL-подстрок конфликтует (напр. `FROM bookings WHERE parent_id` совпадает и с idempotency SELECT) — уточнить подстроки-ключи так, чтобы каждая ветка сопоставлялась однозначно.

- [ ] **Step 3: Commit**

```bash
git add api/bookings.test.ts
git commit -m "test(bli141): idempotency replay/conflict + pair-cardinality (idempotency-first order)"
```

---

### Task 3: status endpoint (actor state-machine)

**Files:** Modify `api/bookings.ts`, `api/bookings.test.ts`.

**Interfaces:**
- Produces: `POST /api/bookings?op=status` тело `{ booking_id, expected_status, to_status }` (C7). verifyBearerUser (участник) ИЛИ verifyBearerAdmin. Порядок: presence-400 → auth-401 → load booking-404 → role-403 → matrix `expected_status ∈ from(to_status)`-400 → optimistic `UPDATE … WHERE id=? AND status=$expected_status`-иначе-409(stale). Ответы `200 {booking}` / `403` (роль/матрица) / `409` (stale) / `404` / `400` / `401`.

- [ ] **Step 1: Write failing tests**

```ts
describe('POST /api/bookings?op=status', () => {
  const statusReq = (body: unknown) =>
    ({ method: 'POST', headers: {}, query: { op: 'status' }, body } as unknown as VercelRequest);

  it('nanny moves confirmed → active (200)', async () => {
    const { verifyBearerAdmin, verifyBearerUser } = await import('./_auth.js');
    (verifyBearerAdmin as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(null);
    (verifyBearerUser as unknown as { mockResolvedValueOnce: (v: unknown) => void })
      .mockResolvedValueOnce({ id: 'nanny-uid', email: 'n@x' });
    connect.mockResolvedValue(mockClient({
      'FROM bookings WHERE id': { rows: [{ id: 'b1', parent_id: 'p', nanny_id: 'nanny-uid', status: 'confirmed' }], rowCount: 1 },
      'UPDATE bookings SET status': { rows: [{ id: 'b1', status: 'active' }], rowCount: 1 },
      BEGIN: { rows: [] }, COMMIT: { rows: [] }, ROLLBACK: { rows: [] },
    }));
    const res = createMockResponse();
    await handler(statusReq({ booking_id: 'b1', expected_status: 'confirmed', to_status: 'active' }), res);
    expect(res.statusCode).toBe(200);
  });

  it('parent cannot move confirmed → active (403)', async () => {
    const { verifyBearerAdmin, verifyBearerUser } = await import('./_auth.js');
    (verifyBearerAdmin as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(null);
    (verifyBearerUser as unknown as { mockResolvedValueOnce: (v: unknown) => void })
      .mockResolvedValueOnce({ id: 'parent-uid', email: 'p@x' });
    connect.mockResolvedValue(mockClient({
      'FROM bookings WHERE id': { rows: [{ id: 'b1', parent_id: 'parent-uid', nanny_id: 'n', status: 'confirmed' }], rowCount: 1 },
      BEGIN: { rows: [] }, ROLLBACK: { rows: [] },
    }));
    const res = createMockResponse();
    await handler(statusReq({ booking_id: 'b1', expected_status: 'confirmed', to_status: 'active' }), res);
    expect(res.statusCode).toBe(403);
  });

  it('stale expected_status → 409 (real status ≠ expected)', async () => {
    const { verifyBearerAdmin } = await import('./_auth.js');
    (verifyBearerAdmin as unknown as { mockResolvedValueOnce: (v: unknown) => void })
      .mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com' });
    connect.mockResolvedValue(mockClient({
      'FROM bookings WHERE id': { rows: [{ id: 'b1', parent_id: 'p', nanny_id: 'n', status: 'pending' }], rowCount: 1 },
      'UPDATE bookings SET status': { rows: [], rowCount: 0 }, // status != expected_status
      BEGIN: { rows: [] }, ROLLBACK: { rows: [] },
    }));
    const res = createMockResponse();
    // клиент думает 'confirmed', реально 'pending' → UPDATE 0 строк → 409
    await handler(statusReq({ booking_id: 'b1', expected_status: 'confirmed', to_status: 'active' }), res);
    expect(res.statusCode).toBe(409);
  });

  it('expected_status not a valid source for to_status → 400 (после load+role)', async () => {
    const { verifyBearerAdmin } = await import('./_auth.js');
    (verifyBearerAdmin as unknown as { mockResolvedValueOnce: (v: unknown) => void })
      .mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com' });
    connect.mockResolvedValue(mockClient({
      'FROM bookings WHERE id': { rows: [{ id: 'b1', parent_id: 'p', nanny_id: 'n', status: 'confirmed' }], rowCount: 1 },
      BEGIN: { rows: [] }, ROLLBACK: { rows: [] },
    }));
    const res = createMockResponse();
    // to_status='active' допускает from только 'confirmed'; expected 'pending' невозможен → 400 (после role)
    await handler(statusReq({ booking_id: 'b1', expected_status: 'pending', to_status: 'active' }), res);
    expect(res.statusCode).toBe(400);
  });
});
```
> Примечание: `_auth`-моки переопределяются per-test через `mockResolvedValueOnce` поверх дефолтов из `vi.mock`. Порядок вызовов в endpoint: сначала `verifyBearerAdmin`, затем (если null) `verifyBearerUser`.

- [ ] **Step 2: Run to verify fail** — `npm test -- api/bookings.test.ts` → FAIL (op=status → 405).

- [ ] **Step 3: Implement status endpoint**

```ts
// api/bookings.ts — добавить
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
  const actorId = admin ? admin.id : user!.id;
  const rl = rateLimit(req, { prefix: 'bookings-status:' + actorId, max: 30, windowMs: 60_000 });
  if (!rl.ok) return json(res, 429, { error: 'Too many requests' });

  const body = (req.body ?? {}) as Record<string, unknown>;
  const booking_id = typeof body.booking_id === 'string' ? body.booking_id.trim() : '';
  const to_status = typeof body.to_status === 'string' ? body.to_status.trim() : '';
  const expected_status = typeof body.expected_status === 'string' ? body.expected_status.trim() : '';
  const rule = TRANSITIONS[to_status];
  // Нормативный порядок (C7): presence-400 → auth(выше) → load booking(404) → role(403)
  //                          → matrix expected∈from(400) → optimistic update(409). Код=текст=тесты.
  if (!booking_id || !rule || !expected_status) {
    return json(res, 400, { error: 'booking_id, expected_status, valid to_status required' });
  }

  const client = await getDbPool().connect();
  try {
    await client.query('BEGIN');
    const b = await client.query(
      'SELECT id, parent_id, nanny_id, status FROM bookings WHERE id = $1 FOR UPDATE', [booking_id]);
    if (b.rowCount === 0) { await client.query('ROLLBACK'); return json(res, 404, { error: 'booking not found' }); }
    const row = b.rows[0];
    // (1) actor-роль: transition-outside-matrix → 403 (отделено от stale-409)
    const role: Role | null = admin ? 'curator'
      : user!.id === row.parent_id ? 'parent'
      : user!.id === row.nanny_id ? 'nanny' : null;
    if (!role || !rule.roles.includes(role)) {
      await client.query('ROLLBACK'); return json(res, 403, { error: 'actor not allowed for this transition' });
    }
    // (2) matrix: expected_status обязан быть допустимым from для to_status (после role, C7)
    if (!rule.from.includes(expected_status)) {
      await client.query('ROLLBACK'); return json(res, 400, { error: 'expected_status is not a valid source for to_status' });
    }
    // (3) optimistic: применяем только если реальный статус == expected_status клиента.
    const upd = await client.query(
      `UPDATE bookings SET status = $1 WHERE id = $2 AND status = $3 RETURNING *`,
      [to_status, booking_id, expected_status]);
    if (upd.rowCount === 0) {
      await client.query('ROLLBACK');
      return json(res, 409, { error: 'stale status: booking is not in expected_status' });
    }
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
И в `handler`: `if (req.method === 'POST' && op === 'status') return updateStatus(req, res);`

- [ ] **Step 4: Run to verify pass** — `npm test -- api/bookings.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add api/bookings.ts api/bookings.test.ts
git commit -m "feat(bli141): status endpoint — actor state-machine (няня вручную) + optimistic lock"
```

---

### Task 4: admin GET endpoint

**Files:** Modify `api/bookings.ts`, `api/bookings.test.ts`.

**Interfaces:** `GET /api/bookings` (verifyBearerAdmin) → `200 { bookings: [...] }`.

- [ ] **Step 1: Write failing test**

```ts
it('admin GET returns all bookings (200)', async () => {
  connect.mockResolvedValue(mockClient({
    'FROM bookings': { rows: [{ id: 'b1' }, { id: 'b2' }], rowCount: 2 },
  }));
  const req = { method: 'GET', headers: {}, query: {} } as unknown as VercelRequest;
  const res = createMockResponse();
  await handler(req, res);
  expect(res.statusCode).toBe(200);
  expect(res.body.bookings).toHaveLength(2);
});
```

- [ ] **Step 2: Run to verify fail** — GET → 405.

- [ ] **Step 3: Implement admin GET**

```ts
async function adminList(req: VercelRequest, res: VercelResponse) {
  const admin = await verifyBearerAdmin(req);
  if (!admin) return json(res, 401, { error: 'Unauthorized' });
  const rl = rateLimit(req, { prefix: 'bookings-list:' + admin.id, max: 60, windowMs: 60_000 });
  if (!rl.ok) return json(res, 429, { error: 'Too many requests' });
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
И в `handler`: `if (req.method === 'GET') return adminList(req, res);`

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit**

```bash
git add api/bookings.ts api/bookings.test.ts
git commit -m "feat(bli141): admin GET bookings (серверное чтение для куратора)"
```

---

### Task 5: client createBooking → endpoint (remove direct PostgREST write)

**Files:**
- Modify: `src/services/booking.ts` (create-path), `src/services/booking.test.ts`

**Interfaces:**
- Produces: `createBooking({ request_id, nanny_entity_id, idempotency_key, date, amount? })` — authed POST `/api/bookings?op=create`; возвращает `Booking` или **бросает** (нет ложного local success). `idempotency_key` — UUID, генерится **вызывающим** (Task 6, один раз на intent, C3); сервис его НЕ генерит и НЕ выводит из полей.

- [ ] **Step 1: booking.test.ts — createBooking через endpoint**

Мок `supabase.auth.getSession()` → `{ data: { session: { access_token: 'tok' } } }` и глобальный `fetch`. Проверить: (a) POST на `/api/bookings?op=create` с `Authorization: Bearer tok` и телом `{request_id,nanny_entity_id,idempotency_key,date}` (ключ — переданный вызывающим UUID, НЕ сгенерённый в сервисе); (b) 201 → возвращает `body.booking`; (c) non-2xx → бросает, `trackBookingCreated` НЕ вызывается. Согласовать URL-базу с существующим `adminApi.ts` (тот же helper построения authed-запроса, если есть — переиспользовать).

- [ ] **Step 2: Run to verify fail** — `npm test -- src/services/booking.test.ts` → FAIL.

- [ ] **Step 3: Rewrite createBooking**

Заменить тело `createBooking` (booking.ts:124-155):
- убрать `remoteSaveBooking`/`markPendingBooking`/local upsert из create-path;
- сигнатура: `{ request_id, nanny_entity_id, idempotency_key, date, amount? }` (без `parent_id`/`nanny_id`); `idempotency_key` приходит от вызывающего (C3);
- authed POST (bearer из `supabase.auth.getSession()`), паттерн `adminApi.ts`;
- `res.ok` → вернуть `body.booking`; иначе `throw new Error(body.error || 'create failed')`;
- `trackBookingCreated`/`recordMatchOutcome` — ТОЛЬКО после успешного ответа.

- [ ] **Step 4: Run to verify pass** — `npm test -- src/services/booking.test.ts && npm run build` → PASS (сигнатура обновлена у всех вызывающих — Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/services/booking.ts src/services/booking.test.ts
git commit -m "feat(bli141): client createBooking -> server endpoint (истинный success, без local-first write)"
```

---

### Task 6: AdminCuratorTab.handleAssign → new contract (stable key)

**Files:** Modify `src/components/admin/AdminCuratorTab.tsx:82-110`.

**Interfaces:** Consumes обновлённый `createBooking`.

- [ ] **Step 1: Failing test** — при назначении `createBooking` вызывается с `request_id = selectedParent.id`, `nanny_entity_id = nanny.id`, `idempotency_key` (UUID, сгенерён в handleAssign один раз), `date`, БЕЗ `parent_id`/`nanny_id`. При ошибке — `reportError`, без ложного success.

- [ ] **Step 2: Run to verify fail** — `npm test -- src/components/admin` → FAIL (старый контракт с `?? id`).

- [ ] **Step 3: Rewrite handleAssign**

Заменить `AdminCuratorTab.tsx:92-98`:
```tsx
const idempotency_key = crypto.randomUUID(); // один UUID на intent (C3)
await createBooking({
  request_id: selectedParent.id,
  nanny_entity_id: nanny.id,
  idempotency_key,
  date: new Date().toISOString().slice(0, 10),
});
```
Убрать fallback `?? id` полностью. `reportSuccess` только после await; `catch` → `reportError` (есть). Ключ — один UUID на intent (один клик = один intent, C3), переиспользуется во всех транспортных ретраях этого вызова (idempotency-replay 200). Новый клик = новый intent = новый UUID → защита от дублей — серверная `pair-cardinality` (двойной клик при активной паре → 409 → `reportError`, дубля нет).

- [ ] **Step 4: Run to verify pass** — `npm test -- src/components/admin && npm run lint && npm run build` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminCuratorTab.tsx
git commit -m "feat(bli141): handleAssign шлёт request_id+nanny_entity_id (стабильный ключ, без entity-id fallback)"
```

---

### Task 7: PG-backed integration tests (Codex P2 #7)

**Files:** Create `api/bookings.integration.test.ts`.

**Interfaces:** Прогон против реального PG (локальный Supabase Docker-стек / `INTEGRATION_PG_URL`). Проверяет то, что mock не может: реальный `23505` на `bookings_idempotency_key_key`, реальная `FOR UPDATE`-сериализация, реальный eligibility по `payload->>'status'`.

- [ ] **Step 1: Harness (DI-контракт, Codex round3 P2)**

`describe.skipIf(!process.env.INTEGRATION_PG_URL)`. Флаг `BOOKINGS_ENDPOINT_ENABLED='true'` в `beforeAll` (C9).
**DI зафиксирован однозначно:** `_cors`/`_rate-limit` мокнуты пропускающими, `_auth` мокнут (admin/участник). `_db` **мокнут так, чтобы `getDbPool()` возвращал ЕДИНЫЙ тестовый `pg.Pool` с `max>=2`**, подключённый к `INTEGRATION_PG_URL` (НЕ app-singleton `max:1` из `api/_db.ts:46` — он сериализует до row-lock). SQL реальный (PG исполняет всё). `beforeAll`: создать тестовый pool + fixture `parents(id,payload,user_id)` `payload='{"status":"new"}'`, `nannies(...)`. `afterAll`: DELETE fixture + `pool.end()`. Так «реальный PG» и «два одновременных соединения» непротиворечивы: один pool max≥2 отдаёт два `client` двум параллельным `handler`-вызовам.

- [ ] **Step 2: Cases**

1. create happy-path → 201, строка в `bookings` реально существует, `parent_id=parents.user_id`.
2. повтор с тем же `idempotency_key`+payload → 200, тот же `id` (реальный replay).
3. тот же ключ, иной `amount` → 409.
4. вторая пара (иной ключ) при активной первой → 409.
5. parent `payload.status='rejected'` → 409 (eligibility на реальном jsonb).
6. status: `UPDATE WHERE status=expected_status` реально пинит; expected≠real → 409 на живом PG.
7. **Concurrency (Codex round2 P2 #2 + round3/4 P2):** два create одной пары (разные ключи) → ровно один 201, второй 409. **Конкретный детерминированный barrier-рецепт** (не тайминги):

```ts
// L — отдельное соединение из тестового pool (max>=2), удерживает lock на parent:
const L = await pool.connect();
await L.query('BEGIN');
await L.query('SELECT id FROM parents WHERE id=$1 FOR UPDATE', [reqId]); // держит row-lock
// A и B стартуют, оба блокируются на шаге "lock parents FOR UPDATE" в handler:
const pA = handler(makeCreate(reqId, nannyId, uuidA), resA);
const pB = handler(makeCreate(reqId, nannyId, uuidB), resB);
await sleep(100);                       // дать A,B встать в очередь на lock (оба ждут L)
await L.query('ROLLBACK'); L.release(); // отпустить lock → A,B продолжают ПО ОЧЕРЕДИ
await Promise.all([pA, pB]);            // таймаут-гвард на дедлок
// первый захвативший lock → INSERT+COMMIT → 201; второй видит активную пару → 409:
const codes = [resA.statusCode, resB.statusCode].sort();
expect(codes).toEqual([201, 409]);
```
Assertion инвариантна к тому, кто выиграл гонку. Доказывает именно `FOR UPDATE`-сериализацию (L форсирует очередь на parent-row, pool `max>=2` не сериализует раньше). DI — из Step 1 (единый pool max≥2, не app-singleton).

- [ ] **Step 3: Run**

Run: `INTEGRATION_PG_URL=postgres://…local… npm test -- api/bookings.integration.test.ts`
Expected: PASS против локального PG. Без env — `skip` (CI не падает).

- [ ] **Step 4: Commit**

```bash
git add api/bookings.integration.test.ts
git commit -m "test(bli141): PG-backed integration — real 23505, FOR UPDATE serialization, jsonb eligibility"
```

---

## Postconditions (Плана B)

- `api/bookings.ts`: **default-closed gate (C9)** → create (валидация+канон C8 → **idempotency-first** до mutable-guards → провенанс → eligibility → deletion-guard → pair-cardinality → 23505-reread), status (actor state-machine + `expected_status` optimistic; порядок presence→role-403→matrix-400→stale-409), admin GET. Actor-scoped rate-limit (C5).
- Клиентский `createBooking`/`handleAssign` шлют entity-id + **UUID на intent** (переиспользуется в ретраях intent, не hash, не per-network-try); сервер выводит auth-uid; нет `?? id` fallback; нет ложного local success.
- Idempotency-replay **bounded** (Опция B): гарантирован пока строка жива; после lifecycle-delete — нет; бизнес-дубли ловит pair-cardinality. `amount` канонизируется в `NNNN.NN` (единый канон INSERT+fingerprint); non-string amount → 400.
- Прямой create-write в PostgREST удалён из `createBooking`. `updateBookingStatus`-writer снимается в Плане C и входит в прод-cutover-бандл (C0).
- Unit + PG-backed integration тесты; точные коды на каждую ветку; concurrency через два независимых соединения; malformed-валидация.

## Deploy gating (C0 — критично)

- **План B НЕ включается в проде сам по себе.** Прод-cutover = один бандл (§10): endpoint + удаление **всех** клиентских writer'ов (`createBooking` План B + `updateBookingStatus` План C: consumers `AdminPanel.tsx:338`, `BookingsTab.tsx:152`, `AdminPage.tsx:348`) + Плана E lockdown (RLS-split `bookings`, REVOKE write у `authenticated`, `bookings_active_pair_uq`) + lifecycle C (`account_deletions` наполнена). До бандла — только preview/staging + фиче-флаг.
- **Порядок в бандле:** сначала снять все клиентские writer'ы (create+status), только потом REVOKE write (E). Иначе REVOKE ломает ещё-живой клиентский PostgREST-путь (Codex round2 P1).
- Пока `bookings_participant` (ALL) + `GRANT ALL authenticated` живы, эндпойнт-инварианты (провенанс/eligibility/idempotency/cardinality/state-machine) обходятся прямым PostgREST-write; endpoint становится единственным путём только после E.

## Out of scope (следующие планы)

- План C: `updateBookingStatus` клиента → status endpoint (снятие всех status-writer'ов — `AdminPanel.tsx:338`/`BookingsTab.tsx:152`/`AdminPage.tsx:348` — **входит в прод-cutover-бандл B**, C0); `delete-account` lifecycle + `account_deletions` reconciler (наполняет таблицу → включает deletion-guard); удаление local **readers**/pending-merge (§7). **Durability idempotency — bounded (Опция B, Codex round3 P1):** lifecycle §6 удаляет unpaid-pending (шаг 2) / обезличивает терминальные (шаг 4); replay гарантирован лишь пока строка жива, после delete — нет. Никакого «не DELETE-ит» инварианта (противоречил бы §6/152-ФЗ). Отдельного durable-хранилища нет.
- План D: `booking_confirmations` server-authoritative + recipient authz (recipient_role/recipient_user_id из Плана A).
- План E (contract-lockdown, бандлится с прод-cutover B): active-CHECK, self-booking CHECK, `date` NOT-NULL-для-активных, `bookings_active_pair_uq`, RLS-split `bookings` + REVOKE write, backfill idempotency_key, `SET NOT NULL`, `amount` numeric-типизация, `booking_confirmations.recipient_role` CHECK/backfill.
