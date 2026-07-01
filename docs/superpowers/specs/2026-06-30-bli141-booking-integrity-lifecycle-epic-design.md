# BLI-141 — Booking integrity & lifecycle (server-authoritative) — Единый дизайн эпика

Дата: 2026-06-30 · Linear: BLI-141 (эпик) → BLI-138 / BLI-139 / BLI-140 ·
Блокирует: BLI-134 (provisioning) · Связано: BLI-124, RISK-009.

Этот документ — канонический дизайн эпика. Он заменяет
`2026-06-30-bli138-booking-integrity-design.md` (тот оставлен указателем).
Свёрнуты: Codex review #1 (D1-D8), #2 (10 must-fix), консультация по удалению
(152-ФЗ, гибрид), **#3 + #4 (P1/P2 спец-точность), owner-решение по state-machine
(няня вручную), blizko-lawyer юр-гейт (Conditional Go)**. Текущая редакция: **ред. 3**.
Все находки верифицированы по коду/нормам.

## 1. Резолюция корневого вопроса — идентичность

Исследование схемы (`supabase/migrations/00000000000000_remote_schema.sql`) сняло
главный блокер: домены идентичности **корректны и консистентны**.

| Таблица | Ключи |
|---|---|
| `parents` | `id TEXT` (entity-id заявки) · `user_id UUID DEFAULT auth.uid() NOT NULL` |
| `nannies` | `id TEXT` (entity-id профиля) · `user_id UUID DEFAULT auth.uid() NOT NULL` |
| `bookings` | `parent_id UUID→auth.users` · `nanny_id UUID→auth.users` · `request_id TEXT→parents(id)` |
| `booking_confirmations` | `booking_id UUID→bookings(id) ON DELETE CASCADE` |

Маппинг: `bookings.parent_id = parents.user_id`, `bookings.nanny_id =
nannies.user_id`, `bookings.request_id = parents.id`.

**Баг чисто клиентский:** `AdminCuratorTab.tsx:94-95` fallback `?? id` пихает
entity-id (TEXT) в UUID-колонку → FK к auth.users отвергает → local-only ложный
success. Схему НЕ переделываем.

**Назначения как сущности нет:** `rankedNannies` (`AdminCuratorTab.tsx:68-80`)
считается динамически; booking — первая фиксация выбора куратора. Сервер валидирует
**eligibility** (строки parents/nannies существуют и actionable), а не «связь».

## 2. Модель данных (целевая)

`parent_id`, `nanny_id`, `request_id` остаются **nullable** (см. §6 lifecycle —
NOT NULL несовместим с физическим удалением auth.users и противоречит
существующему паттерну анонимизации `matching_outcomes`/`chat_messages.sender_id`).

Целостность держится **одним canonical conditional CHECK для активных** броней
(active = `status IN ('pending','confirmed','active')`; набор фиксирован здесь и
переиспользуется в partial unique index §4 и в lifecycle §6):

```sql
-- canonical: активная бронь обязана иметь обе стороны, request_id И date
ALTER TABLE bookings ADD CONSTRAINT bookings_active_complete CHECK (
  status NOT IN ('pending','confirmed','active')
  OR (parent_id IS NOT NULL AND nanny_id IS NOT NULL
      AND request_id IS NOT NULL AND date IS NOT NULL)
);
-- запрет self-booking (NULL-safe)
ALTER TABLE bookings ADD CONSTRAINT bookings_distinct_parties CHECK (
  parent_id IS NULL OR nanny_id IS NULL OR parent_id <> nanny_id
);
```

`date IS NOT NULL` входит в canonical CHECK (P2 Codex #3 — раньше проза и SQL
расходились; теперь один источник). Активная бронь обязана иметь обе стороны (цель
BLI-134 — на момент провижининга бронь активна → оба uid есть). Терминальная
(completed/cancelled) может иметь nulled-сторону после удаления аккаунта.

Новые колонки:

- `idempotency_key TEXT UNIQUE` — добавляется **nullable** (см. §9 backfill);
  `NOT NULL` ставится только в фазе contract после детерминированного backfill
  существующих строк. См. §4 семантику.
- `idempotency_fingerprint TEXT` — canonical hash полей запроса для diff-payload
  детекции (§4).
- `nanny_profile_id TEXT REFERENCES nannies(id) ON DELETE SET NULL` — провенанс
  выбора няни для аудита (request_id уже даёт parent-провенанс).
- `parent_erased_at`, `nanny_erased_at timestamptz` — отметки обезличивания (§6).

FK пересоздать с `ON DELETE SET NULL`: `parent_id`, `nanny_id` → auth.users;
`request_id` → parents; `nanny_profile_id` → nannies. **Важно (Codex #3):**
`ON DELETE SET NULL` на `request_id`/`parent_id`/`nanny_id` сам по себе НЕ должен
обнулять поле у *активной* брони (иначе нарушит canonical CHECK) — поэтому удаление
parents/auth.users строки требует, чтобы lifecycle (§6) сперва перевёл активные
брони в `cancelled`. Порядок гарантируется функцией удаления, FK SET NULL — только
defense-in-depth для уже терминальных строк.

## 3. Create — server-authoritative provenance (BLI-138)

Endpoint `api/bookings.ts` POST, `verifyBearerAdmin` (только куратор).

Клиент шлёт: `request_id` (=parents.id), nanny **entity-id** (=nannies.id),
`idempotency_key`, бизнес-поля (date, amount). **Не** auth-uid.

Сервер (порядок нормативен — совпадает с Планом B Task 1):

0. **валидация формата ДО транзакции** (Codex План B round2/3): `date` строго
   `YYYY-MM-DD`+реальная дата; `idempotency_key` UUID; `amount` present-but-not-string
   → `400`, string → канон `NNNN.NN`. Любой невалид → `400` до `BEGIN`.
1. **idempotency-first (§4, Codex План B round2):** `SELECT … WHERE idempotency_key`
   **ДО mutable-guards**. Нашли+fingerprint совпал → `200` replay; fingerprint иной
   → `409`. Guard-независимо (bounded-replay §4: заявка/аккаунт могли измениться).
2. lock/load `parents WHERE id = request_id` (`FOR UPDATE`) и
   `nannies WHERE id = nanny_entity_id` (`FOR UPDATE`) → `404` если нет.
3. вывести `parent_id = parents.user_id`, `nanny_id = nannies.user_id`; если любой
   NULL → `422` (нет auth-аккаунта).
4. eligibility: `parents.payload->>'status' ∈ {NULL,'new','in_review'}`
   (whitelist, зеркало `actionableParents`); иначе → `409`.
5. **deletion-guard (Codex #3 гонка create-vs-delete):** **любая** строка
   `account_deletions` для parent_id ИЛИ nanny_id — **включая `state='deleted'`** —
   → `409` (удалённый аккаунт не должен получать новую бронь). Lifecycle (§6)
   ставит флаг под тем же локом, что снимает гонку «вставка между cleanup и Auth-delete».
6. pair-cardinality (§4).
7. insert server-генерируемых полей (`parent_id`, `nanny_id`, `nanny_profile_id`,
   `status='pending'`, `idempotency_key`, `idempotency_fingerprint`, серверные timestamp);
   на `23505 bookings_idempotency_key_key` (гонка) → reread → `200`/`409`.

Вернуть реально сохранённую строку или явную ошибку. **Без entity-id fallback,
без local-only success.**

**Сериализация:** create и lifecycle-delete сериализуются по паре участников
через `FOR UPDATE` на строках parents/nannies (шаг 2) + durable deletion-флаг
(шаг 5). Это закрывает create/create (idempotency + partial unique §4) и
create/delete (deletion-guard) гонки без глобального лока.

### 3.1 Таблица account_deletions (durable deletion workflow, Codex #4 #6)

Конкретная схема (не альтернатива):

```sql
CREATE TABLE account_deletions (
  user_id     uuid PRIMARY KEY,          -- НЕ FK к auth.users (строка переживает удаление identity)
  state       text NOT NULL DEFAULT 'deleting'
              CHECK (state IN ('deleting','db_done','deleted','failed')),
  attempts    int  NOT NULL DEFAULT 0,
  lease_until timestamptz,               -- worker-lease, чтобы два reconciler не брали одну строку
  last_error  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

- **Нет FK к `auth.users`** (Codex #4 #6) — строка должна жить после удаления
  identity (для reconciler/аудита).
- **State-machine:** `deleting` → (БД-cleanup COMMIT) → `db_done` → (Auth-delete ok)
  → `deleted`; ошибка Auth-delete → остаётся `db_done`, растёт `attempts`; после N
  попыток → `failed` + alert.
- **Lock order (единый межпроцессный, против deadlock, Codex План B round6 P1):**
  строго по приоритету ТАБЛИЦ, одинаково в create И lifecycle:
  **`parents` → `nannies` → `account_deletions` → `bookings`**; при нескольких
  строках одной таблицы — по возрастанию `id` внутри неё. НЕ сортировать по
  id-значению МЕЖДУ таблицами (иначе create=parent-first и lifecycle=id-sort могут
  взять разные первые строки → deadlock). Create лочит `parents(request_id)` затем
  `nannies(nanny_entity_id)` — это и есть канон; lifecycle обязан следовать тому же.
- **Reconciler** (cron/worker): берёт `db_done` с истёкшим `lease_until`, ставит
  lease, повторяет Auth-delete, обновляет state. Idempotent.
- **Create deletion-guard (§3 шаг 5):** отвергает create при **любой** строке
  `account_deletions` на сторону — **включая `state='deleted'`** (Codex План B
  round2): полностью удалённый аккаунт не должен получать новую бронь. Guard дремлет,
  пока lifecycle C не наполнит таблицу.

## 4. Идемпотентность и cardinality (DB-контракт)

Семантика (Codex #3/#4):

- **Ключ:** `idempotency_key` — клиент-генерируемый, **глобально уникальный**
  (UUID/ULID), валидируется на входе. Индекс `UNIQUE (idempotency_key)` —
  глобальный (scope-claim «по создателю» убран, Codex #4 #5: created_by не хранился
  и противоречил глобальному индексу). Глобальная уникальность достаточна, т.к.
  ключ генерится клиентом случайно.
  - **Один ключ на один intent (Codex План B round1/2).** UUID генерится **один
    раз на один intent** (одно логическое действие пользователя) и
    **переиспользуется во ВСЕХ транспортных ретраях этого intent**; НЕ новый UUID
    на каждую сетевую попытку и НЕ детерминированный hash от бизнес-полей (это
    превратило бы токен в бизнес-дедуп). Новый intent = новый UUID. Бизнес-дедуп
    «одна активная бронь на пару» обеспечивает pair-cardinality, не ключ.
  - **Bounded/best-effort replay (Опция B, owner-решение 2026-07-01, Codex round3).**
    Гарантия idempotent-replay ограничена **временем жизни строки `bookings`**
    (evidence — сама строка). Lifecycle §6 **удаляет** unpaid-pending и обезличивает
    терминальные → после lifecycle-delete replay **НЕ гарантируется**. Приемлемо:
    intent-ретраи — секунды, удаление аккаунта — редкое осознанное событие; окно
    коллизии пренебрежимо. Отдельное durable idempotency-хранилище НЕ вводится
    (стало бы само 152-ФЗ-объектом; YAGNI). Инварианта «lifecycle не DELETE-ит
    booking» нет — он противоречил бы §6.
- **Fingerprint:** `idempotency_fingerprint` — server-side вычисляемый hash
  (algo+версия зафиксированы, напр. `sha256:v1`) над **canonical-сериализацией**
  полей запроса. Канонизация (Codex #4 #7):
  - `request_id`: as-is TEXT;
  - `nanny_entity_id`: as-is TEXT;
  - `date`: нормализовать в UTC ISO-8601 `date` (без локального TZ);
  - `amount`: нормализовать в decimal-строку фикс. формата (`NNNN.NN`, точка,
    без валютного символа) — требует типизации `amount` (см. открытые хвосты);
  - null → литерал `\0`; поля join через `\x1f`; UTF-8 байты → hash.
- **Два РАЗНЫХ конфликта (Codex #4 #4) — различать по имени constraint:**
  - violation `bookings_idempotency_key_key` → re-read строки по ключу → сравнить
    `idempotency_fingerprint`: совпал → существующая строка `200` (идемпотентно);
    не совпал → `409` (тот же ключ, другой payload);
  - violation partial pair index `bookings_active_pair_uq` → re-read **активной**
    брони пары → вернуть её как `409 Conflict` (активная бронь уже существует;
    это НЕ idempotent-replay, ключи разные).
- Cardinality: `CREATE UNIQUE INDEX bookings_active_pair_uq ON bookings
  (parent_id, nanny_id) WHERE status IN ('pending','confirmed','active')`
  (тот же canonical active-набор, что в CHECK §2).

## 5. Статусы — actor state-machine (BLI-138)

Endpoint смены статуса (POST, `verifyBearerUser` участник ИЛИ `verifyBearerAdmin`).
Меняется ТОЛЬКО `status`; `parent_id`/`nanny_id` никогда. Conditional
`UPDATE ... WHERE id=? AND status=expected` (optimistic lock).

Actor-transition matrix (owner-решение 2026-06-30: `confirmed→active` и
`active→completed` двигает **няня вручную**, без cron/system):

| Из → В | parent | nanny | curator |
|---|---|---|---|
| pending → confirmed | — | ✓ | ✓ |
| pending → cancelled | ✓ | ✓ | ✓ |
| confirmed → active (няня вышла на смену) | — | ✓ | ✓ |
| confirmed → cancelled | ✓ | ✓ | ✓ |
| active → completed (смена завершена) | — | ✓ | ✓ |
| active → cancelled | ✓ | ✓ | ✓ |

Сервер проверяет actor по auth-uid (родитель = `parent_id`, няня = `nanny_id`,
куратор = `verifyBearerAdmin`). Три РАЗНЫХ исхода (не смешивать, единый контракт с
Планом B C7): (a) **роль не разрешена** для допустимого перехода `(from→to)` есть в
матрице, но роль ✗ → **`403`**; (b) запрошенная пара `(expected_status → to_status)`
**вообще не строка матрицы** (невозможный переход) → **`400`**; (c) реальный статус
≠ `expected_status` (параллельная смена) → optimistic-lock `WHERE status=expected`
вернёт 0 строк → **`409`** (stale).
Cron не используется (нет авто-`completed`); зависшая `active` — продуктовый риск,
принят owner. Если позже понадобится авто-завершение — отдельная задача.

## 6. Lifecycle удаления (BLI-139, 152-ФЗ) — приоритет Urgent

**Живой баг:** `delete-account.ts:41-69` не трогает bookings; `DELETE auth.users`
(стр.66) падает по FK NO ACTION у любого юзера с бронью → юзер с бронью **не может
удалить аккаунт сейчас** = нарушение 152-ФЗ в проде.

Политика (гибрид + blizko-lawyer Conditional Go, нормы верифицированы —
152-ФЗ ст.21, ФЗ-402 ст.29):

Порядок удаления (атомарно, в `delete-account`, ДО `DELETE auth.users`).
**Два инварианта порядка:** (i) lock order C10 (`parents`→`nannies`→
`account_deletions`→`bookings`) — тот же, что в create, иначе deadlock (Codex round6/7);
(ii) удалять unpaid-pending ДО массовой отмены, иначе шаг отмены сделает их cancelled
и шаг удаления их не найдёт (Codex #4 #2).

0. **Discover без row-lock:** SELECT id/пары затронутых bookings уходящей стороны
   (какие `parents.id`/`nannies.id` участвуют) — только чтение, без `FOR UPDATE`.
1. **Lock пары в порядке C10:** `SELECT … FOR UPDATE` на нужных `parents` (по `id` asc),
   затем на `nannies` (по `id` asc). Это сериализует create↔delete по паре (create
   лочит те же строки тем же порядком) — **этим** закрывается гонка create-vs-delete,
   НЕ флагом-первым.
2. **Поставить deletion-флаг:** upsert `account_deletions.state='deleting'` (§3.1)
   ПОСЛЕ parents/nannies-локов (C10). Флаг делает guard видимым для последующих create.
3. **Удалить незавершённые без оплаты** (status='pending' AND нет подтверждённого
   платежа) уходящей стороны → `DELETE`; confirmations каскадят. (Раньше массовой
   отмены — иначе они станут cancelled и не попадут под этот критерий.)
4. **Отменить оставшиеся активные** брони уходящей стороны: `status → cancelled`
   (active = confirmed/active + не удалённые pending). Снимает противоречие
   «`request_id`/uid SET NULL ↔ active-CHECK»: после cancel строка терминальна,
   обнуление полей не нарушает CHECK.
5. **Терминальные с историей** → обезличить: `parent_id|nanny_id := NULL` +
   `*_erased_at := now()`; `request_id := NULL` при уходе родителя.
6. `COMMIT` БД-части → `account_deletions.state = 'db_done'`. **Затем** Auth-delete
   (HTTP) → при успехе `state='deleted'`. Если Auth-delete упал — state остаётся
   `db_done`; **серверный reconciler** (cron/worker) повторяет Auth-delete по
   `db_done`-записям с lease/attempt-счётчиком (§3.1). Idempotent: повтор lifecycle
   на уже `deleted`/отсутствующем Auth-user — no-op. Не оставлять orphan.

**Retention / legal basis (blizko-lawyer):**

- `bookings` = **обычные ПДн**, цель = координация услуги. При удалении аккаунта /
  достижении цели — уничтожение/обезличивание **≤30 дней** (152-ФЗ ст.21).
- **ФЗ-402 (5 лет) НЕ применяется к таблице `bookings`.** `amount` здесь —
  координационная цифра, **не первичный учётный документ**. 5-летняя учётная
  обязанность лежит на домене **Payments** (платёжные/фискальные записи YooKassa /
  54-ФЗ), не на bookings. (Исправляет ошибочный вывод предыдущей редакции.)
- Хранение строки booking ПОСЛЕ удаления аккаунта — только при отдельном
  основании (живой спор/претензия; ГК ст.196 — общий срок 3 года), минимизировано
  и blocked (152-ФЗ ст.21 ч.5), с явным сроком; иначе строку удалить.
- Оферта `LegalPages.tsx:596-599` (≤30 дн, кроме фин.документов 5 лет) корректна
  ЕСЛИ «фин.документы» = платёжные записи; bookings не реклассифицировать в фин.док.
- Реализация: retention-механизм (expiry-поле/job) + deletion-proof (T10).
- **Counsel-вопрос (открыт):** кто эмитент первичного учётного документа по сделке
  (Blizko vs самозанятая няня) → носитель 5-летней ФЗ-402-обязанности. Не блокирует
  bookings-дизайн (ФЗ-402 и так не на bookings), но нужен для домена Payments.

- `nanny_profile_id`/`request_id` → `ON DELETE SET NULL` (не RESTRICT — не блокировать
  удаление профиля; активные уже отменены шагом 2).

ПДн в строке booking: `parent_id`, `nanny_id`, `request_id`, `nanny_profile_id`
(идентификаторы), `date` (график/факт), `amount` (координационная цифра).
Комбинация остаётся ПДн даже после обнуления одного uid → обнулять обе ссылки
уходящей стороны.

## 7. Чтения + удаление local-first (BLI-138)

- Убрать ВСЕ local readers/writers/fallback в `booking.ts` (включая
  `getBookingsForUser:191-221`, `getAllBookings:224+`, pending-merge `:81`,
  `markPendingBooking`); versioned-deletion обоих localStorage-ключей.
- Network failure → явная ошибка, не local success.
- Admin-чтения через сервер (authenticated admin GET); participant SELECT остаётся
  для пользовательского дашборда (`BookingsTab`).

## 8. booking_confirmations (BLI-140)

Тот же паттерн: server-authoritative записи + RLS lockdown (SELECT участнику,
мутации service_role) + не глотать ошибки (`confirmations.ts:51`). Каскад от
bookings уже есть.

**Authorization (Codex #3/#4 — `confirmations.ts:67` сейчас пускает любого; схема
`booking_confirmations` имеет только `type`, без адресата):**

**Новые колонки** (адресат явный, не выводить «по роли»):

- `recipient_role text NOT NULL CHECK (recipient_role IN ('family','nanny'))`;
- `recipient_user_id uuid` — server-проставляется из booking-стороны при создании
  (NULL только после обезличивания участника).

Checkpoint → actor → booking-переход (полный mapping, не в план):

| type (checkpoint) | recipient | respond confirmed → booking | respond missed → booking |
|---|---|---|---|
| `t_24h` (за 24ч) | nanny | нет авто-перехода booking | нет (флаг риска куратору) |

(Сейчас единственный type — `t_24h`, адресат = няня. Новые checkpoint-типы
добавляются строкой в этот mapping + миграцией CHECK, не «по роли динамически».)

| Действие | Кто | Условие |
|---|---|---|
| respond `confirmed`/`missed` | `recipient_user_id` (auth-uid) | `WHERE status='pending' AND now()<=due_at` (optimistic) |
| создание confirmation | service_role при переходах booking | не клиент |

- Атомарная связка: ответ на confirmation + любой связанный booking-переход — в
  ОДНОЙ транзакции с optimistic-lock на обеих строках.
- `due_at`-просрочка: после `due_at` respond запрещён → `missed` (системно/reconciler).

## 9. Миграция — expand-migrate-contract (Codex #3)

`idempotency_key NOT NULL UNIQUE` нельзя ставить разом — у существующих строк нет
ключа (миграция упадёт). Поэтому фазы:

**Expand:**

1. добавить `idempotency_key TEXT UNIQUE` (nullable), `idempotency_fingerprint TEXT`,
   `nanny_profile_id`, `parent_erased_at`, `nanny_erased_at` — все nullable;
2. деплой кода, который ВСЕГДА пишет ключ/fingerprint на новых строках (§3).

**Migrate (backfill, под локом, одна транзакция):**

3. финальный read-only audit живых данных (счётчики null/ambiguous);
4. backfill `idempotency_key` существующих строк **детерминированно** (напр.
   `'legacy:'||id` — id уникален) + fingerprint из текущих полей; **ambiguous → ABORT**
   (не quarantine — confirmations каскадят, безопаснее остановиться);
5. backfill провенанса `nanny_profile_id` где выводимо детерминированно, иначе NULL
   (это аудит-поле, не блокирует).

**Contract (lockdown, одна транзакция, под блокировкой таблицы):**

6. `ALTER ... SET NOT NULL` на `idempotency_key` (после доказанного backfill);
7. пересоздать FK (`ON DELETE SET NULL`) + canonical CHECK (§2) + partial unique index (§4);
8. RLS: разбить `bookings_participant` (ALL) → SELECT участнику, INSERT/UPDATE/DELETE
   service_role; то же для `booking_confirmations`;
9. grants: `REVOKE ALL` у `anon`; `authenticated` — только `SELECT`.

Точные постусловия каждой фазы (колонки/NOT NULL/политики/grants/CHECK/индексы
присутствуют) + rollback runbook на фазу. Backfill-фаза идемпотентна (повторный
запуск не портит уже заполненные строки).

## 10. Выкат

Owner подтвердил **ноль установленных клиентов** → zero-install gate; lockdown без
форс-апдейта (старый Capacitor-клиент с прямым upsert не существует у реальных юзеров).

**Единая последовательность (Codex #4 #1 — устраняет противоречие §9↔§10: колонки
существуют ДО кода, который их пишет):**

1. **Expand-миграция:** добавить nullable-колонки (`idempotency_key`,
   `idempotency_fingerprint`, `nanny_profile_id`, `parent/nanny_erased_at`,
   `recipient_role/recipient_user_id`) + таблицу `account_deletions` (§3.1). Без
   NOT NULL/CHECK/lockdown ещё.
2. **Деплой compatible-кода:** endpoints (create/status/admin-GET, пишут
   ключ/fingerprint/recipient), переключение клиента, удаление local-first (§7),
   delete-account lifecycle (§6) + reconciler. Старый и новый код совместимы со
   схемой expand-фазы.
3. **Read-only audit** живых данных (счётчики null/ambiguous).
4. **Migrate (backfill):** детерминированный backfill `idempotency_key`/fingerprint/
   recipient существующих строк; ambiguous → ABORT. Идемпотентно.
5. **Contract-миграция (одна транзакция, под локом):** `SET NOT NULL` где надо +
   FK `ON DELETE SET NULL` + canonical CHECK (§2) + partial unique index (§4) + RLS
   split + `REVOKE` grants (§9).
6. role-correct + concurrency smoke (§11).

После lockdown — только **forward-fix**; клиент НЕ откатывать к direct-write
(grants урезаны → direct-write сломан); revoke-grant не откатывать к небезопасному.

## 11. Тесты (role-correct)

- create provenance: клиент шлёт request_id + nanny entity-id; сервер выводит оба uid;
  нет строки parents/nannies → отказ; entity-id как auth-uid невозможен по контракту.
- idempotency: повтор-ключ same-payload → та же строка; diff-payload → 409; cardinality.
- статусы: разрешённый переход актёра ✓; запрещённый → отказ; stale status → optimistic-lock отказ; self-booking CHECK.
- lifecycle: удаление аккаунта участника с активной броней → бронь cancelled + сторона NULL + erased_at; незавершённая без оплаты удалена; `DELETE auth.users` не падает; amount сохранён.
- чтения: network failure → ошибка (не local success); local-first слой отсутствует; admin-GET ✓; participant SELECT дашборда не сломан.
- RLS+grants: прямой INSERT/UPDATE/DELETE клиента запрещён (политикой и grant).
- confirmations: server-authoritative, ошибки не глотаются, RLS lockdown; respond
  только адресатом, after `due_at` → отказ; атомарная связка со статусом booking.
- **конкурентность (Codex #3/#4):**
  - create/create (одна пара, РАЗНЫЕ ключи) → конфликт по pair-index → один выигрывает, второй `409` (НЕ idempotent-replay);
  - retry/retry (ОДИН ключ, same payload) → конфликт по idempotency-index → same-fingerprint → та же строка `200`;
  - один ключ, РАЗНЫЕ curators → глобальный ключ-конфликт (scope глобальный) → diff-fingerprint → `409`;
  - create/delete (сторона удаляется параллельно) → create видит deletion-флаг → `409`; нет «висячей» брони после Auth-delete;
  - crash между DB-commit и Auth-delete → state `db_done`; reconciler добивает Auth-delete; повтор lifecycle на уже `deleted` → no-op;
  - profile-delete/active-booking → удаление сперва delete unpaid-pending → cancel активных → CHECK не нарушен → проходит;
  - confirmation wrong-recipient → `403`; concurrent confirm + booking-переход → атомарно, без рассинхрона.
- миграция (фазы): expand добавил nullable-колонки; backfill детерминирован,
  идемпотентен, ambiguous → abort; contract — NOT NULL/CHECK/index/FK/RLS/grants
  enforced; rollback на фазу чистый.

## Гейты

DB protocol (expand-migrate-contract; точные постусловия + rollback на фазу),
legal/security (152-ФЗ ст.21 + ФЗ-402 ст.29 — blizko-lawyer Conditional Go, нормы
верифицированы; ФЗ-402 снят с bookings), Codex review #4 переработанного дизайна
перед реализацией, owner approval prod DDL.

## История ревью

- **Codex review #1 (BLI-138):** Rejected → D1-D8 свёрнуты.
- **Codex review #2 (BLI-138):** Rejected → 10 must-fix; вскрыта незакрытость модели
  → stop-rule → owner-решение «единый эпик».
- **Codex-консультация по удалению (owner-запрос):** гибрид nullable+SET NULL,
  Conditional Go → разворот NOT NULL, свёрнуто в §2/§6.
- **Codex review #3 (единый дизайн, ред. 1):** Rejected — архитектура принята
  («substantially addressed»), P1/P2 спец-пробелы. Свёрнуто в ред. 2:
  §2 canonical CHECK+date / §3 deletion-guard + сериализация / §4 fingerprint+конфликт /
  §5 state-machine (няня, owner) / §6 cancel-active-first + retention (ФЗ-402 снят с
  bookings, blizko-lawyer) / §8 confirmation authz / §9 expand-migrate-contract /
  §11 тесты конкурентности.
- **blizko-lawyer (owner-запрос):** Conditional Go; ФЗ-402 5 лет — на домен Payments,
  не bookings; bookings ≤30 дн (152-ФЗ ст.21). Counsel-вопрос (эмитент первичного
  документа) открыт, не блокирует bookings.
- **Codex review #4 (ред. 2):** Rejected — архитектура держится, 6 P1 спец-точность
  (часть — внесённые мной противоречия). Свёрнуто в ред. 3: §4 глобальный ключ +
  два constraint'а + канонизация fingerprint / §3.1 таблица `account_deletions`
  (state-machine + reconciler, без FK к auth.users) / §6 порядок (delete-unpaid ДО
  cancel) / §8 recipient-колонки + mapping / §10 единая expand→code→backfill→contract
  последовательность / §11 доп. тесты.

**Статус:** ред. 3 готова. **Stop-rule: 2 цикла ревью (#3/#4) на едином дизайне.**
Решение owner: (а) Codex review #5 ред. 3, либо (б) writing-plans (остаточная
точность — plan-level), либо (в) пауза.

**Открытые (не блокируют, в план/смежные):** counsel-вопрос об эмитенте учётного
документа (Payments); **типизация `amount` (TEXT → numeric/centы)** — нужна для
canonical fingerprint §4 и для отделения от Payments; retention-механизм (expiry-job).
