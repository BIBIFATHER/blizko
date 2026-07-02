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
- Транзакции: `pool.connect()` → `BEGIN`/`COMMIT`/`ROLLBACK`, `client.release()` в `finally`.
- Ошибки — через `logError` (`api/_logScrub.ts`), не светить ПДн.
- Тесты: Vitest mock-паттерн (`api/bookings.test.ts`/`api/cron/_ghosted-outcomes.ts` как образец), PG-backed integration (`INTEGRATION_PG_URL`, `describe.skipIf`) для Task 6.
- Компонентные тесты для UI-wiring (Task 3) НЕ пишутся — в этой кодовой базе AdminPanel/AdminPage/BookingsTab не имеют unit-тестов (E2E-smoke — BLI-55/BLI-103, вне этого плана); верификация Task 3 — `npm run typecheck && npm run lint && npm run build`, тот же паттерн что Task 6 Плана B (AdminCuratorTab wiring).
- Прод/DDL/cutover — **НЕ применять**. Только код+тесты локально/на ветке, тот же maker/checker с Codex (round-по-round, стоп-правило: 2 цикла без owner-решения → эскалация), TDD.
- Команды: `npm test -- <file>`, `npm run typecheck`, `npm run lint`, `npm run build`.

---

## File Structure

- `src/services/booking.ts` — `updateBookingStatus` (Task 1, throw-контракт, `expected_status`), `getBookingsForUser`/`getAllBookings` (Task 2, no local-first), удаление local-storage helpers (Task 2).
- `src/services/booking.test.ts` — расширение (Task 1/2).
- `src/components/admin/AdminBookingsTab.tsx` — `onStatusChange` передаёт `expected_status = booking.status` (Task 3).
- `src/components/AdminPanel.tsx`, `src/pages/admin/AdminPage.tsx` — try/catch + `reportError` вокруг status-change и `loadData` (Task 3).
- `src/components/profile/BookingsTab.tsx` — `expected_status`-передача + локальный error-state (Task 3).
- `api/auth/delete-account.ts` — полный rewrite lifecycle (Task 4).
- `api/auth/delete-account.test.ts` — новый (Task 4).
- `api/cron/_reconcile-account-deletions.ts` — новый reconciler (Task 5).
- `api/cron/_reconcile-account-deletions.test.ts` — новый (Task 5).
- `api/cron/index.ts` — добавить роут `job=reconcile-account-deletions` (Task 5).
- `vercel.json` — добавить cron-запись (код, НЕ активация — schedule не запустится без деплоя) (Task 5).
- `api/delete-account.integration.test.ts` — PG-backed (Task 6).

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
  if ((toStatus === 'confirmed' || toStatus === 'completed') && expectedStatus !== toStatus) {
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

- [ ] **Step 3: Rewrite readers, remove local-storage layer**

Заменить весь блок `src/services/booking.ts` от `const STORAGE_KEY = ...` (строка 18) до конца `getAllBookings` (строка 249) на:

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
  if ((toStatus === 'confirmed' || toStatus === 'completed') && expectedStatus !== toStatus) {
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
Expected: PASS (все тесты — 3 create + 4 status + 4 readers = 11).

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
- Modify: `src/components/admin/AdminBookingsTab.tsx:15,52-61`, `src/components/AdminPanel.tsx:58,90-98`, `src/pages/admin/AdminPage.tsx:113,344-352`, `src/components/profile/BookingsTab.tsx:1-20,151-158,225-260`

**Interfaces:**
- Consumes: `updateBookingStatus(bookingId, expectedStatus, toStatus)` из Task 1, `getAllBookings()` из Task 2 (throw-контракт).

- [ ] **Step 1: AdminBookingsTab — передать expected_status**

`src/components/admin/AdminBookingsTab.tsx:15` заменить:
```ts
onStatusChange: (bookingId: string, expectedStatus: Booking['status'], newStatus: Booking['status']) => void;
```
`src/components/admin/AdminBookingsTab.tsx:60` заменить `onStatusChange(booking.id, newStatus);` на:
```ts
onStatusChange(booking.id, booking.status, newStatus);
```

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

- [ ] **Step 4: BookingsTab.tsx — participant error handling**

`src/components/profile/BookingsTab.tsx` добавить состояние ошибки после `const [loading, setLoading] = useState(true);`:
```ts
const [statusError, setStatusError] = useState<string | null>(null);
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
git add src/components/admin/AdminBookingsTab.tsx src/components/AdminPanel.tsx src/pages/admin/AdminPage.tsx src/components/profile/BookingsTab.tsx
git commit -m "feat(bli141): UI wiring — expected_status передаётся из booking.status, error handling вокруг throw-контракта"
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
vi.mock('../_db.js', () => ({ getDbPool: vi.fn(() => ({ connect, query: vi.fn() })) }));

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
        'UPDATE account_deletions': { rows: [], rowCount: 1 },
        BEGIN: { rows: [] },
        COMMIT: { rows: [] },
        ROLLBACK: { rows: [] },
      }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, text: async () => '' })),
    );
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('DB commits, Auth-delete fails -> 202 pending (NOT rollback, NOT 500)', async () => {
    connect.mockResolvedValue(
      mockClient({
        'FROM parents': { rows: [{ user_id: UID }], rowCount: 1 },
        'FROM nannies': { rows: [], rowCount: 0 },
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

  it('locks own parents/nannies row even with zero bookings (C10, round8 fix)', async () => {
    const client = mockClient({
      'FROM parents': { rows: [{ user_id: UID }], rowCount: 1 },
      'FROM nannies': { rows: [], rowCount: 0 },
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

    // БД-часть готова -> db_done, затем COMMIT (PC3: БД-коммит НЕ зависит от Auth-delete).
    await client.query(
      `UPDATE account_deletions SET state = 'db_done', updated_at = now() WHERE user_id = $1`,
      [userId],
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    logError('[delete-account] DB phase failed:', e);
    return res.status(500).json({ error: 'Internal error' });
  } finally {
    client.release();
  }

  // Auth-delete ВНЕ транзакции (PC4): БД-часть уже необратимо закоммичена. Сбой здесь
  // НЕ откатывает БД — оставляет state='db_done', reconciler (Task 5) добьёт retry.
  const base = getSupabaseUrl();
  const delResp = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getSupabaseAdminHeaders(),
  });

  if (!delResp.ok) {
    const err = await delResp.text().catch(() => 'unknown');
    logError(`[delete-account] Auth-delete failed for ${userId} (db_done, will retry):`, err);
    await pool
      .query(
        `UPDATE account_deletions SET attempts = attempts + 1, last_error = $2, updated_at = now()
         WHERE user_id = $1`,
        [userId, String(err).slice(0, 500)],
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
Expected: PASS (4/4).

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

  it('retries Auth-delete for leased db_done rows; success -> deleted', async () => {
    query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT') && sql.includes('FOR UPDATE SKIP LOCKED')) {
        return { rows: [{ user_id: 'u1', attempts: 0 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '' })));
    const res = createMockResponse();
    await handler(makeReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, deleted: 1, stillPending: 0, failed: 0 });
    const deletedCall = query.mock.calls.find(
      (c) => String(c[0]).includes("state = 'deleted'") && String(c[0]).includes('u1'.length ? '' : ''),
    );
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
      const delResp = await fetch(`${base}/auth/v1/admin/users/${row.user_id}`, {
        method: 'DELETE',
        headers: getSupabaseAdminHeaders(),
      });

      if (delResp.ok) {
        await pool.query(
          `UPDATE account_deletions SET state = 'deleted', lease_until = NULL, updated_at = now()
           WHERE user_id = $1`,
          [row.user_id],
        );
        deleted += 1;
        continue;
      }

      const err = await delResp.text().catch(() => 'unknown');
      const nextAttempts = row.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        await pool.query(
          `UPDATE account_deletions
           SET state = 'failed', attempts = $2, last_error = $3, lease_until = NULL, updated_at = now()
           WHERE user_id = $1`,
          [row.user_id, nextAttempts, String(err).slice(0, 500)],
        );
        failed += 1;
      } else {
        await pool.query(
          `UPDATE account_deletions
           SET attempts = attempts + 1, last_error = $2, lease_until = NULL, updated_at = now()
           WHERE user_id = $1`,
          [row.user_id, String(err).slice(0, 500)],
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
Expected: PASS (4/4).

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

**Interfaces:** Прогон против реального PG (`INTEGRATION_PG_URL`, `describe.skipIf`). Проверяет реальный DELETE-каскад `booking_confirmations`, реальную анонимизацию, и concurrency `create` vs `delete-account` (design §11: "create видит deletion-флаг → 409").

- [ ] **Step 1: Harness + happy-path**

```ts
// api/delete-account.integration.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { Pool } from 'pg';

const PG_URL = process.env.INTEGRATION_PG_URL;
const REQ_ID = `it_del_req_${process.pid}_${Date.now()}`;
const NANNY_ID = `it_del_nanny_${process.pid}_${Date.now()}`;
const PARENT_UID = crypto.randomUUID();
const NANNY_UID = crypto.randomUUID();

let pool: Pool;

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
    pool = new Pool({ connectionString: PG_URL, max: 3 });
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

  it('deletes account with an active booking: booking cancelled + parent side anonymized', async () => {
    const create = createMockResponse();
    await createHandler(
      {
        method: 'POST',
        headers: {},
        query: { op: 'create' },
        body: {
          request_id: REQ_ID,
          nanny_entity_id: NANNY_ID,
          idempotency_key: crypto.randomUUID(),
          date: '2026-08-01',
        },
      } as unknown as VercelRequest,
      create,
    );
    expect(create.statusCode).toBe(201);
    const bookingId = (create.body as { booking: { id: string } }).booking.id;

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '' })));
    const del = createMockResponse();
    await deleteAccountHandler({ method: 'DELETE', headers: {} } as unknown as VercelRequest, del);
    expect(del.statusCode).toBe(200);

    const { rows } = await pool.query('SELECT status, parent_id FROM bookings WHERE id = $1', [
      bookingId,
    ]);
    expect(rows[0].status).toBe('cancelled');
    expect(rows[0].parent_id).toBeNull();
  });

  it('create sees deletion-flag mid-flight -> 409 (design §11 concurrency)', async () => {
    await pool.query(
      `INSERT INTO account_deletions (user_id, state) VALUES ($1, 'deleting')`,
      [PARENT_UID],
    );
    const create = createMockResponse();
    await createHandler(
      {
        method: 'POST',
        headers: {},
        query: { op: 'create' },
        body: {
          request_id: REQ_ID,
          nanny_entity_id: NANNY_ID,
          idempotency_key: crypto.randomUUID(),
          date: '2026-08-01',
        },
      } as unknown as VercelRequest,
      create,
    );
    expect(create.statusCode).toBe(409);
    expect(String((create.body as { error: string }).error)).toMatch(/delet/i);
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

## Postconditions (Плана C)

- `updateBookingStatus`/`getBookingsForUser`/`getAllBookings` — server-authoritative, throw-контракт, local-first слой удалён (§7 закрыт).
- Все 3 клиентских status-writer'а (`AdminPanel`/`AdminPage`/`BookingsTab`) переведены на новый контракт — снимает P1 из Плана B round6 (cutover-бандл C0 теперь имеет все writer'ы для снятия).
- `delete-account.ts` больше не роняет `DELETE auth.users` у юзеров с бронями — BLI-139 (Urgent, живой 152-ФЗ баг) закрыт.
- `account_deletions` наполняется реальными lifecycle-записями → **deletion-guard в Плане B (create) перестаёт дремать**.
- Reconciler добивает транзиентные Auth-delete сбои без ручного вмешательства (кроме `state='failed'`, которое требует алерт/эскалацию — вне этого плана).

## Out of scope (следующие планы/решения)

- План D: `booking_confirmations` server-authoritative + recipient authz.
- План E: contract-lockdown (RLS split, REVOKE, NOT NULL, partial unique index) — прод-cutover бандлит его со ВСЕМИ writer'ами (теперь готовы после этого плана).
- `state='failed'` алертинг/dashboard (ops-видимость зависших удалений) — не специфицирован здесь.
- Реальное включение cron-расписания в проде — код готов (`vercel.json`), активация = деплой (отдельный owner-гейт, вне этого плана).
- «14-дневный закрытый пилот» — конфликтует с owner-гейтом BLI-113 (RU-core не готов); таймлайн-решение вне инженерного скоупа этого плана.
