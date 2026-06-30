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
