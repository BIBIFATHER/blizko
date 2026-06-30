# BLI-138 — Целостность booking — Дизайн (УСТАРЕЛ → см. эпик BLI-141)

> **УСТАРЕЛ (2026-06-30).** Дизайн BLI-138 свёрнут в единый дизайн эпика
> **BLI-141** (Booking integrity & lifecycle) после Codex review #2 + owner-решения
> объединить BLI-138/139/140. Канонический документ:
> [`2026-06-30-bli141-booking-integrity-lifecycle-epic-design.md`](2026-06-30-bli141-booking-integrity-lifecycle-epic-design.md).
> Ключевое изменение: решение NOT NULL развёрнуто на nullable + conditional CHECK
> (152-ФЗ удаление). Ниже — историческое содержимое ред. 2.

---

Дата: 2026-06-30 · Linear: BLI-138 · Блокирует: BLI-134 (жёсткое предусловие) ·
Связано: RISK-009, BLI-139 (lifecycle удаления), BLI-140 (booking_confirmations).

Ред. 2 сворачивает Codex review #1 (D1-D8) в само тело дизайна. История ревью — в конце.

## Проблема (проверено по коду)

Booking — ненадёжный authority, что ломает провижининг match-треда (BLI-134):

1. **Ложный success:** `createBooking` (`src/services/booking.ts:142-154`) пишет
   локально, пытается `remoteSaveBooking`; при сбое remote всё равно возвращает
   booking → куратор видит «бронь создана», а в проде ничего нет.
2. **Fallback на entity-id:** `AdminCuratorTab.tsx:94-95` использует
   `parent_id = requesterId ?? id`, `nanny_id = userId ?? id` — fallback на
   entity-id вместо auth-uid. FK на `auth.users` отвергает entity-id → сбой
   remote → local-only.
3. **Nullable + mutable:** `bookings.parent_id`/`nanny_id` nullable; RLS-политика
   `bookings_participant` покрывает ВСЕ команды → участники могут UPDATE/DELETE,
   включая смену контрагента или удаление брони.
4. **Pending-merge:** `booking.ts:81` мёрджит локальные pending-строки в
   remote-результат → после lockdown они продолжат всплывать как «реальные».

Цель: booking несёт РЕАЛЬНЫЕ auth-uid, NOT NULL, идентичность участников
неизменяема, нет ложного success, нет призрачного local state → надёжный
authority для BLI-134.

## Решение: server-authoritative (вариант B)

Все записи в `bookings` идут через сервер (service_role); клиент только читает
(участник — свои строки; куратор — через серверный admin-GET). У куратора уже есть
service-role-путь (`verifyBearerAdmin`, `api/data.ts`).

### D1 — Identity provenance: клиент НЕ шлёт auth-uid

Контракт create перевёрнут. Клиент **не знает и не присылает** auth-UUID сторон.

Create-endpoint (`api/bookings.ts`, POST, `verifyBearerAdmin`) принимает:
- `request_id` (заявка),
- nanny **entity-id** (профиль няни),
- `idempotency_key`,
- `date` и прочие бизнес-поля.

Сервер в ОДНОЙ транзакции:

1. lock/load строку заявки (`request_id`) и строку профиля няни (entity-id);
2. вывести `parent user_id` из заявки, `nanny user_id` из профиля няни;
3. проверить, что ОБА auth-аккаунта существуют в `auth.users`; нет аккаунта у
   стороны → отказ (booking требует обе auth-связи). **Без entity-id fallback;**
4. валидировать связь `request_id ↔ nanny` (заявка действительно адресует эту няню);
5. idempotency по `idempotency_key` + cardinality (нет дубля активной брони на пару/заявку);
6. insert строки с server-генерируемыми защищёнными полями
   (`parent_id`, `nanny_id`, `status`, серверные timestamp).

Хранить `nanny_profile_id` (entity-id) как FK для аудита провенанса участников —
позволяет восстановить, из какого профиля выведен auth-uid.

Insert атомарный: вернуть реально сохранённую строку или явную ошибку. Без local-only success.

### D3 — State-machine статусов (endpoint смены статуса)

Status-endpoint (POST, `verifyBearerUser` участник ИЛИ `verifyBearerAdmin` куратор):
- меняется ТОЛЬКО `status` (по `bookings_status_check`); `parent_id`/`nanny_id`
  здесь никогда не меняются;
- переходы определены **по актёру**: кто (участник/куратор) какой переход вправе
  сделать (confirm/cancel/…); таблица переходов в реализации;
- conditional update `WHERE id = ? AND status = expected_status`
  (оптимистичная блокировка) → защита от гонок и устаревших клиентов.

### D4 — Admin-чтения через сервер

- Добавить authenticated **admin GET** через сервер (куратор читает все нужные брони
  серверным путём).
- Сохранить **прямой participant SELECT** для пользовательских дашбордов
  (`BookingsTab`/dashboard не ломать) — RLS оставляет участнику SELECT своих строк.

### RLS-lockdown + D7 (grants)

- Разбить `bookings_participant` (сейчас ALL): SELECT оставить участникам;
  INSERT/UPDATE/DELETE → **только service_role**. Все мутации — через endpoints.
- D7: `anon`/`authenticated` сейчас `GRANT ALL`. **Revoke** mutation-привилегии
  (INSERT/UPDATE/DELETE), оставить только SELECT (least-privilege). RLS без grant-lockdown
  недостаточен. Rollback не должен возвращать небезопасный grant.

### D5 — Убрать pending-merge + legacy local state

- Убрать merge в `booking.ts:81` (локальные pending больше не подмешиваются в remote).
- Мигрировать/очистить legacy local booking state на клиенте, чтобы после lockdown
  призрачные строки не всплывали как реальные.

### D2 — Миграция: cleanup безопасный, без угадывания

- Сначала **read-only** аудит: живые constraints + санитизированные счётчики строк
  с null / non-auth `parent_id`/`nanny_id`.
- Реконсилировать только **детерминированные** строки (однозначно выводимый auth-uid).
- Неоднозначные строки → **карантин или блок миграции**, не угадывать.
- ЗАТЕМ `ALTER ... SET NOT NULL` на `parent_id`, `nanny_id` + переписать RLS + revoke grants.
- D8: `request_id`, `date` тоже nullable, но required по типам → включить в `SET NOT NULL`.
- Точные постусловия (NOT NULL присутствует на 4 колонках, политики совпадают,
  grants урезаны) + rollback runbook.

### D6 — Old-client gate (P1, gate выката)

Capacitor встраивает фронт → старые установки продолжат прямой upsert + ложный
local success после RLS-denial. Web SW network-first (менее критично). **Перед
lockdown** нужен один из:
- подтверждённый ноль установленных/реальных клиентов, ИЛИ
- форс-апдейт (минимальная версия), ИЛИ
- явно принятое fail-closed поведение старых клиентов (denial без ложного success).

Это owner-gate, фиксируется до шага 3 выката.

### Клиент

- `AdminCuratorTab.handleAssign` → вызов create-endpoint (request_id + nanny entity-id +
  idempotency_key; без auth-uid, без fallback); показывать РЕАЛЬНЫЙ результат
  (success только если сервер сохранил). Клиентский `createBooking`-upsert убрать.
- UI статуса booking → status-endpoint.

## Тесты (role-correct)

- create provenance: клиент шлёт request_id + nanny entity-id; сервер выводит оба
  auth-uid; нет auth-аккаунта стороны → отказ; entity-id как auth-uid невозможен по контракту.
- request↔nanny mismatch → отказ.
- idempotency: повтор с тем же ключом не создаёт дубль; cardinality соблюдена.
- ложный success устранён: сбой сервера → клиент показывает ошибку, не success.
- неизменяемость: участник не может сменить `parent_id`/`nanny_id` (прямо + через endpoint).
- статус: разрешённый переход актёра работает; запрещённый → отказ; гонка (stale status) → отказ по optimistic lock.
- admin-GET: куратор читает через сервер; participant SELECT дашборда не сломан.
- RLS+grants: прямой INSERT/UPDATE/DELETE клиента запрещён (и политикой, и grant).
- pending-merge убран: legacy local pending не всплывает после lockdown.
- миграция: NOT NULL на 4 колонках; cleanup реконсилирует только детерминированные,
  неоднозначные в карантин; rollback чистый.

## Порядок выката

1. **Read-only аудит** живых данных (D2): счётчики, неоднозначные строки.
2. Data cleanup + реконсиляция детерминированных; карантин неоднозначных.
3. Деплой create + status + admin-GET endpoints; переключение клиента; убрать pending-merge (D5).
4. **Old-client gate (D6)** — owner подтверждает до lockdown.
5. Применить RLS-lockdown + grant-revoke + NOT NULL миграцию (после того как прямые записи не используются).
6. Role-correct smoke.

Это делает `bookings` надёжным authority → разблокирует BLI-134 (который затем
провижинит треды из booking, за своим feature-gate).

## Гейты

DB protocol (bookings + миграция), legal/security (ПДн — booking связывает реальных
пользователей), Codex review переработанного дизайна перед реализацией. Owner approval
для prod DDL + для D6 old-client gate.

## Rollback / forward-fix

- Endpoints/клиент: revert коммита (клиент откатывается к текущему поведению; приемлемо до реальных юзеров).
- Миграция: снять NOT NULL + восстановить прежнюю `bookings_participant` + grants по runbook;
  предпочтительно forward-fix (revoke-grant НЕ откатывать к небезопасному).

## Связанное, вынесено отдельными задачами

- **BLI-139 — Account-deletion lifecycle (P1, 152-ФЗ):** bookings NO ACTION FK;
  удаление аккаунта не удаляет/анонимизирует bookings до удаления auth-юзера →
  orphan/FK. `api/auth/delete-account.ts`.
- **BLI-140 — `booking_confirmations` integrity (P1):** та же ALL participant-policy +
  клиент молча игнорит ошибки (`confirmations.ts:51`).

## История ревью

### Codex review дизайна #1 (2026-06-30): REJECTED — направление верное

Server-authoritative подтверждён, но identity-provenance, безопасность cleanup,
state-machine статусов, admin-чтения, legacy-клиенты, grants и lifecycle удаления —
архитектурные требования, не детали реализации. D1-D8 свёрнуты в тело ред. 2 выше;
account-deletion и booking_confirmations вынесены в BLI-139/BLI-140.

**Статус:** ред. 2 готова → нужен Codex review #2 переработанного дизайна перед реализацией.
