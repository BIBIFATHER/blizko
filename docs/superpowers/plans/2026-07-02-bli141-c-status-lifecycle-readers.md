# BLI-141 План C — Status wiring, readers cleanup, account-deletion lifecycle (BLI-139) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Завершить клиентский переход на server-authoritative bookings (переключить `updateBookingStatus`/readers на `api/bookings.ts`, удалить local-first слой — §7 дизайна) и переписать `delete-account.ts` (BLI-139, Urgent, живой 152-ФЗ баг: сейчас не трогает bookings → `DELETE auth.users` падает по FK у любого юзера с бронью) с единым lock-order C10 + `account_deletions` reconciler.

**Architecture:** `src/services/booking.ts` — статусы/чтения переключаются на уже реализованный `api/bookings.ts` (create/status/GET из Плана B, CONFIRMED); local-storage слой (pending-merge, cache) удаляется целиком. `api/auth/delete-account.ts` переписывается по SPEC §6 (rev после Codex round6-8): discover → lock own profile-строк (C10) → deletion-флаг → delete unpaid-pending bookings → cancel active → анонимизация → commit db_done → auth-delete → deleted/retry. Новый `api/cron/_reconcile-account-deletions.ts` (паттерн `_ghosted-outcomes.ts`) добивает зависшие `db_done` через lease/attempts.

**Tech Stack:** Vercel serverless (`@vercel/node`), `pg` pool, Supabase Auth, Vitest, `pg` (integration).

## Global Constraints

- Design-источник: `docs/superpowers/specs/2026-06-30-bli141-booking-integrity-lifecycle-epic-design.md` §6/§7/§11 + `docs/superpowers/plans/2026-07-01-bli141-b-endpoints.md` (ред.11, CONFIRMED) Out-of-scope секция + C10.
- **C10 (унаследован из Плана B, обязателен здесь):** единый lock order **`parents` → `nannies` → `account_deletions` → `bookings`**, при нескольких строках — по ключу таблицы asc (`parents.id`, `nannies.id`, **`account_deletions.user_id`** — НЕ `id`, `bookings.id`). Delete-account обязан лочить **собственную** `parents`/`nannies`-строку уходящего **безусловно, даже при нуле бронирований** — это и есть точка сериализации против create (create лочит те же строки тем же порядком в `api/bookings.ts`).
- **PC1 — Status-endpoint контракт (уже реализован, Task 3 Плана B, `api/bookings.ts`):** `POST /api/bookings?op=status` тело `{booking_id, expected_status, to_status}`. auth-401 → presence+matrix-400 → load-404 → role-403 → optimistic `UPDATE WHERE status=expected` иначе 409(stale). Этот план ТОЛЬКО подключает клиент — эндпойнт не меняется.
- **PC2 — Local-first слой удаляется целиком (§7).** `updateBookingStatus`/`getBookingsForUser`/`getAllBookings` — network failure → `throw`, НЕ local fallback. `getBookingsForUser` (участник) продолжает читать **напрямую из Supabase** (RLS `bookings_participant` пока ALL-policy, разбивка — План E) — это НЕ local-first, это единственный источник правды для дашборда участника. `getAllBookings` (админ) переключается на `GET /api/bookings` (admin-only, уже реализован).
- **PC3 — account_deletions state-machine (§3.1/§6):** `deleting → db_done → deleted`; ошибка Auth-delete НЕ откатывает БД-часть (та уже закоммичена) — оставляет `db_done`, инкрементит `attempts` через reconciler; после `attempts >= 5` (reconciler) → `state='failed'` (алерт, не авто-retry). Повторный вызов `delete-account` для уже `db_done`-юзера идемпотентен (шаги 0-5 находят 0 строк для обработки — DELETE/cancel/anonymize естественно идемпотентны).
- **PC4 — HTTP-контракт delete-account:** `200 {ok:true}` — полный успех (БД + Auth-delete); `202 {ok:true, pending:true}` — БД-часть закоммичена, Auth-delete не удался (reconciler добьёт, НЕ ошибка для клиента); `401/429/500` — как раньше. Убирает старый баг «ROLLBACK всей транзакции при сбое Auth-delete» (не давал прогресса при транзиентных сбоях).
- **PC5 — Нет payment-системы (BLI-40 не построен):** «без оплаты» (§6 шаг3 дизайна) в этой кодовой базе = `status='pending'` (amount — координационная цифра, не платёж; см. дизайн §6 retention-секция). Не вводить payment-проверку, которой не существует.
- **PC6 — Deletion write barrier, fail-closed (owner-решение, round1 #5 → P1):** после появления строки в `account_deletions` (любой state) существующий JWT уходящего юзера НЕ может восстановить данные ни одним прямым Supabase write-path. Инвентаризация клиентских writers (проверено grep): `storage.ts:259` upsert `parents`/`nannies` (главный путь восстановления профиля), `storage.ts:303` delete, `matchChat.ts:23/60/107` (`chat_participants`/`chat_threads`/`chat_messages`), `supportEngine.ts:53/90` (`support_tickets`/`support_messages`), `matchingFeedback.ts:47/64/111` (`matching_outcomes`), `confirmations.ts:58/81/104` (`booking_confirmations`), `booking.ts:103` upsert `bookings` (удаляется Task 2). Механизм: `AS RESTRICTIVE` RLS-политики (AND-семантика с существующими permissive — существующие политики НЕ переписываются) через `SECURITY DEFINER` helper `public.account_in_deletion()` (у `authenticated` нет grants на `account_deletions` — прямой subquery в политике невозможен). Auth-ban/sign-out — только defense-in-depth, не единственная защита. Task 7. Миграция — локальный файл, прод-apply закрыт как и раньше.
- **PC7 — Auth-delete 404-семантика:** успехом считается ТОЛЬКО подтверждённый `user_not_found` (HTTP 404 И тело содержит `user_not_found`) — юзер уже удалён конкурентным вызовом, состояние → `deleted`. Любой другой 404 (роутинг, реверс-прокси, неверный URL) — ошибка, ретрай через attempts. Действует в обоих путях: sync (Task 4) и reconciler (Task 5).
- Транзакции: `pool.connect()` → `BEGIN`/`COMMIT`/`ROLLBACK`, `client.release()` в `finally`.
- Ошибки — через `logError` (`api/_logScrub.ts`), не светить ПДн.
- Тесты: Vitest mock-паттерн (`api/bookings.test.ts`/`api/cron/_ghosted-outcomes.ts` как образец), PG-backed integration (`INTEGRATION_PG_URL`, `describe.skipIf`) для Task 6.
- Компонентные тесты для UI-wiring (Task 3) НЕ пишутся — в этой кодовой базе AdminPanel/AdminPage/BookingsTab не имеют unit-тестов (E2E-smoke — BLI-55/BLI-103, вне этого плана); верификация Task 3 — `npm run typecheck && npm run lint && npm run build`, тот же паттерн что Task 6 Плана B (AdminCuratorTab wiring).
- Прод/DDL/cutover — **НЕ применять**. Только код+тесты локально/на ветке, тот же maker/checker с Codex (round-по-round, стоп-правило: 2 цикла без owner-решения → эскалация), TDD.
- Команды: `npm test -- <file>`, `npm run typecheck`, `npm run lint`, `npm run build`.

---

## File Structure

- `src/services/booking.ts` — `updateBookingStatus` (Task 1, throw-контракт, `expected_status`), `getBookingsForUser`/`getAllBookings` (Task 2, no local-first), удаление local-storage helpers (Task 2), `Booking.parent_id`/`nanny_id` → `string | null` (Task 2, Codex round1 P1).
- `src/services/booking.test.ts` — расширение (Task 1/2).
- `src/services/dashboardMetrics.ts` — null-safe агрегация по `parent_id` (Task 3, Codex round1 P1 follow-through).
- `src/components/admin/AdminBookingsTab.tsx` — `onStatusChange` передаёт `expected_status = booking.status`; `parentLabel`/`nannyLabel`/поиск становятся null-safe (Task 3, Codex round1 P1).
- `src/components/AdminPanel.tsx`, `src/pages/admin/AdminPage.tsx` — try/catch + `reportError` вокруг status-change и `loadData` (Task 3).
- `src/components/profile/BookingsTab.tsx` — `expected_status`-передача + локальный error-state (включая catch на `load()`, Codex round1 P2) + null-safe рендер анонимизированного `parent_id`/`nanny_id` (Task 3, Codex round1 P1).
- `api/auth/delete-account.ts` — полный rewrite lifecycle (Task 4).
- `api/auth/delete-account.test.ts` — новый (Task 4).
- `api/cron/_reconcile-account-deletions.ts` — новый reconciler (Task 5).
- `api/cron/_reconcile-account-deletions.test.ts` — новый (Task 5).
- `api/cron/index.ts` — добавить роут `job=reconcile-account-deletions` (Task 5).
- `vercel.json` — добавить cron-запись (код, НЕ активация — schedule не запустится без деплоя) (Task 5).
- `api/delete-account.integration.test.ts` — PG-backed: lifecycle + cascade + barrier-конкурентность + RLS-барьер (Task 6/7).
- `supabase/migrations/20260702210000_bli139_deletion_write_barrier.sql` — RESTRICTIVE RLS deletion barrier (Task 7, PC6; локальный файл, прод-apply закрыт).

---

### Task 1: client `updateBookingStatus` → server endpoint

**Files:**
- Modify: `src/services/booking.ts:158-189` (текущая реализация), `src/services/booking.test.ts`

**Interfaces:**
- Produces: `updateBookingStatus(bookingId: string, expectedStatus: Booking['status'], toStatus: Booking['status']): Promise<Booking>` — authed POST `/api/bookings?op=status`; `200`/`200`(replay N/A here, endpoint не idempotent-key based) → возвращает `booking`; non-2xx → **throw** `Error(payload.error || 'status update failed (<code>)')`. `recordMatchOutcome` вызывается ТОЛЬКО после успешного ответа (как раньше).

- [ ] **Step 1: Write the failing test**

```ts
// добавить в src/services/booking.test.ts, в describe('createBooking → server endpoint') секцию НЕ трогать,
// добавить новый describe рядом:
describe('updateBookingStatus → server endpoint', () => {
  beforeEach(() => {
    getSession.mockClear();
  });
  afterEach(() => vi.restoreAllMocks());

  it('POSTs to /api/bookings?op=status with bearer + body, returns booking (200)', async () => {
    const booking = { id: 'b1', parent_id: 'p', nanny_id: 'n', status: 'confirmed' };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ booking }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await updateBookingStatus('b1', 'pending', 'confirmed');
    expect(result).toEqual(booking);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/bookings?op=status');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body as string)).toEqual({
      booking_id: 'b1',
      expected_status: 'pending',
      to_status: 'confirmed',
    });
  });

  it('throws on non-2xx (stale/403/etc — no false success)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 409,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'stale status: booking is not in expected_status' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(updateBookingStatus('b1', 'pending', 'confirmed')).rejects.toThrow(/stale/i);
  });

  it('calls recordMatchOutcome("hired") only after success, on confirmed transition', async () => {
    const { recordMatchOutcome } = await import('./matchingFeedback');
    const booking = { id: 'b1', parent_id: 'p', nanny_id: 'n', status: 'confirmed' };
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ booking }),
    })));
    await updateBookingStatus('b1', 'pending', 'confirmed');
    expect(recordMatchOutcome).toHaveBeenCalledWith('p', 'n', 'hired');
  });

  it('throws when no session token', async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } } as never);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(updateBookingStatus('b1', 'pending', 'confirmed')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/booking.test.ts`
Expected: FAIL — `updateBookingStatus` is not a function with this signature (old 2-arg version returns `Booking | null`, doesn't call fetch).

- [ ] **Step 3: Rewrite updateBookingStatus**

Заменить `src/services/booking.ts:157-189` (весь блок от комментария `// Update booking status` до конца функции):

```ts
// Update booking status — server-authoritative (BLI-141 Plan C). Клиент шлёт
// expected_status (оптимистичный лок сервера) + to_status; сервер проверяет actor-роль
// и матрицу переходов. НЕТ local-first / ложного success: при ошибке — throw.
export async function updateBookingStatus(
  bookingId: string,
  expectedStatus: Booking['status'],
  toStatus: Booking['status'],
): Promise<Booking> {
  const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch('/api/bookings?op=status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id: bookingId, expected_status: expectedStatus, to_status: toStatus }),
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok || !payload?.booking) {
    throw new Error((payload?.error as string) || `status update failed (${response.status})`);
  }

  const booking = payload.booking as Booking;
  // Record hired only after the transition is durably confirmed by the server.
  // Guard on non-null ids (Codex round1 P1): a booking whose counterpart already
  // ran the BLI-139 delete-account lifecycle can carry a NULL parent_id/nanny_id
  // (anonymized terminal row) — recordMatchOutcome must not be called with null.
  if (
    (toStatus === 'confirmed' || toStatus === 'completed') &&
    expectedStatus !== toStatus &&
    booking.parent_id &&
    booking.nanny_id
  ) {
    void recordMatchOutcome(booking.parent_id, booking.nanny_id, 'hired');
  }
  return booking;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/booking.test.ts`
Expected: PASS (7 tests: 3 create + 4 status).

- [ ] **Step 5: Commit**

```bash
git add src/services/booking.ts src/services/booking.test.ts
git commit -m "feat(bli141): client updateBookingStatus -> server endpoint (expected_status, throw-контракт)"
```

---

### Task 2: readers → server-authoritative, удаление local-storage слоя

**Files:**
- Modify: `src/services/booking.ts` (readers + local-storage helpers), `src/services/booking.test.ts`

**Interfaces:**
- Produces: `getAllBookings(): Promise<Booking[]>` — authed `GET /api/bookings` (admin); non-2xx → throw.
- Produces: `getBookingsForUser(userId: string): Promise<Booking[]>` — прямой Supabase SELECT (участник, RLS); ошибка Supabase → throw.
- Удаляются: `getLocalBookings`, `setLocalBookings`, `getPendingBookingIds`, `setPendingBookingIds`, `markPendingBooking`, `clearPendingBooking`, `replaceBooking`, `upsertLocalBookings`, `mergeRemoteWithPending`, `sortBookings` (сортировка переносится в SQL/inline), `STORAGE_KEY`, `STORAGE_KEY_PENDING`, импорт `getItem/removeItem/setItem`.
- `createBooking` (Task 5/6 Плана B) больше НЕ вызывает `upsertLocalBookings`/`clearPendingBooking` (кэш-слой удалён — сервер уже единственный источник правды, вызывающий получает booking напрямую).
- **Изменяется `Booking.parent_id`/`Booking.nanny_id` на `string | null`** (Codex round1 P1): Task 4 переписывает `delete-account.ts` так, что терминальные (completed/cancelled) брони одной из сторон анонимизируются через `SET parent_id = NULL`/`SET nanny_id = NULL`. Как только `getAllBookings()`/`getBookingsForUser()` начинают возвращать реальные строки с сервера (а не синтетику, где ids всегда заполнены), эти NULL становятся достижимыми в UI — тип обязан это отражать, иначе `npm run typecheck` не поймает null-разыменование в Task 3.

- [ ] **Step 1: Write the failing tests**

```ts
// добавить в src/services/booking.test.ts
describe('getAllBookings → admin GET endpoint', () => {
  afterEach(() => vi.restoreAllMocks());

  it('GETs /api/bookings with bearer, returns bookings array', async () => {
    const bookings = [{ id: 'b1' }, { id: 'b2' }];
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ bookings }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getAllBookings();
    expect(result).toEqual(bookings);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/bookings');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('throws on non-2xx (no silent empty-array fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Unauthorized' }),
    })));
    await expect(getAllBookings()).rejects.toThrow(/Unauthorized/i);
  });
});

describe('getBookingsForUser → participant SELECT (Supabase RLS)', () => {
  it('returns bookings for parent-or-nanny, sorted by created_at desc', async () => {
    const { supabase: sb } = await import('./supabase');
    const order = vi.fn(async () => ({
      data: [
        { id: 'b1', created_at: '2026-01-01T00:00:00Z' },
        { id: 'b2', created_at: '2026-02-01T00:00:00Z' },
      ],
      error: null,
    }));
    const or = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ or }));
    (sb!.from as unknown as ReturnType<typeof vi.fn>) = vi.fn(() => ({ select }));

    const result = await getBookingsForUser('u1');
    expect(result.map((b) => b.id)).toEqual(['b2', 'b1']); // desc by created_at
    expect(or).toHaveBeenCalledWith('parent_id.eq.u1,nanny_id.eq.u1');
  });

  it('throws on Supabase error (no local fallback)', async () => {
    const { supabase: sb } = await import('./supabase');
    const order = vi.fn(async () => ({ data: null, error: { message: 'RLS denied' } }));
    const or = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ or }));
    (sb!.from as unknown as ReturnType<typeof vi.fn>) = vi.fn(() => ({ select }));

    await expect(getBookingsForUser('u1')).rejects.toThrow(/RLS denied/i);
  });

  it('accepts a row with anonymized (null) parent_id — surviving nanny reading own dashboard after counterpart deleted their account (Codex round1 P1)', async () => {
    const { supabase: sb } = await import('./supabase');
    const order = vi.fn(async () => ({
      data: [{ id: 'b1', parent_id: null, nanny_id: 'n1', status: 'cancelled', created_at: '2026-01-01T00:00:00Z' }],
      error: null,
    }));
    const or = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ or }));
    (sb!.from as unknown as ReturnType<typeof vi.fn>) = vi.fn(() => ({ select }));

    const result = await getBookingsForUser('n1');
    expect(result[0].parent_id).toBeNull();
  });
});
```

Обновить mock-блок сверху файла: `vi.mock('./supabase', ...)` должен экспортировать `supabase.from` как настраиваемый `vi.fn()` (не только `auth.getSession`). Заменить текущий:

```ts
vi.mock('./supabase', () => ({
  hasSupabaseClient: true,
  supabase: { auth: { getSession: () => getSession() }, from: vi.fn() },
}));
```

Удалить теперь ненужный storage-mock (`vi.mock('@/core/platform/storage', ...)` + `const store = new Map...`) — ни один тестируемый путь больше не трогает local storage.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/booking.test.ts`
Expected: FAIL — `getAllBookings`/`getBookingsForUser` ещё читают local storage / не делают fetch.

- [ ] **Step 3: Nullable participant ids (Codex round1 P1) + rewrite readers, remove local-storage layer**

Сначала `src/services/booking.ts:9-10` (интерфейс `Booking`) заменить:

```ts
  parent_id: string;
  nanny_id: string;
```

на:

```ts
  parent_id: string | null;
  nanny_id: string | null;
```

Затем заменить весь блок `src/services/booking.ts` от `const STORAGE_KEY = ...` (строка 18) до конца `getAllBookings` (строка 249) на:

```ts
async function remoteFetchBookingById(bookingId: string): Promise<Booking | null> {
  if (!hasSupabaseClient || !supabase) return null;

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Booking;
}

// Create booking — server-authoritative (BLI-141 Plan B). Клиент шлёт entity-id'ы +
// idempotency_key; сервер выводит auth-uid сторон, применяет инварианты, возвращает истинный
// результат. НЕТ local-first / ложного success: при ошибке — throw.
export async function createBooking(data: {
  request_id: string;
  nanny_entity_id: string;
  idempotency_key: string;
  date: string;
  amount?: string;
}): Promise<Booking> {
  const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch('/api/bookings?op=create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok || !payload?.booking) {
    throw new Error((payload?.error as string) || `create failed (${response.status})`);
  }

  const booking = payload.booking as Booking;
  trackBookingCreated(booking.parent_id, booking.nanny_id); // только после истинного success
  return booking;
}

// Update booking status — server-authoritative (BLI-141 Plan C). Клиент шлёт
// expected_status (оптимистичный лок сервера) + to_status; сервер проверяет actor-роль
// и матрицу переходов. НЕТ local-first / ложного success: при ошибке — throw.
export async function updateBookingStatus(
  bookingId: string,
  expectedStatus: Booking['status'],
  toStatus: Booking['status'],
): Promise<Booking> {
  const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch('/api/bookings?op=status', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id: bookingId, expected_status: expectedStatus, to_status: toStatus }),
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok || !payload?.booking) {
    throw new Error((payload?.error as string) || `status update failed (${response.status})`);
  }

  const booking = payload.booking as Booking;
  // Guard on non-null ids (Codex round1 P1) — see Task 1 rationale.
  if (
    (toStatus === 'confirmed' || toStatus === 'completed') &&
    expectedStatus !== toStatus &&
    booking.parent_id &&
    booking.nanny_id
  ) {
    void recordMatchOutcome(booking.parent_id, booking.nanny_id, 'hired');
  }
  return booking;
}

// Get bookings for a user (as parent or nanny) — participant SELECT под RLS
// (bookings_participant, пока ALL-policy — split в Плане E). Единственный источник
// правды для дашборда участника; сеть упала → throw, без local-first fallback (§7).
export async function getBookingsForUser(userId: string): Promise<Booking[]> {
  if (!hasSupabaseClient || !supabase) throw new Error('Supabase client unavailable');

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .or(`parent_id.eq.${userId},nanny_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'failed to load bookings');
  return (data ?? []) as Booking[];
}

// Get all bookings (admin) — server-authoritative (BLI-141 Plan C): authed GET
// /api/bookings (admin-only, api/bookings.ts Task 4 Плана B). Сеть/403 → throw.
export async function getAllBookings(): Promise<Booking[]> {
  const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch('/api/bookings', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok || !payload?.bookings) {
    throw new Error((payload?.error as string) || `list failed (${response.status})`);
  }
  return payload.bookings as Booking[];
}
```

Убрать из шапки файла импорт `import { getItem, removeItem, setItem } from '@/core/platform/storage';` (больше не используется).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/booking.test.ts`
Expected: PASS (все тесты — 3 create + 4 status + 5 readers = 12).

- [ ] **Step 5: Typecheck + build (сигнатуры изменились — проверить вызывающих)**

Run: `npm run typecheck`
Expected: ошибки в `AdminBookingsTab.tsx`/`AdminPanel.tsx`/`AdminPage.tsx`/`BookingsTab.tsx` (вызывают `updateBookingStatus` со старой 2-арг сигнатурой) — это ОЖИДАЕМО, чинится в Task 3. Зафиксировать список файлов с ошибками для Task 3.

- [ ] **Step 6: Commit**

```bash
git add src/services/booking.ts src/services/booking.test.ts
git commit -m "feat(bli141): readers -> server-authoritative (admin GET + participant SELECT), удалён local-storage слой (§7)"
```

---

### Task 3: UI-wiring (AdminBookingsTab expected_status, error handling)

**Files:**
- Modify: `src/components/admin/AdminBookingsTab.tsx:15,42-49,52-61,73-90,120,165-172`, `src/components/AdminPanel.tsx:58,90-98`, `src/pages/admin/AdminPage.tsx:113,344-352`, `src/components/profile/BookingsTab.tsx:1-20,32-70,86-98,151-158,225-260`, `src/services/dashboardMetrics.ts:112`

**Interfaces:**
- Consumes: `updateBookingStatus(bookingId, expectedStatus, toStatus)` из Task 1, `getAllBookings()` из Task 2 (throw-контракт, `Booking.parent_id`/`nanny_id: string | null`).

- [ ] **Step 1: AdminBookingsTab — передать expected_status + null-safe labels (Codex round1 P1)**

`src/components/admin/AdminBookingsTab.tsx:15` заменить:
```ts
onStatusChange: (bookingId: string, expectedStatus: Booking['status'], newStatus: Booking['status']) => void;
```
`src/components/admin/AdminBookingsTab.tsx:60` заменить `onStatusChange(booking.id, newStatus);` на:
```ts
onStatusChange(booking.id, booking.status, newStatus);
```

`parentLabel`/`nannyLabel` (строки 42-49) принимают `string | null` и не падают на анонимизированной (удалённый аккаунт) стороне — заменить:
```ts
  const parentLabel = (parentId: string) => {
    const p = parents.find((pr) => pr.id === parentId || pr.requesterId === parentId);
    return p ? `${p.city}, ${p.childAge}` : `#${parentId.slice(0, 8)}`;
  };

  const nannyLabel = (nannyId: string) => {
    const n = nannies.find((np) => np.id === nannyId || np.userId === nannyId);
    return n ? n.name : `#${nannyId.slice(0, 8)}`;
  };
```
на:
```ts
  const parentLabel = (parentId: string | null) => {
    if (!parentId) return 'Аккаунт удалён';
    const p = parents.find((pr) => pr.id === parentId || pr.requesterId === parentId);
    return p ? `${p.city}, ${p.childAge}` : `#${parentId.slice(0, 8)}`;
  };

  const nannyLabel = (nannyId: string | null) => {
    if (!nannyId) return 'Аккаунт удалён';
    const n = nannies.find((np) => np.id === nannyId || np.userId === nannyId);
    return n ? n.name : `#${nannyId.slice(0, 8)}`;
  };
```

Строки 81-88 (поиск) — заменить:
```ts
        const pLabel = parentLabel(b.parent_id).toLowerCase();
        const nLabel = nannyLabel(b.nanny_id).toLowerCase();
        return (
          b.id.toLowerCase().includes(q) ||
          b.parent_id.toLowerCase().includes(q) ||
          b.nanny_id.toLowerCase().includes(q) ||
          pLabel.includes(q) ||
          nLabel.includes(q)
        );
```
на:
```ts
        const pLabel = parentLabel(b.parent_id).toLowerCase();
        const nLabel = nannyLabel(b.nanny_id).toLowerCase();
        return (
          b.id.toLowerCase().includes(q) ||
          (b.parent_id?.toLowerCase().includes(q) ?? false) ||
          (b.nanny_id?.toLowerCase().includes(q) ?? false) ||
          pLabel.includes(q) ||
          nLabel.includes(q)
        );
```

Строка 120 (`Fuse`/exportable search list или аналог, если использует `.toLowerCase()`/`.slice()` напрямую на `parent_id`/`nanny_id`) и строки 165-172 (JSX `title={booking.parent_id}`/`title={booking.nanny_id}`) — заменить прямые ссылки на `parentLabel(booking.parent_id)`/`nannyLabel(booking.nanny_id)` (уже null-safe) и `title={booking.parent_id ?? undefined}`/`title={booking.nanny_id ?? undefined}`.

- [ ] **Step 2: AdminPanel.tsx — try/catch + reportError**

`src/components/AdminPanel.tsx:58` заменить `const { confirmAction, reportSuccess } = useAdminWorkflowUI();` на:
```ts
const { confirmAction, reportSuccess, reportError } = useAdminWorkflowUI();
```
`src/components/AdminPanel.tsx:90-98` (JSX `onStatusChange` prop) заменить на:
```tsx
onStatusChange={async (id, expectedStatus, status) => {
  try {
    await updateBookingStatus(id, expectedStatus, status);
    logAdminAction('booking_status_change', { id, status });
    await loadData();
    reportSuccess('Статус брони обновлён.');
  } catch (e) {
    reportError(e instanceof Error ? e.message : 'Не удалось изменить статус брони.');
  }
}}
```
Проверить, что `loadData` в этом файле (использует `getAllBookings()` из Task 2) тоже обёрнут — обернуть тело `loadData` в try/catch, при ошибке `reportError` и не падать (оставить предыдущий `bookings`-state):
```ts
const loadData = async () => {
  try {
    // ...существующее тело функции без изменений...
  } catch (e) {
    reportError(e instanceof Error ? e.message : 'Не удалось загрузить данные админки.');
  }
};
```

- [ ] **Step 3: AdminPage.tsx — то же самое**

`src/pages/admin/AdminPage.tsx:113` заменить на `const { confirmAction, reportSuccess, reportError } = useAdminWorkflowUI();`.
`src/pages/admin/AdminPage.tsx:344-352` (JSX `onStatusChange`) — идентичная замена, как Step 2.
`loadData` в этом файле — обернуть в try/catch с `reportError`, аналогично Step 2.

- [ ] **Step 4: BookingsTab.tsx — participant error handling + null-safe counterparty (Codex round1 P1/P2)**

`src/components/profile/BookingsTab.tsx` добавить состояние ошибки после `const [loading, setLoading] = useState(true);`:
```ts
const [statusError, setStatusError] = useState<string | null>(null);
const [loadError, setLoadError] = useState<string | null>(null);
```

`load()` (строки 36-66) сейчас — `try { ... } finally { ... }` без `catch`: `getBookingsForUser`/`getAllBookings` теперь **throw** на сетевой ошибке (Task 2, §7) вместо local-first success, поэтому без `catch` это необработанный rejection (Codex round1 P2). Заменить:
```ts
    const load = async () => {
      setLoading(true);
      try {
        const [items, nannies] = await Promise.all([
          getBookingsForUser(user.id),
          getNannyProfiles(),
        ]);

        if (cancelled) return;

        const nextBookingNannyMap = items.reduce<Record<string, string>>((acc, item) => {
          if (item.id && item.nanny_id) acc[item.id] = item.nanny_id;
          return acc;
        }, {});
        const nextNannyNames = nannies.reduce<Record<string, string>>((acc, nanny) => {
          if (nanny.id) acc[nanny.id] = nanny.name || nanny.id;
          return acc;
        }, {});
        const reviewedIds = nannies.flatMap((nanny) =>
          (nanny.reviews || [])
            .map((review) => review.bookingId)
            .filter((bookingId): bookingId is string => Boolean(bookingId)),
        );

        setBookings(items);
        setBookingNannyMap(nextBookingNannyMap);
        setNannyNames(nextNannyNames);
        setReviewedBookingIds(Array.from(new Set(reviewedIds)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
```
на:
```ts
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [items, nannies] = await Promise.all([
          getBookingsForUser(user.id),
          getNannyProfiles(),
        ]);

        if (cancelled) return;

        const nextBookingNannyMap = items.reduce<Record<string, string>>((acc, item) => {
          if (item.id && item.nanny_id) acc[item.id] = item.nanny_id;
          return acc;
        }, {});
        const nextNannyNames = nannies.reduce<Record<string, string>>((acc, nanny) => {
          if (nanny.id) acc[nanny.id] = nanny.name || nanny.id;
          return acc;
        }, {});
        const reviewedIds = nannies.flatMap((nanny) =>
          (nanny.reviews || [])
            .map((review) => review.bookingId)
            .filter((bookingId): bookingId is string => Boolean(bookingId)),
        );

        setBookings(items);
        setBookingNannyMap(nextBookingNannyMap);
        setNannyNames(nextNannyNames);
        setReviewedBookingIds(Array.from(new Set(reviewedIds)));
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Не удалось загрузить брони.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
```

`getCounterpartyName` (строки 86-98) читает `booking.parent_id.slice(...)`/`booking.nanny_id.slice(...)` — счётный сбой, если сторона удалила аккаунт (`parent_id`/`nanny_id` теперь `string | null`, Task 2). Заменить:
```ts
  const getCounterpartyName = (booking: ServiceBooking) => {
    if (isNanny) {
      const shortId = booking.parent_id.slice(0, 6);
      return lang === 'ru' ? `Семья #${shortId}` : `Family #${shortId}`;
    }

    return (
      nannyNames[booking.nanny_id] ||
      (lang === 'ru'
        ? `Няня #${booking.nanny_id.slice(0, 6)}`
        : `Nanny #${booking.nanny_id.slice(0, 6)}`)
    );
  };
```
на:
```ts
  const getCounterpartyName = (booking: ServiceBooking) => {
    if (isNanny) {
      if (!booking.parent_id) return lang === 'ru' ? 'Аккаунт удалён' : 'Account deleted';
      const shortId = booking.parent_id.slice(0, 6);
      return lang === 'ru' ? `Семья #${shortId}` : `Family #${shortId}`;
    }

    if (!booking.nanny_id) return lang === 'ru' ? 'Аккаунт удалён' : 'Account deleted';
    return (
      nannyNames[booking.nanny_id] ||
      (lang === 'ru'
        ? `Няня #${booking.nanny_id.slice(0, 6)}`
        : `Nanny #${booking.nanny_id.slice(0, 6)}`)
    );
  };
```

Добавить рендер `loadError` в JSX (рядом со `statusError`, ниже):
```tsx
{loadError && (
  <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</div>
)}
```

`src/services/dashboardMetrics.ts:110-115` (`repeatFamilies`) индексирует объект по `booking.parent_id` — с nullable `parent_id` (Task 2) `null` коэрсится в JS-ключ `"null"`, молча слипая счётчик по всем анонимизированным броням в одну фиктивную "семью" (Codex round1 P1 follow-through, не крашится, но искажает метрику). Заменить:
```ts
  const repeatFamilies = Object.values(
    params.bookings.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.parent_id] = (acc[booking.parent_id] || 0) + 1;
      return acc;
    }, {}),
  ).filter((count) => count > 1).length;
```
на:
```ts
  const repeatFamilies = Object.values(
    params.bookings.reduce<Record<string, number>>((acc, booking) => {
      if (!booking.parent_id) return acc;
      acc[booking.parent_id] = (acc[booking.parent_id] || 0) + 1;
      return acc;
    }, {}),
  ).filter((count) => count > 1).length;
```

Заменить `handleBookingStatusChange` (строка ~151):
```ts
const handleBookingStatusChange = async (
  booking: ServiceBooking,
  status: ServiceBooking['status'],
) => {
  setStatusError(null);
  try {
    const updated = await updateBookingStatus(booking.id, booking.status, status);
    patchBooking(updated);
  } catch (e) {
    setStatusError(e instanceof Error ? e.message : 'Не удалось изменить статус брони.');
  }
};
```
Обновить 4 вызывающих места (строки ~231-255) с `handleBookingStatusChange(booking.id, 'confirmed')` на `handleBookingStatusChange(booking, 'confirmed')` (и аналогично для `'cancelled'`/`'active'`/`'completed'`) — передаём весь объект `booking`, не только `id`.

Добавить рендер ошибки в JSX (рядом с началом списка броней, перед `upcomingBookings.map`):
```tsx
{statusError && (
  <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{statusError}</div>
)}
```

- [ ] **Step 5: Typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: чисто (0 ошибок — все вызывающие обновлены под новую сигнатуру `updateBookingStatus`/новый throw-контракт `getAllBookings`).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminBookingsTab.tsx src/components/AdminPanel.tsx src/pages/admin/AdminPage.tsx src/components/profile/BookingsTab.tsx src/services/dashboardMetrics.ts
git commit -m "feat(bli141): UI wiring — expected_status передаётся из booking.status, error handling вокруг throw-контракта, null-safe анонимизированные ids (Codex round1 P1/P2)"
```

---

### Task 4: `delete-account.ts` lifecycle rewrite (BLI-139, C10, PC3/PC4)

**Files:**
- Modify: `api/auth/delete-account.ts` (полный rewrite тела транзакции)
- Test: `api/auth/delete-account.test.ts` (новый)

**Interfaces:**
- Produces: `DELETE /api/auth/delete-account` (без изменений во внешнем API — те же auth/rate-limit). Ответы: `200 {ok:true}` полный успех; `202 {ok:true, pending:true}` БД ок, Auth-delete не удался; `401/429/500` как раньше.

- [ ] **Step 1: Write the failing test**

```ts
// api/auth/delete-account.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';

const connect = vi.fn();
vi.mock('../_cors.js', () => ({ setCors: vi.fn() }));
vi.mock('../_rate-limit.js', () => ({ rateLimit: vi.fn(() => ({ ok: true })) }));
vi.mock('../_auth.js', () => ({
  verifyBearerUser: vi.fn(async () => ({ id: '11111111-1111-4111-8111-111111111111', email: 'u@x' })),
}));
vi.mock('../_logScrub.js', () => ({ logError: vi.fn(), logWarn: vi.fn() }));
// query обязан возвращать Promise: финальные апдейты идут pool.query(...).catch(...) —
// голый vi.fn() вернул бы undefined и уронил тест TypeError'ом.
vi.mock('../_db.js', () => ({
  getDbPool: vi.fn(() => ({ connect, query: vi.fn(async () => ({ rows: [], rowCount: 0 })) })),
}));

import handler from './delete-account';
import { createMockResponse } from '../_testUtils';

function mockClient(steps: Record<string, unknown>) {
  const query = vi.fn(async (sql: string) => {
    const key = Object.keys(steps).find((k) => sql.includes(k));
    const v = key ? steps[key] : { rows: [], rowCount: 0 };
    return typeof v === 'function' ? (v as () => unknown)() : v;
  });
  return { query, release: vi.fn() };
}

const UID = '11111111-1111-4111-8111-111111111111';
const makeReq = () => ({ method: 'DELETE', headers: {} } as unknown as VercelRequest);

describe('DELETE /api/auth/delete-account', () => {
  beforeEach(() => connect.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it('happy path: locks own rows, flags deleting, cleans bookings, db_done then deleted (200)', async () => {
    connect.mockResolvedValue(
      mockClient({
        'FROM parents': { rows: [{ user_id: UID }], rowCount: 1 },
        'FROM nannies': { rows: [], rowCount: 0 },
        'INSERT INTO account_deletions': { rows: [], rowCount: 1 },
        'DELETE FROM bookings': { rows: [], rowCount: 0 },
        'UPDATE bookings': { rows: [], rowCount: 0 },
        'UPDATE parents': { rows: [], rowCount: 1 },
        'UPDATE nannies': { rows: [], rowCount: 0 },
        'DELETE FROM support_messages': { rows: [], rowCount: 0 },
        'DELETE FROM support_tickets': { rows: [], rowCount: 0 },
        'UPDATE matching_outcomes': { rows: [], rowCount: 0 },
        'UPDATE chat_messages': { rows: [], rowCount: 0 },
        'UPDATE account_deletions': { rows: [{ state: 'db_done' }], rowCount: 1 },
        BEGIN: { rows: [] },
        COMMIT: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));
    vi.stubGlobal('fetch', fetchMock);
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    // PC6 defense-in-depth: ban (PUT c ban_duration) идёт ПЕРЕД Auth-delete (DELETE).
    const methods = fetchMock.mock.calls.map((c) => (c[1] as RequestInit).method);
    expect(methods).toEqual(['PUT', 'DELETE']);
    expect(String((fetchMock.mock.calls[0][1] as RequestInit).body)).toContain('ban_duration');
  });

  it('Auth-delete 404 WITH confirmed user_not_found body -> success 200 (already deleted by racing call, PC7)', async () => {
    connect.mockResolvedValue(
      mockClient({
        'FROM parents': { rows: [{ user_id: UID }], rowCount: 1 },
        'FROM nannies': { rows: [], rowCount: 0 },
        'UPDATE account_deletions': { rows: [{ state: 'db_done' }], rowCount: 1 },
        BEGIN: { rows: [] },
        COMMIT: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
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

  it('Auth-delete plain 404 WITHOUT user_not_found marker (proxy/misroute) -> 202 pending, retried (PC7)', async () => {
    connect.mockResolvedValue(
      mockClient({
        'FROM parents': { rows: [{ user_id: UID }], rowCount: 1 },
        'FROM nannies': { rows: [], rowCount: 0 },
        'UPDATE account_deletions': { rows: [{ state: 'db_done' }], rowCount: 1 },
        BEGIN: { rows: [] },
        COMMIT: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) =>
        init?.method === 'PUT'
          ? { ok: true, status: 200, text: async () => '' }
          : { ok: false, status: 404, text: async () => 'Not Found' },
      ),
    );
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({ ok: true, pending: true });
  });

  it('DB commits, Auth-delete fails -> 202 pending (NOT rollback, NOT 500)', async () => {
    connect.mockResolvedValue(
      mockClient({
        'FROM parents': { rows: [{ user_id: UID }], rowCount: 1 },
        'FROM nannies': { rows: [], rowCount: 0 },
        'UPDATE account_deletions': { rows: [{ state: 'db_done' }], rowCount: 1 },
        BEGIN: { rows: [] },
        COMMIT: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, text: async () => 'transient 500' })),
    );
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({ ok: true, pending: true });
  });

  it('Auth-delete fetch REJECTS (network error, not just non-2xx) -> 202 pending, not an unhandled rejection (Codex round1 P1)', async () => {
    connect.mockResolvedValue(
      mockClient({
        'FROM parents': { rows: [{ user_id: UID }], rowCount: 1 },
        'FROM nannies': { rows: [], rowCount: 0 },
        'UPDATE account_deletions': { rows: [{ state: 'db_done' }], rowCount: 1 },
        BEGIN: { rows: [] },
        COMMIT: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('fetch failed: ECONNRESET');
      }),
    );
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(202);
    expect(res.body).toEqual({ ok: true, pending: true });
  });

  it('already state=deleted (repeat/racing call after a prior successful delete) -> 200 no-op, does NOT call Auth-delete again (Codex round1 P1)', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => '' }));
    vi.stubGlobal('fetch', fetchMock);
    connect.mockResolvedValue(
      mockClient({
        'FROM parents': { rows: [{ user_id: UID }], rowCount: 1 },
        'FROM nannies': { rows: [], rowCount: 0 },
        // Guarded UPDATE ... WHERE state <> 'deleted' RETURNING state matches 0 rows
        // when the row is already 'deleted' — this is the exact resurrection guard.
        'UPDATE account_deletions': { rows: [], rowCount: 0 },
        BEGIN: { rows: [] },
        COMMIT: { rows: [] },
      }),
    );
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('locks own parents/nannies row even with zero bookings (C10, round8 fix)', async () => {
    const client = mockClient({
      'FROM parents': { rows: [{ user_id: UID }], rowCount: 1 },
      'FROM nannies': { rows: [], rowCount: 0 },
      'UPDATE account_deletions': { rows: [{ state: 'db_done' }], rowCount: 1 },
      BEGIN: { rows: [] },
      COMMIT: { rows: [] },
    });
    connect.mockResolvedValue(client);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '' })));
    await handler(makeReq(), createMockResponse());
    const lockCall = client.query.mock.calls.find(
      (c) => String(c[0]).includes('FROM parents') && String(c[0]).includes('FOR UPDATE'),
    );
    expect(lockCall).toBeTruthy();
  });

  it('401 when unauthenticated', async () => {
    const { verifyBearerUser } = await import('../_auth.js');
    (verifyBearerUser as unknown as { mockResolvedValueOnce: (v: unknown) => void }).mockResolvedValueOnce(
      null,
    );
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(401);
    expect(connect).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/auth/delete-account.test.ts`
Expected: FAIL — текущий handler не лочит parents/nannies, не трогает bookings/account_deletions, возвращает `500` (не `202`) на Auth-delete сбое.

- [ ] **Step 3: Rewrite delete-account.ts**

Полностью заменить `api/auth/delete-account.ts`:

```ts
/// <reference lib="dom" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors } from '../_cors.js';
import { rateLimit } from '../_rate-limit.js';
import { verifyBearerUser } from '../_auth.js';
import { getDbPool } from '../_db.js';
import { logError } from '../_logScrub.js';

const ACTIVE = ['confirmed', 'active'];

function getSupabaseAdminHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req.headers.origin, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  const rl = rateLimit(req, { max: 3, windowMs: 3_600_000, prefix: 'delete-account' });
  if (!rl.ok) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyBearerUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;
  const pool = getDbPool();
  const client = await pool.connect();
  let alreadyDeleted = false;

  try {
    await client.query('BEGIN');

    // C10 lock order: parents -> nannies -> account_deletions -> bookings.
    // Лочим СОБСТВЕННУЮ строку уходящего безусловно (даже без броней) — это точка
    // сериализации против create (тот же порядок в api/bookings.ts).
    await client.query('SELECT user_id FROM parents WHERE user_id = $1 FOR UPDATE', [userId]);
    await client.query('SELECT user_id FROM nannies WHERE user_id = $1 FOR UPDATE', [userId]);

    // Deletion-флаг (идемпотентно: повторный вызов при уже 'deleting'/'db_done' — no-op апдейт).
    await client.query(
      `INSERT INTO account_deletions (user_id, state)
       VALUES ($1, 'deleting')
       ON CONFLICT (user_id) DO UPDATE SET state = 'deleting', updated_at = now()
       WHERE account_deletions.state <> 'deleted'`,
      [userId],
    );

    // Удалить незавершённые без оплаты (status='pending', PC5: нет payment-системы —
    // amount координационный) уходящей стороны. Booking_confirmations каскадят (FK ON DELETE CASCADE).
    await client.query(
      `DELETE FROM bookings WHERE status = 'pending' AND (parent_id = $1 OR nanny_id = $1)`,
      [userId],
    );

    // Отменить оставшиеся активные (confirmed/active) — терминализует строку без нарушения
    // active-CHECK при последующем обнулении полей.
    await client.query(
      `UPDATE bookings SET status = 'cancelled'
       WHERE status = ANY($2) AND (parent_id = $1 OR nanny_id = $1)`,
      [userId, ACTIVE],
    );

    // Обезличить терминальные (completed/cancelled, включая только что отменённые) для
    // каждой стороны отдельно (uid может быть и parent_id, и nanny_id в разных строках).
    await client.query(
      `UPDATE bookings SET parent_id = NULL, request_id = NULL, parent_erased_at = now()
       WHERE status IN ('completed','cancelled') AND parent_id = $1`,
      [userId],
    );
    await client.query(
      `UPDATE bookings SET nanny_id = NULL, nanny_erased_at = now()
       WHERE status IN ('completed','cancelled') AND nanny_id = $1`,
      [userId],
    );

    // Существующая анонимизация профиля + смежных доменов (не тронуто).
    await client.query(`UPDATE parents SET payload = '{}', updated_at = NOW() WHERE user_id = $1`, [
      userId,
    ]);
    await client.query(`UPDATE nannies SET payload = '{}', updated_at = NOW() WHERE user_id = $1`, [
      userId,
    ]);
    await client.query(
      `DELETE FROM support_messages
         WHERE ticket_id IN (SELECT id FROM support_tickets WHERE family_id = $1)`,
      [userId],
    );
    await client.query(`DELETE FROM support_tickets WHERE family_id = $1`, [userId]);
    await client.query(`UPDATE matching_outcomes SET parent_id = NULL WHERE parent_id = $1`, [
      userId,
    ]);
    await client.query(`UPDATE matching_outcomes SET nanny_id  = NULL WHERE nanny_id  = $1`, [
      userId,
    ]);
    await client.query(`UPDATE chat_messages    SET sender_id  = NULL WHERE sender_id  = $1`, [
      userId,
    ]);

    // БД-часть готова -> db_done (кроме уже 'deleted' — Codex round1 P1: без этого guard
    // повторный/гоночный вызов после успешного завершения безусловно перезаписывал
    // state обратно на 'db_done', "воскрешая" удалённый аккаунт для reconciler'а),
    // затем COMMIT (PC3: БД-коммит НЕ зависит от Auth-delete).
    const { rows: stateRows } = await client.query<{ state: string }>(
      `UPDATE account_deletions SET state = 'db_done', updated_at = now()
       WHERE user_id = $1 AND state <> 'deleted'
       RETURNING state`,
      [userId],
    );
    alreadyDeleted = stateRows.length === 0;
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    logError('[delete-account] DB phase failed:', e);
    return res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }

  // Уже был 'deleted' до этого вызова (повторный/гоночный DELETE после успешного
  // завершения) — Auth-user уже удалён, DB-фаза выше была естественным no-op.
  // Не бить Auth второй раз (был бы гарантированный 404 -> ложный attempts-инкремент).
  if (alreadyDeleted) return res.status(200).json({ ok: true });

  // Defense-in-depth (PC6): ban сразу после COMMIT — если Auth-delete упадёт, re-login
  // в окне до reconciler невозможен. Best-effort: сбой ban не меняет исход запроса
  // (основная fail-closed защита — RLS-барьер Task 7, ban только вторая линия).
  const base = getSupabaseUrl();
  await fetch(`${base}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: getSupabaseAdminHeaders(),
    body: JSON.stringify({ ban_duration: '876000h' }),
  }).catch((e) => logError('[delete-account] ban (defense-in-depth) failed:', e));

  // Auth-delete ВНЕ транзакции (PC4): БД-часть уже необратимо закоммичена. Сбой здесь
  // НЕ откатывает БД — оставляет state='db_done', reconciler (Task 5) добьёт retry.
  // Сетевой reject fetch (не только non-2xx ответ) обязан попасть в тот же 202-путь,
  // а не всплыть наружу необработанным исключением (Codex round1 P1).
  let delOk: boolean;
  let delErr = '';
  try {
    const delResp = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getSupabaseAdminHeaders(),
    });
    if (delResp.ok) {
      delOk = true;
    } else {
      const bodyText = await delResp.text().catch(() => 'unknown');
      // PC7: успех только при ПОДТВЕРЖДЁННОМ user_not_found (404 + маркер в теле) —
      // юзер уже удалён конкурентным вызовом/reconciler'ом. Прочие 404 (прокси,
      // роутинг) — ошибка, идёт в retry через attempts.
      delOk = delResp.status === 404 && bodyText.includes('user_not_found');
      if (!delOk) delErr = bodyText;
    }
  } catch (e) {
    delOk = false;
    delErr = e instanceof Error ? e.message : String(e);
  }

  if (!delOk) {
    logError(`[delete-account] Auth-delete failed for ${userId} (db_done, will retry):`, delErr);
    await pool
      .query(
        `UPDATE account_deletions SET attempts = attempts + 1, last_error = $2, updated_at = now()
         WHERE user_id = $1`,
        [userId, String(delErr).slice(0, 500)],
      )
      .catch((e) => logError('[delete-account] attempts bump failed:', e));
    return res.status(202).json({ ok: true, pending: true });
  }

  await pool
    .query(`UPDATE account_deletions SET state = 'deleted', updated_at = now() WHERE user_id = $1`, [
      userId,
    ])
    .catch((e) => logError('[delete-account] state=deleted update failed:', e));
  return res.status(200).json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/auth/delete-account.test.ts`
Expected: PASS (8/8).

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: чисто.

- [ ] **Step 6: Commit**

```bash
git add api/auth/delete-account.ts api/auth/delete-account.test.ts
git commit -m "fix(bli139): delete-account lifecycle — C10 lock order, booking cleanup, db_done/deleted state machine (152-ФЗ живой баг)"
```

---

### Task 5: `account_deletions` reconciler cron job

**Files:**
- Create: `api/cron/_reconcile-account-deletions.ts`
- Test: `api/cron/_reconcile-account-deletions.test.ts`
- Modify: `api/cron/index.ts`, `vercel.json`

**Interfaces:**
- Produces: `GET/POST /api/cron?job=reconcile-account-deletions` (CRON_SECRET, паттерн `_ghosted-outcomes.ts`). Берёт `db_done` строки с истёкшим `lease_until` батчем (`FOR UPDATE SKIP LOCKED`), ставит lease, повторяет Auth-delete; успех → `deleted`; сбой → `attempts+1`, `attempts>=5` → `failed`, иначе снова `db_done` (lease снят — следующий прогон подхватит).

- [ ] **Step 1: Write the failing test**

```ts
// api/cron/_reconcile-account-deletions.test.ts
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

describe('reconcile-account-deletions cron', () => {
  beforeEach(() => {
    query.mockReset();
    process.env.CRON_SECRET = 'test-secret';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('401 without correct CRON_SECRET', async () => {
    delete process.env.CRON_SECRET;
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('retries Auth-delete for leased db_done rows; success -> deleted (ownership-guarded)', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE SKIP LOCKED')) {
        return { rows: [{ user_id: 'u1', attempts: 0 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => '' })));
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, deleted: 1, stillPending: 0, failed: 0 });
    const deletedCall = query.mock.calls.find((c) =>
      String(c[0]).includes("SET state = 'deleted'"),
    );
    expect(deletedCall).toBeTruthy();
    // Ownership-guard: завершение только из db_done (Codex round1 P2).
    expect(String(deletedCall![0])).toContain("state = 'db_done'");
  });

  it('rejected fetch on one row does NOT abort the batch; row -> attempts+1, next row still processed (Codex round1 P1)', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE SKIP LOCKED')) {
        return {
          rows: [
            { user_id: 'u1', attempts: 0 },
            { user_id: 'u2', attempts: 0 },
          ],
          rowCount: 2,
        };
      }
      return { rows: [], rowCount: 0 };
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('u1')) throw new Error('fetch failed: ETIMEDOUT');
        return { ok: true, status: 200, text: async () => '' };
      }),
    );
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, deleted: 1, stillPending: 1, failed: 0 });
    expect(
      query.mock.calls.some(
        (c) => String(c[0]).includes('attempts = attempts + 1') && c[1]?.[0] === 'u1',
      ),
    ).toBe(true);
  });

  it('404 with confirmed user_not_found -> deleted (already gone via sync path, PC7)', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE SKIP LOCKED')) {
        return { rows: [{ user_id: 'u1', attempts: 2 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
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
    expect(query.mock.calls.some((c) => String(c[0]).includes("SET state = 'deleted'"))).toBe(true);
  });

  it('failure below MAX_ATTEMPTS -> stays db_done, lease released, attempts+1', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE SKIP LOCKED')) {
        return { rows: [{ user_id: 'u1', attempts: 1 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, text: async () => 'still failing' })));
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.body).toMatchObject({ ok: true, deleted: 0, stillPending: 1, failed: 0 });
    expect(
      query.mock.calls.some(
        (c) => String(c[0]).includes('attempts = attempts + 1') && String(c[0]).includes("lease_until = NULL"),
      ),
    ).toBe(true);
  });

  it('failure at MAX_ATTEMPTS (5th) -> state=failed, alertable', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE SKIP LOCKED')) {
        return { rows: [{ user_id: 'u1', attempts: 4 }], rowCount: 1 }; // 5th attempt now
      }
      return { rows: [], rowCount: 0 };
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, text: async () => 'still failing' })));
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.body).toMatchObject({ ok: true, deleted: 0, stillPending: 0, failed: 1 });
    expect(query.mock.calls.some((c) => String(c[0]).includes("state = 'failed'"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run api/cron/_reconcile-account-deletions.test.ts`
Expected: FAIL — `Cannot find module './_reconcile-account-deletions'`.

- [ ] **Step 3: Write the reconciler**

```ts
// api/cron/_reconcile-account-deletions.ts
/**
 * Account-deletion reconciler (BLI-139, SPEC §3.1/§6).
 *
 * Добивает зависшие account_deletions.state='db_done' (Auth-delete упал синхронно
 * в api/auth/delete-account.ts) — берёт батч с истёкшим lease, ставит lease,
 * повторяет Auth-delete; успех -> deleted; сбой -> attempts+1, лимит -> failed.
 *
 * Run periodically via Vercel Cron (see vercel.json). Uses service_role key,
 * bypasses RLS — никогда не открывать клиенту.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDbPool } from '../_db.js';
import { logError } from '../_logScrub.js';

const BATCH_SIZE = 20;
const LEASE_MINUTES = 5;
const MAX_ATTEMPTS = 5;

function getSupabaseAdminHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pool = getDbPool();
  let deleted = 0;
  let stillPending = 0;
  let failed = 0;

  try {
    const batch = await pool.query<{ user_id: string; attempts: number }>(
      `UPDATE account_deletions
       SET lease_until = now() + interval '${LEASE_MINUTES} minutes'
       WHERE user_id IN (
         SELECT user_id FROM account_deletions
         WHERE state = 'db_done' AND (lease_until IS NULL OR lease_until < now())
         ORDER BY updated_at ASC
         LIMIT ${BATCH_SIZE}
         FOR UPDATE SKIP LOCKED
       )
       RETURNING user_id, attempts`,
    );

    const base = getSupabaseUrl();
    for (const row of batch.rows) {
      // Per-row try/catch (Codex round1 P1): reject fetch по одной строке НЕ должен
      // прерывать батч (иначе остальные строки зависают с lease на LEASE_MINUTES
      // и без attempts-инкремента).
      let delOk: boolean;
      let delErr = '';
      try {
        const delResp = await fetch(`${base}/auth/v1/admin/users/${row.user_id}`, {
          method: 'DELETE',
          headers: getSupabaseAdminHeaders(),
        });
        if (delResp.ok) {
          delOk = true;
        } else {
          const bodyText = await delResp.text().catch(() => 'unknown');
          // PC7: подтверждённый user_not_found = юзер уже удалён (sync-путь успел
          // первым) -> терминализуем в 'deleted', НЕ молотим 404 до failed.
          delOk = delResp.status === 404 && bodyText.includes('user_not_found');
          if (!delOk) delErr = bodyText;
        }
      } catch (e) {
        delOk = false;
        delErr = e instanceof Error ? e.message : String(e);
      }

      // Ownership-guard (Codex round1 P2): `AND state = 'db_done'` — stale-воркер
      // с истёкшим lease не может перезаписать 'deleted'/'failed' новее-воркера.
      if (delOk) {
        await pool.query(
          `UPDATE account_deletions SET state = 'deleted', lease_until = NULL, updated_at = now()
           WHERE user_id = $1 AND state = 'db_done'`,
          [row.user_id],
        );
        deleted += 1;
        continue;
      }

      const nextAttempts = row.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        await pool.query(
          `UPDATE account_deletions
           SET state = 'failed', attempts = $2, last_error = $3, lease_until = NULL, updated_at = now()
           WHERE user_id = $1 AND state = 'db_done'`,
          [row.user_id, nextAttempts, String(delErr).slice(0, 500)],
        );
        failed += 1;
      } else {
        await pool.query(
          `UPDATE account_deletions
           SET attempts = attempts + 1, last_error = $2, lease_until = NULL, updated_at = now()
           WHERE user_id = $1 AND state = 'db_done'`,
          [row.user_id, String(delErr).slice(0, 500)],
        );
        stillPending += 1;
      }
    }

    return res.status(200).json({ ok: true, deleted, stillPending, failed });
  } catch (err) {
    logError('[reconcile-account-deletions] error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run api/cron/_reconcile-account-deletions.test.ts`
Expected: PASS (6/6).

- [ ] **Step 5: Wire into cron router (код only — НЕ активирует прод-расписание без деплоя)**

`api/cron/index.ts` — добавить импорт и case:
```ts
import reconcileAccountDeletions from './_reconcile-account-deletions.js';
```
```ts
    case 'reconcile-account-deletions':
      return reconcileAccountDeletions(req, res);
```

`vercel.json` `crons` массив — добавить запись:
```json
    {
      "path": "/api/cron?job=reconcile-account-deletions",
      "schedule": "*/10 * * * *"
    }
```

- [ ] **Step 6: Run full cron test suite + typecheck**

Run: `npx vitest run api/cron && npm run typecheck`
Expected: PASS, чисто.

- [ ] **Step 7: Commit**

```bash
git add api/cron/_reconcile-account-deletions.ts api/cron/_reconcile-account-deletions.test.ts api/cron/index.ts vercel.json
git commit -m "feat(bli139): account_deletions reconciler cron — lease/attempts retry для зависших db_done"
```

---

### Task 6: PG-backed integration — delete-account lifecycle + create-vs-delete race

**Files:**
- Create: `api/delete-account.integration.test.ts`

**Interfaces:** Прогон против реального PG (`INTEGRATION_PG_URL`, `describe.skipIf`). Проверяет: (1) реальную анонимизацию confirmed-брони (cancelled + `parent_id NULL`); (2) реальный DELETE-каскад `booking_confirmations` при удалении pending-брони (FK `ON DELETE CASCADE`, `remote_schema.sql:522`); (3) НАСТОЯЩУЮ конкурентность `create` vs `delete-account` через barrier-паттерн Плана B (`api/bookings.integration.test.ts:216-267`: внешний lock-holder `L` + `pg_stat_activity`-observer) — не «вставили флаг заранее» (Codex round1 P1). Примечание: rev1-версия happy-path создавала `pending`-бронь и ожидала `cancelled` — по Task 4 `pending` удаляется (шаг 3), исправлено промоушеном в `confirmed` перед delete.

- [ ] **Step 1: Harness + happy-path**

```ts
// api/delete-account.integration.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { Pool, type PoolClient } from 'pg';
import type { MockVercelResponse } from './_testUtils';

const PG_URL = process.env.INTEGRATION_PG_URL;
const APP_NAME = `it_del_${process.pid}`;
const REQ_ID = `it_del_req_${process.pid}_${Date.now()}`;
const NANNY_ID = `it_del_nanny_${process.pid}_${Date.now()}`;
const PARENT_UID = crypto.randomUUID();
const NANNY_UID = crypto.randomUUID();

let pool: Pool;

async function waitFor(p: () => Promise<boolean>, timeout: number) {
  const t0 = Date.now();
  while (!(await p())) {
    if (Date.now() - t0 > timeout) throw new Error('waitFor timeout');
    await new Promise((r) => setTimeout(r, 50));
  }
}

vi.mock('../_cors.js', () => ({ setCors: vi.fn() }));
vi.mock('../_rate-limit.js', () => ({ rateLimit: vi.fn(() => ({ ok: true })) }));
vi.mock('../_logScrub.js', () => ({ logError: vi.fn(), logWarn: vi.fn() }));
vi.mock('../_auth.js', () => ({
  verifyBearerAdmin: vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.com' })),
  verifyBearerUser: vi.fn(async () => ({ id: PARENT_UID, email: 'p@x' })),
}));
vi.mock('../_db.js', () => ({ getDbPool: () => pool }));

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
      `INSERT INTO parents (id, payload, user_id) VALUES ($1, '{"status":"new"}'::jsonb, $2)`,
      [REQ_ID, PARENT_UID],
    );
    await pool.query(`INSERT INTO nannies (id, payload, user_id) VALUES ($1, '{}'::jsonb, $2)`, [
      NANNY_ID,
      NANNY_UID,
    ]);
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query('DELETE FROM bookings WHERE request_id = $1', [REQ_ID]).catch(() => {});
    await pool.query('DELETE FROM account_deletions WHERE user_id = ANY($1::uuid[])', [
      [PARENT_UID, NANNY_UID],
    ]).catch(() => {});
    await pool.query('DELETE FROM parents WHERE id = $1', [REQ_ID]).catch(() => {});
    await pool.query('DELETE FROM nannies WHERE id = $1', [NANNY_ID]).catch(() => {});
    await pool.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [
      [PARENT_UID, NANNY_UID],
    ]).catch(() => {});
    delete process.env.BOOKINGS_ENDPOINT_ENABLED;
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM bookings WHERE request_id = $1', [REQ_ID]);
    await pool.query(`UPDATE parents SET payload = '{"status":"new"}'::jsonb WHERE id = $1`, [
      REQ_ID,
    ]);
    await pool.query(`DELETE FROM account_deletions WHERE user_id = $1`, [PARENT_UID]);
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
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, text: async () => '' })));

  it('deletes account with a CONFIRMED booking: booking cancelled + parent side anonymized', async () => {
    const create = createMockResponse();
    await createHandler(makeCreateReq(), create);
    expect(create.statusCode).toBe(201);
    const bookingId = (create.body as { booking: { id: string } }).booking.id;
    // Промоушен в confirmed: Task 4 шаг3 УДАЛЯЕТ pending-брони; анонимизация
    // (cancelled + NULL) применяется только к confirmed/active/terminal.
    await pool.query(`UPDATE bookings SET status = 'confirmed' WHERE id = $1`, [bookingId]);

    stubAuthFetchOk();
    const del = createMockResponse();
    await deleteAccountHandler(makeDeleteReq(), del);
    expect(del.statusCode).toBe(200);

    const { rows } = await pool.query('SELECT status, parent_id FROM bookings WHERE id = $1', [
      bookingId,
    ]);
    expect(rows[0].status).toBe('cancelled');
    expect(rows[0].parent_id).toBeNull();

    const { rows: adRows } = await pool.query(
      'SELECT state FROM account_deletions WHERE user_id = $1',
      [PARENT_UID],
    );
    expect(adRows[0].state).toBe('deleted');
  });

  it('deletes PENDING booking and its booking_confirmations cascade (Codex round1 P1)', async () => {
    const create = createMockResponse();
    await createHandler(makeCreateReq(), create);
    expect(create.statusCode).toBe(201);
    const bookingId = (create.body as { booking: { id: string } }).booking.id;
    const { rows: confRows } = await pool.query(
      `INSERT INTO booking_confirmations (booking_id, type, status) VALUES ($1, 't_24h', 'pending')
       RETURNING id`,
      [bookingId],
    );
    const confId = confRows[0].id;

    stubAuthFetchOk();
    const del = createMockResponse();
    await deleteAccountHandler(makeDeleteReq(), del);
    expect(del.statusCode).toBe(200);

    const { rows: bRows } = await pool.query('SELECT 1 FROM bookings WHERE id = $1', [bookingId]);
    expect(bRows).toHaveLength(0); // pending-бронь удалена (Task 4 шаг3)
    const { rows: cRows } = await pool.query('SELECT 1 FROM booking_confirmations WHERE id = $1', [
      confId,
    ]);
    expect(cRows).toHaveLength(0); // каскад FK ON DELETE CASCADE — реально сработал
  });

  it('REAL concurrency: delete-account queued first, create queued second on the same parents row -> delete 200, create 409, no orphan booking (C10, design §11)', async () => {
    // Barrier-паттерн Плана B (bookings.integration.test.ts): внешний L держит
    // FOR UPDATE на parents-строке; delete и create встают в lock-очередь (оба
    // лочат parents первым шагом C10); L отпускает -> FIFO: delete первым,
    // create вторым видит уже вставленный deletion-флаг -> 409.
    stubAuthFetchOk();
    const L: PoolClient = await pool.connect();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pDel: Promise<unknown> | undefined, pCreate: Promise<unknown> | undefined;
    const delRes: MockVercelResponse = createMockResponse();
    const createRes: MockVercelResponse = createMockResponse();
    try {
      await L.query('BEGIN');
      await L.query('SELECT id FROM parents WHERE id = $1 FOR UPDATE', [REQ_ID]);

      const countWaiters = async () => {
        await L.query('SELECT pg_stat_clear_snapshot()');
        const { rows } = await L.query(
          `SELECT count(*)::int AS n FROM pg_stat_activity
           WHERE application_name = $1 AND pid <> pg_backend_pid()
             AND wait_event_type = 'Lock' AND state = 'active'
             AND query ~* 'FROM\\s+parents' AND query ~* 'FOR\\s+UPDATE'`,
          [APP_NAME],
        );
        return rows[0].n as number;
      };

      pDel = deleteAccountHandler(makeDeleteReq(), delRes);
      await waitFor(async () => (await countWaiters()) === 1, 5000); // delete в очереди первым
      pCreate = createHandler(makeCreateReq(), createRes);
      await waitFor(async () => (await countWaiters()) === 2, 5000); // create вторым

      await L.query('ROLLBACK'); // отпускаем барьер -> FIFO-сериализация
      const guard = new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error('delete/create race deadlock/timeout')), 10000);
      });
      await Promise.race([Promise.all([pDel, pCreate]), guard]);
    } finally {
      clearTimeout(timer);
      await L.query('ROLLBACK').catch(() => {});
      L.release();
      await Promise.allSettled([pDel, pCreate].filter(Boolean) as Promise<unknown>[]);
    }

    expect(delRes.statusCode).toBe(200);
    expect(createRes.statusCode).toBe(409);
    expect(String((createRes.body as { error: string }).error)).toMatch(/delet/i);
    // Нет «висячей» брони после lifecycle-delete (§11).
    const { rows } = await pool.query(
      `SELECT 1 FROM bookings WHERE request_id = $1 AND status NOT IN ('cancelled')`,
      [REQ_ID],
    );
    expect(rows).toHaveLength(0);
  }, 20_000);

  it('repeat delete-account on already deleted -> 200 no-op (idempotent, PC3)', async () => {
    stubAuthFetchOk();
    const first = createMockResponse();
    await deleteAccountHandler(makeDeleteReq(), first);
    expect(first.statusCode).toBe(200);

    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }));
    vi.stubGlobal('fetch', fetchMock);
    const second = createMockResponse();
    await deleteAccountHandler(makeDeleteReq(), second);
    expect(second.statusCode).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled(); // deleted-guard: Auth не трогаем повторно

    const { rows } = await pool.query('SELECT state FROM account_deletions WHERE user_id = $1', [
      PARENT_UID,
    ]);
    expect(rows[0].state).toBe('deleted'); // НЕ воскресла в db_done (resurrection-guard)
  });
});
```

- [ ] **Step 2: Run**

Run: `INTEGRATION_PG_URL=postgres://…local… npx vitest run api/delete-account.integration.test.ts`
Expected: PASS против локального PG. Без env — `skip`.

- [ ] **Step 3: Commit**

```bash
git add api/delete-account.integration.test.ts
git commit -m "test(bli139): PG-backed integration — delete-account lifecycle cascade + create-vs-delete race"
```

---

### Task 7: Deletion write barrier — RESTRICTIVE RLS (PC6, fail-closed)

**Files:**
- Create: `supabase/migrations/20260702210000_bli139_deletion_write_barrier.sql`
- Modify: `api/delete-account.integration.test.ts` (добавить barrier-тест)

**Interfaces:**
- Produces: `public.account_in_deletion()` — `SECURITY DEFINER` helper (STABLE, boolean): существует ли строка `account_deletions` для `auth.uid()`. Нужен потому, что у `authenticated` нет grants на `account_deletions` (REVOKE в Plan A миграции) — прямой subquery в политике вернул бы пусто/ошибку.
- Produces: RESTRICTIVE-политика `<table>_deletion_barrier` на каждой user-writable таблице из PC6-инвентаризации. AND-семантика: существующие permissive-политики не переписываются и не ослабляются. `FOR ALL` — блокирует и чтение: аккаунт в удалении выглядит мёртвым (fail-closed), уцелевший контрагент не затронут (барьер срабатывает только на `auth.uid()` уходящего).
- Миграция — локальный файл на ветке; прод-apply остаётся закрытым гейтом (как Plan A/B DDL).

- [ ] **Step 1: Write the failing test (append в `api/delete-account.integration.test.ts`)**

```ts
  it('deletion write barrier: existing JWT cannot restore data after flag (PC6, fail-closed)', async () => {
    await pool.query(`INSERT INTO account_deletions (user_id, state) VALUES ($1, 'db_done')`, [
      PARENT_UID,
    ]);
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: PARENT_UID, role: 'authenticated' }),
      ]);
      await c.query('SET LOCAL ROLE authenticated');

      // Главный путь восстановления (storage.ts:259 upsert parents): UPDATE под
      // RESTRICTIVE USING(false) видит 0 строк — silently no-op, данные не воскресли.
      const upd = await c.query(
        `UPDATE parents SET payload = '{"resurrected":true}'::jsonb WHERE user_id = $1`,
        [PARENT_UID],
      );
      expect(upd.rowCount).toBe(0);

      // INSERT под RESTRICTIVE WITH CHECK(false) -> 42501 RLS violation.
      await expect(
        c.query(`INSERT INTO parents (id, payload, user_id) VALUES ($1, '{}'::jsonb, $2)`, [
          `${REQ_ID}_resurrect`,
          PARENT_UID,
        ]),
      ).rejects.toMatchObject({ code: '42501' });

      await c.query('ROLLBACK');
    } finally {
      await c.query('ROLLBACK').catch(() => {});
      c.release();
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `INTEGRATION_PG_URL=postgres://…local… npx vitest run api/delete-account.integration.test.ts -t 'write barrier'`
Expected: FAIL — `upd.rowCount` = 1 (барьера нет, UPDATE проходит по permissive `parents_update_own`).

- [ ] **Step 3: Write the migration**

```sql
-- supabase/migrations/20260702210000_bli139_deletion_write_barrier.sql
-- BLI-139 / План C Task 7 (PC6): fail-closed write barrier для аккаунтов в удалении.
-- После появления строки в account_deletions (любой state) существующий JWT уходящего
-- юзера не может восстановить/читать данные прямыми Supabase-путями. RESTRICTIVE
-- политики AND-ятся с permissive — существующие политики НЕ меняются.
-- service_role не затронут (BYPASSRLS) — серверные lifecycle-пути работают.
-- Auth-ban в delete-account.ts — только defense-in-depth поверх этого барьера.

CREATE OR REPLACE FUNCTION public.account_in_deletion()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_deletions WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.account_in_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_in_deletion() TO authenticated, anon;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'parents','nannies','bookings','booking_confirmations',
    'chat_threads','chat_messages','chat_participants',
    'support_tickets','support_messages','matching_outcomes'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_deletion_barrier', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
       USING (NOT public.account_in_deletion())
       WITH CHECK (NOT public.account_in_deletion())',
      t || '_deletion_barrier', t
    );
  END LOOP;
END $$;
```

- [ ] **Step 4: Verify list against live RLS enablement (перед apply)**

Run: `grep -c "ENABLE ROW LEVEL SECURITY" supabase/migrations/00000000000000_remote_schema.sql` и точечно `grep "public\.\"\?<table>\"\? ENABLE ROW" …` для каждой из 10 таблиц.
Expected: все 10 имеют `ENABLE ROW LEVEL SECURITY` (политика без RLS-enable не действует — если какая-то не включена, добавить `ALTER TABLE … ENABLE ROW LEVEL SECURITY` в миграцию).

- [ ] **Step 5: Apply migration to LOCAL PG + run test**

Run: `psql "$INTEGRATION_PG_URL" -f supabase/migrations/20260702210000_bli139_deletion_write_barrier.sql`
Затем: `INTEGRATION_PG_URL=… npx vitest run api/delete-account.integration.test.ts`
Expected: PASS (все тесты файла, включая barrier). Прод НЕ трогаем.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260702210000_bli139_deletion_write_barrier.sql api/delete-account.integration.test.ts
git commit -m "feat(bli139): deletion write barrier — RESTRICTIVE RLS через account_in_deletion() (PC6, fail-closed)"
```

---

## Postconditions (Плана C)

- `updateBookingStatus`/`getBookingsForUser`/`getAllBookings` — server-authoritative, throw-контракт, local-first слой удалён (§7 закрыт).
- Все 3 клиентских status-writer'а (`AdminPanel`/`AdminPage`/`BookingsTab`) переведены на новый контракт — снимает P1 из Плана B round6 (cutover-бандл C0 теперь имеет все writer'ы для снятия).
- `delete-account.ts` больше не роняет `DELETE auth.users` у юзеров с бронями — BLI-139 (Urgent, живой 152-ФЗ баг) закрыт.
- `account_deletions` наполняется реальными lifecycle-записями → **deletion-guard в Плане B (create) перестаёт дремать**.
- Reconciler добивает транзиентные Auth-delete сбои без ручного вмешательства (кроме `state='failed'`, которое требует алерт/эскалацию — вне этого плана); reject/404-семантика по PC7, completion — ownership-guarded.
- **Fail-closed deletion barrier (PC6):** существующий JWT после `deleting|db_done` не может восстановить данные ни одним прямым Supabase write-path (RESTRICTIVE RLS, Task 7); Auth-ban — вторая линия (defense-in-depth), не единственная защита.

## Out of scope (следующие планы/решения)

- План D: `booking_confirmations` server-authoritative + recipient authz.
- План E: contract-lockdown (RLS split, REVOKE, NOT NULL, partial unique index) — прод-cutover бандлит его со ВСЕМИ writer'ами (теперь готовы после этого плана).
- `state='failed'` алертинг/dashboard (ops-видимость зависших удалений) — не специфицирован здесь.
- Реальное включение cron-расписания в проде — код готов (`vercel.json`), активация = деплой (отдельный owner-гейт, вне этого плана).
- «14-дневный закрытый пилот» — конфликтует с owner-гейтом BLI-113 (RU-core не готов); таймлайн-решение вне инженерного скоупа этого плана.
