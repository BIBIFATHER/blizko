# BLI-138 — Целостность booking (server-authoritative) — Дизайн

Дата: 2026-06-30 · Linear: BLI-138 · Блокирует: BLI-134 (жёсткое предусловие) · Связано: RISK-009.

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
   включая смену контрагента или удаление брони (Codex-ревью BLI-134).

Цель: booking несёт РЕАЛЬНЫЕ auth-uid, NOT NULL, идентичность участников
неизменяема, нет ложного success → надёжный authority для BLI-134.

## Решение: server-authoritative (вариант B)

Все записи в `bookings` идут через сервер (service_role); клиент только читает.
У куратора уже есть service-role-путь (`verifyBearerAdmin`, `api/data.ts`).

### Endpoint 1 — создание (куратор) `api/bookings.ts`
- `POST` (создание), `verifyBearerAdmin` (только куратор).
- Валидировать, что ОБА `parent auth-uid` и `nanny auth-uid` существуют в
  `auth.users` (источник: `nanny.userId`, `parent.requesterId`). Если у стороны
  нет auth-аккаунта → отказ (booking требует обе auth-связи). Без entity-id fallback.
- Atomic insert; вернуть реально сохранённую строку или явную ошибку. Без local-only success.

### Endpoint 2 — смена статуса (участник + куратор)
- `POST` смена статуса, `verifyBearerUser` (участник) ИЛИ `verifyBearerAdmin` (куратор).
- Caller обязан быть участником booking (или куратором); меняется ТОЛЬКО `status`
  (confirm/cancel и т.д. по `bookings_status_check`). `parent_id`/`nanny_id` здесь
  никогда не меняются.

### RLS-lockdown
- Разбить `bookings_participant` (сейчас ALL): SELECT оставить участникам;
  INSERT/UPDATE/DELETE → **только service_role**. Все мутации — через endpoints.

### Миграция
- Сначала data cleanup: найти booking с null / non-auth `parent_id`/`nanny_id`,
  реконсилировать. ЗАТЕМ `ALTER ... SET NOT NULL` на обе колонки + переписать RLS.
- Точные постусловия (NOT NULL присутствует, политики совпадают) + rollback runbook.

### Клиент
- `AdminCuratorTab.handleAssign` → вызов create-endpoint (без fallback); показывать
  РЕАЛЬНЫЙ результат (success только если сервер сохранил). Клиентский
  `createBooking`-upsert убрать.
- UI статуса booking → status-endpoint.

## Тесты (role-correct)
- create: оба auth-uid валидируются; нет auth-аккаунта → отказ; entity-id отвергнут.
- ложный success устранён: сбой remote → клиент показывает ошибку, не success.
- неизменяемость: участник не может сменить `parent_id`/`nanny_id` (напрямую + через endpoint).
- статус: участник confirm/cancel работает; не-участник → 403; куратор работает.
- RLS: прямой INSERT/UPDATE/DELETE клиента по `bookings` запрещён.
- миграция: NOT NULL enforced; cleanup реконсилирует все строки; rollback чистый.

## Порядок выката
1. Data cleanup + реконсиляция (сначала переверить живые счётчики, read-only).
2. Деплой create + status endpoints + переключение клиента.
3. Применить RLS-lockdown + NOT NULL миграцию (после того как прямые записи не используются).
4. Role-correct smoke.
Это делает `bookings` надёжным authority → разблокирует BLI-134 (который затем
провижинит треды из booking, за своим feature-gate).

## Гейты
DB protocol (bookings + миграция), legal/security (ПДн — booking связывает реальных
пользователей), Codex review перед реализацией. Owner approval для prod DDL.

## Rollback / forward-fix
- Endpoints/клиент: revert коммита (клиент откатывается к текущему поведению; приемлемо до реальных юзеров).
- Миграция: снять NOT NULL + восстановить прежнюю `bookings_participant` (runbook); предпочтительно forward-fix.

**Статус:** черновик дизайна — перед реализацией нужен Codex review (mandatory gate).

## Codex review дизайна #1 (2026-06-30): REJECTED — направление верное, свёрнуто ниже

Server-authoritative подтверждён, но identity-provenance, безопасность cleanup,
state-machine статусов, admin-чтения, legacy-клиенты и lifecycle удаления —
архитектурные требования, не детали реализации. Свёрнуто:

### D1 — Identity provenance: клиент НЕ шлёт auth-uid
- Create-endpoint принимает `request_id`, nanny **entity-id** и idempotency-key —
  НЕ participant auth-UUID. Сервер сам выводит `user_id` сторон.
- В ОДНОЙ транзакции: lock/load строки parent и nanny → вывести их `user_id` →
  проверить оба auth-аккаунта → валидировать связь request↔nanny →
  idempotency/cardinality → insert server-генерируемых защищённых полей.
- Рассмотреть хранение `nanny_profile_id` как FK для аудита провенанса участников.

### D2 — Cleanup безопасный, без угадывания
- Реконсилировать только детерминированные строки; неоднозначные — в карантин или
  блокировать миграцию. Сначала переверить живые constraints + санитизированные счётчики.

### D3 — State-machine статусов
- Определить переходы по актёру (кто какой переход может); conditional update
  `WHERE status = expected_status` (оптимистичная блокировка).

### D4 — Admin-чтения через сервер
- Добавить authenticated admin GET через сервер; сохранить прямой participant SELECT
  для пользовательских дашбордов (BookingsTab/dashboard не ломать).

### D5 — Убрать pending-merge + legacy local state
- `booking.ts:81` мёрджит локальные pending-строки в remote-результаты → после
  lockdown они продолжат всплывать как реальные. Убрать merge, мигрировать/очистить
  legacy local booking state.

### D6 — Old-client gate (P1)
- Capacitor встраивает фронт → старые установки продолжат прямой upsert + ложный
  local success после RLS-denial. Web SW network-first (менее критично). Нужен
  gate: подтверждённый ноль установленных/реальных клиентов, форс-апдейт, или явно
  принятое fail-closed поведение до lockdown.

### D7 — Grants, не только RLS (P2)
- `anon`/`authenticated` сейчас `GRANT ALL`. Revoke mutation-привилегии, оставить
  только SELECT (least-privilege), без rollback к небезопасной политике.

### D8 — Прочие инварианты
- `request_id` и `date` тоже nullable, но required по типам → включить в NOT NULL.

### Связанное, вынесено отдельными задачами (НЕ scope BLI-138, но Codex поднял)
- **Account-deletion lifecycle (P1, 152-ФЗ):** bookings NO ACTION FK; удаление
  аккаунта не удаляет/анонимизирует bookings до удаления auth-юзера → orphan/FK.
  `api/auth/delete-account.ts`. → отдельный Linear.
- **`booking_confirmations` integrity (P1):** та же ALL participant-policy +
  клиент молча игнорит ошибки (`confirmations.ts:51`). → отдельный Linear.

**Статус после #1:** направление Confirmed; дизайн переработать под D1-D8 (особенно
provenance D1 — переворачивает контракт create). Связанные задачи вынесены. Нужен
повторный Codex review переработанного дизайна перед реализацией.
