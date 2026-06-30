# BLI-141 — Booking integrity & lifecycle (server-authoritative) — Единый дизайн эпика

Дата: 2026-06-30 · Linear: BLI-141 (эпик) → BLI-138 / BLI-139 / BLI-140 ·
Блокирует: BLI-134 (provisioning) · Связано: BLI-124, RISK-009.

Этот документ — канонический дизайн эпика. Он заменяет
`2026-06-30-bli138-booking-integrity-design.md` (тот оставлен указателем).
Свёрнуты: Codex review #1 (D1-D8), Codex review #2 (10 must-fix),
Codex-консультация по удалению (152-ФЗ, гибрид), **Codex review #3 (P1/P2
спец-пробелы), owner-решение по state-machine (няня вручную), blizko-lawyer
юр-гейт по retention (Conditional Go)**. Все находки верифицированы по коду/нормам.

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

Сервер в ОДНОЙ транзакции:

1. lock/load `parents WHERE id = request_id` (`FOR UPDATE`) и
   `nannies WHERE id = nanny_entity_id` (`FOR UPDATE`).
2. вывести `parent_id = parents.user_id`, `nanny_id = nannies.user_id`
   (оба NOT NULL + FK auth.users by construction → валидные аккаунты).
3. **deletion-guard (Codex #3 гонка create-vs-delete):** проверить, что обе
   стороны НЕ в состоянии удаления — флаг `account_deletions(user_id, state)` или
   `users`-уровневый `deleting_at`. Если любая сторона `deleting/deleted` → отказ
   `409`. Lifecycle удаления (§6) ставит этот флаг под тем же локом, что снимает
   гонку «вставка между cleanup и Auth-delete».
4. eligibility: обе строки существуют; заявка actionable (статус заявки).
5. idempotency/cardinality (§4).
6. insert server-генерируемых полей (`parent_id`, `nanny_id`, `nanny_profile_id`,
   `status='pending'`, `idempotency_key`, `idempotency_fingerprint`, серверные timestamp).

Вернуть реально сохранённую строку или явную ошибку. **Без entity-id fallback,
без local-only success.**

**Сериализация:** create и lifecycle-delete сериализуются по паре участников
через `FOR UPDATE` на строках parents/nannies (шаг 1) + durable deletion-флаг
(шаг 3). Это закрывает create/create (idempotency + partial unique §4) и
create/delete (deletion-guard) гонки без глобального лока.

## 4. Идемпотентность и cardinality (DB-контракт)

Семантика (Codex #3 — раньше «same payload» не определён):

- **Ключ:** `idempotency_key` — клиент-генерируемый, scope = создатель (куратор);
  формат фиксирован (UUID/ULID), валидируется на входе. UNIQUE на колонке.
- **Fingerprint:** `idempotency_fingerprint` = детерминированный hash canonical
  набора полей запроса (`request_id`, `nanny_entity_id`, `date`, `amount`,
  нормализованные). Хранится рядом с ключом.
- **Алгоритм (внутри транзакции):** insert; при unique-violation по
  `idempotency_key` → re-read существующей строки → сравнить её
  `idempotency_fingerprint` с входным:
  - совпал → вернуть существующую строку (`200`, идемпотентно);
  - не совпал → `409` (тот же ключ, другой payload — конфликт).
- Cardinality: partial unique index на активную бронь пары —
  `UNIQUE (parent_id, nanny_id) WHERE status IN ('pending','confirmed','active')`
  (тот же canonical active-набор, что в CHECK §2). Конкурентный create/create →
  один выигрывает, второй получает unique-violation → re-read как выше.

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
куратор = `verifyBearerAdmin`). Любой переход вне матрицы → `403`. Stale-status
(параллельная смена) → optimistic-lock `WHERE status=expected` вернёт 0 строк → `409`.
Cron не используется (нет авто-`completed`); зависшая `active` — продуктовый риск,
принят owner. Если позже понадобится авто-завершение — отдельная задача.

## 6. Lifecycle удаления (BLI-139, 152-ФЗ) — приоритет Urgent

**Живой баг:** `delete-account.ts:41-69` не трогает bookings; `DELETE auth.users`
(стр.66) падает по FK NO ACTION у любого юзера с бронью → юзер с бронью **не может
удалить аккаунт сейчас** = нарушение 152-ФЗ в проде.

Политика (гибрид + blizko-lawyer Conditional Go, нормы верифицированы —
152-ФЗ ст.21, ФЗ-402 ст.29):

Порядок удаления (атомарно, в `delete-account`, ДО `DELETE auth.users`):

1. **Поставить deletion-флаг** под локом (durable `account_deletions.state =
   'deleting'`) — закрывает гонку create-vs-delete (§3 шаг 3).
2. **Отменить активные брони** уходящей стороны: `status → cancelled`
   (active = pending/confirmed/active). Это снимает противоречие
   «`request_id`/uid SET NULL ↔ active-CHECK» (Codex #3): после cancel строка
   терминальна, обнуление полей не нарушает CHECK.
3. **Незавершённые без оплаты** (pending без подтверждённого платежа) → удалить;
   confirmations каскадят.
4. **Терминальные с историей** → обезличить: `parent_id|nanny_id := NULL` +
   `*_erased_at := now()`; `request_id := NULL` при уходе родителя.
5. `COMMIT` БД-части, **затем** Auth-delete (HTTP). Если Auth-delete упал —
   компенсация/повтор (флаг остаётся `deleting`, ретраится); не оставлять orphan.

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

**Authorization (Codex #3 — `confirmations.ts:67` сейчас пускает любого):**
confirmation отвечает на booking-чекпойнт (напр. `t_24h`). Actor определяется
сервером по auth-uid против booking-сторон:

| Действие | Кто | Условие |
|---|---|---|
| respond `confirmed`/`missed` | сторона, к которой адресован confirmation (по `type`/роли) | под auth-uid = соответствующая сторона booking; expected-state predicate `WHERE confirmation.status='pending' AND now()<=due_at` |
| создание confirmation | service_role (сервер при переходах booking) | не клиент |

- Атомарная связка со статусом booking: ответ на confirmation и соответствующий
  переход booking-статуса (если есть) — в одной транзакции с optimistic-lock,
  чтобы confirmation и booking не рассинхронизировались.
- `due_at`-просрочка: после `due_at` ответ запрещён (→ `missed` системно/при чтении).
- Полная actor/expected-state-матрица детализируется в плане BLI-140.

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

1. read-only audit;
2. cleanup (ambiguous → abort);
3. деплой endpoints (create/status/admin-GET) + переключение клиента + удаление local-first (§7);
4. деплой delete-account lifecycle fix (BLI-139);
5. RLS/grant/colonne/FK/CHECK миграция (§9) — одна транзакция;
6. role-correct smoke.

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
- **конкурентность (Codex #3):**
  - create/create (одна пара) → ровно одна строка; второй re-read same-fingerprint → та же строка;
  - retry/retry (один ключ) → одна строка, без дублей;
  - create/delete (сторона удаляется параллельно) → create видит deletion-флаг → 409; нет «висячей» брони после Auth-delete;
  - profile-delete/active-booking → удаление сперва cancel активных → CHECK не нарушен → удаление проходит.
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

**Статус:** ред. 2 готова → Codex review #4 → user review (owner) → writing-plans.

**Открытые (не блокируют дизайн, в план/смежные):** counsel-вопрос об эмитенте
первичного учётного документа (домен Payments); типизация `amount` (TEXT →
структурированное); конкретный retention-механизм (expiry-job) детализируется в плане.
