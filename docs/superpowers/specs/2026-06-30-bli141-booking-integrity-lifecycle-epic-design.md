# BLI-141 — Booking integrity & lifecycle (server-authoritative) — Единый дизайн эпика

Дата: 2026-06-30 · Linear: BLI-141 (эпик) → BLI-138 / BLI-139 / BLI-140 ·
Блокирует: BLI-134 (provisioning) · Связано: BLI-124, RISK-009.

Этот документ — канонический дизайн эпика. Он заменяет
`2026-06-30-bli138-booking-integrity-design.md` (тот оставлен указателем).
Свёрнуты: Codex review #1 (D1-D8), Codex review #2 (10 must-fix),
Codex-консультация по удалению (152-ФЗ, гибрид). Все находки верифицированы по коду.

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

Целостность держится **conditional CHECK для активных** броней:

```
CHECK ( status NOT IN ('pending','confirmed','active')
        OR (parent_id IS NOT NULL AND nanny_id IS NOT NULL AND request_id IS NOT NULL) )
CHECK ( parent_id IS NULL OR nanny_id IS NULL OR parent_id <> nanny_id )  -- запрет self-booking
```

Активная бронь обязана иметь обе стороны (цель BLI-134 — на момент провижининга
бронь активна → оба uid есть). Терминальная (completed/cancelled) может иметь
nulled-сторону после удаления аккаунта.

Новые колонки:

- `idempotency_key TEXT NOT NULL UNIQUE` (см. §4).
- `nanny_profile_id TEXT REFERENCES nannies(id) ON DELETE SET NULL` — провенанс
  выбора няни для аудита (request_id уже даёт parent-провенанс).
- `parent_erased_at`, `nanny_erased_at timestamptz` — отметки обезличивания (§6).
- `date`: required для активных через тот же conditional CHECK (не глобальный NOT NULL).

FK пересоздать с `ON DELETE SET NULL`: `parent_id`, `nanny_id` → auth.users;
`request_id` → parents; `nanny_profile_id` → nannies.

## 3. Create — server-authoritative provenance (BLI-138)

Endpoint `api/bookings.ts` POST, `verifyBearerAdmin` (только куратор).

Клиент шлёт: `request_id` (=parents.id), nanny **entity-id** (=nannies.id),
`idempotency_key`, бизнес-поля (date, amount). **Не** auth-uid.

Сервер в ОДНОЙ транзакции:

1. lock/load `parents WHERE id = request_id` и `nannies WHERE id = nanny_entity_id`.
2. вывести `parent_id = parents.user_id`, `nanny_id = nannies.user_id`
   (оба NOT NULL + FK auth.users by construction → валидные аккаунты).
3. eligibility: обе строки существуют; заявка actionable (статус заявки).
4. idempotency/cardinality (§4).
5. insert server-генерируемых полей (`parent_id`, `nanny_id`, `nanny_profile_id`,
   `status='pending'`, серверные timestamp).

Вернуть реально сохранённую строку или явную ошибку. **Без entity-id fallback,
без local-only success.**

## 4. Идемпотентность и cardinality (DB-контракт)

- `idempotency_key NOT NULL UNIQUE`. Повтор того же ключа с **другим** payload → `409`.
  Повтор с тем же payload → вернуть существующую строку (idempotent).
- Cardinality: partial unique index на активную бронь пары —
  `UNIQUE (parent_id, nanny_id) WHERE status IN ('pending','confirmed','active')`.
  Точный набор active-статусов фиксируется здесь и переиспользуется в CHECK §2.

## 5. Статусы — actor state-machine (BLI-138)

Endpoint смены статуса (POST, `verifyBearerUser` участник ИЛИ `verifyBearerAdmin`).
Меняется ТОЛЬКО `status`; `parent_id`/`nanny_id` никогда. Conditional
`UPDATE ... WHERE id=? AND status=expected` (optimistic lock).

Actor-transition matrix (явно в дизайне):

| Из → В | parent | nanny | curator |
|---|---|---|---|
| pending → confirmed | — | ✓ | ✓ |
| pending → cancelled | ✓ | ✓ | ✓ |
| confirmed → active | — | — | ✓ (или система) |
| confirmed → cancelled | ✓ | ✓ | ✓ |
| active → completed | — | — | ✓ (или система) |
| active → cancelled | ✓ | ✓ | ✓ |

(Уточнить confirmed→active/active→completed: куратор vs system-cron; завершить при ревью.)
Сервер проверяет actor по auth-uid (родитель = parent_id, няня = nanny_id).

## 6. Lifecycle удаления (BLI-139, 152-ФЗ) — приоритет Urgent

**Живой баг:** `delete-account.ts:41-69` не трогает bookings; `DELETE auth.users`
(стр.66) падает по FK NO ACTION у любого юзера с бронью → юзер с бронью **не может
удалить аккаунт сейчас** = нарушение 152-ФЗ в проде.

Политика (гибрид, Codex Conditional Go, верифицировано):

- **Незавершённые без оплаты** (pending без amount/confirmations) → удалить;
  confirmations каскадят.
- **Подтверждённые/завершённые/оспариваемые** → сохранить минимальный факт:
  отменить активные (status→cancelled) для уходящей стороны, затем
  `parent_id|nanny_id := NULL` + `*_erased_at := now()`; обнулить `request_id`
  при уходе родителя.
- Порядок: обработать bookings ДО `DELETE auth.users` (или `BEFORE DELETE`
  trigger/функция). `ON DELETE SET NULL` — defense-in-depth.
- **Retention/legal basis:** `amount` хранить по ФЗ-402 (5 лет, бухучёт); прочие
  ПДн уничтожать/обезличивать ≤30 дней. Синхронизировать с офертой
  `LegalPages.tsx:596-599`. Зафиксировать в `DATA_REGISTER.md` (bookings retention).
- **Атомарность:** auth-delete (HTTP, стр.66) сейчас ДО COMMIT (стр.78) → orphan-риск
  при успешном auth-delete + упавшем commit. Перенести auth-delete после COMMIT
  или компенсирующая логика.
- `nanny_profile_id`/`request_id` → `ON DELETE SET NULL` (не RESTRICT — не блокировать
  удаление профиля).

ПДн в строке booking: `parent_id`, `nanny_id`, `request_id`, `nanny_profile_id`
(идентификаторы), `date` (график/факт), `amount` (финансы). Комбинация остаётся ПДн
даже после обнуления одного uid → обнулять обе ссылки уходящей стороны.

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
bookings уже есть. Согласовать со state-machine (confirm-токены ↔ статусы booking).

## 9. RLS / grants lockdown (одна транзакция)

Порядок (всё под блокировкой таблицы, одна транзакция — иначе окно повторного
загрязнения между cleanup и lockdown):

1. финальный read-only audit живых данных;
2. cleanup детерминированных строк; **ambiguous → ABORT** миграции (не quarantine —
   confirmations каскадят, безопаснее остановиться);
3. RLS: разбить `bookings_participant` (ALL) → SELECT участнику, INSERT/UPDATE/DELETE
   service_role; то же для `booking_confirmations`;
4. grants: `REVOKE ALL` у `anon`; `authenticated` — только `SELECT`;
5. добавить колонки (§2) + пересоздать FK (`ON DELETE SET NULL`) + conditional CHECK +
   partial unique index.

Точные постусловия (политики, grants, CHECK, индексы присутствуют) + rollback runbook.

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
- confirmations: server-authoritative, ошибки не глотаются, RLS lockdown.
- миграция: CHECK/index/FK/NOT NULL-где-надо enforced; ambiguous → abort; rollback чистый.

## Гейты

DB protocol (одна транзакция; точные постусловия + rollback), legal/security
(152-ФЗ удаление, retention, синхронизация оферты — blizko-lawyer), Codex review #3
единого дизайна перед реализацией, owner approval prod DDL.

## История ревью

- **Codex review #1 (BLI-138):** Rejected → D1-D8 свёрнуты.
- **Codex review #2 (BLI-138):** Rejected → 10 must-fix; вскрыта незакрытость модели
  → stop-rule → owner-решение «единый эпик».
- **Codex-консультация по удалению (owner-запрос):** гибрид nullable+SET NULL,
  Conditional Go → разворот NOT NULL, свёрнуто в §2/§6.

**Статус:** единый дизайн эпика готов → user review (owner) → Codex review #3 → writing-plans.
