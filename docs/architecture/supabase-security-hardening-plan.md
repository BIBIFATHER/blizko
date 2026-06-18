# Supabase security hardening plan — DRAFT (Phase 2 / PoC T13)

Дата: 2026-06-18. **План для approve владельца.** Источник: Supabase security
advisors (project `geomyyfjvemdphaeimkz`, проверено 2026-06-18). Это **прод-БД
изменения** → применять по `.context/CODEX_DB_CHANGE_PROTOCOL.md` (миграция через
`supabase db push --linked`) + approve владельца + повторный прогон advisors.
Сейчас контур synthetic-only — не срочно, но **обязательно до реальных данных**
(deny-by-default, memo §8, PoC T13).

> ⚠️ Не применять автоматически. Часть изменений (revoke anon SELECT) может
> сломать публичный каталог нянь, если фронт читает таблицы напрямую через
> PostgREST anon. **Перед применением проверить зависимости** (ниже).

## Находки и план

### F1 — ERROR: SECURITY DEFINER view `public.nannies_public`
- Риск: вью исполняет права создателя, обходя RLS вызывающего.
- Fix (Codex): `security_invoker=true` СЛОМАЕТ публичный каталог (нет другого
  anon-пути). Текущий вью стрипит лишь **3 denylist-ключа** → риск утечки новых
  payload-ключей. Правильно: **либо** вынести каталог полностью за server API
  (`/api/nannies`, service-role), **либо** оставить DEFINER, но заменить
  denylist на **явный allowlist** полей + сузить grants.

### F2 — WARN: function search_path mutable (`update_updated_at`, `update_matching_outcomes_updated_at`)
- Риск: search_path injection в trigger-функциях.
- Fix: `ALTER FUNCTION ... SET search_path = ''` (или `pg_catalog, public`),
  квалифицировать имена. Низкий риск, чистая правка.

### F3 — WARN: публичные бакеты `nanny-photos` / `nanny-videos` разрешают листинг
- Риск: широкая SELECT-политика на `storage.objects` → клиент может перечислить
  ВСЕ файлы бакета (не только получить по URL).
- Fix: сузить политику до доступа по объекту (без list) ИЛИ сделать бакеты
  приватными + server-issued signed URLs (предпочтительно для реальных фото/видео).
- Зависимость: как фронт отображает фото — по прямому public URL или signed.

### F4 — WARN: `anon`/`authenticated` SELECT на PD-таблицах (pg_graphql 0026/0027)
Таблицы: `parents`, `nannies`, `chat_messages`, `chat_participants`,
`chat_threads`, `bookings`, `booking_confirmations`, `support_messages`,
`support_tickets`, `matching_*`, вью `nannies_public`.
- Риск: объекты дискаверабельны через PostgREST/GraphQL anon-ключом; RLS гейтит
  СТРОКИ, но grant SELECT на PD-таблицы — лишняя поверхность (deny-by-default нарушен).
- **Проверено 2026-06-18 (зависимости фронта):**
  - Публичный каталог нянь читается через **`nannies_public` view** (PII strip):
    `src/services/storage.ts:158-160`, `api/_nannies.ts:42`. Базовую `nannies`
    публично читать не нужно.
  - Остальные PD-таблицы (`chat_*`, `bookings`, `support_*`, `matching_*`,
    `parents`, `nannies`) браузер читает напрямую как **`authenticated`** (после
    логина), RLS гейтит строки: `matchChat.ts`, `booking.ts`, `supportEngine.ts`,
    `matchingFeedback.ts`, `core/ai/*`.
- Fix (взвешенно):
  - **`anon`:** `REVOKE SELECT ... FROM anon` для всех PD-таблиц/вью **БЕЗОПАСНО**
    — публичка идёт через view, остальное — после логина. Публичный каталог
    оставить только через `nannies_public` (для anon — только он, если нужен
    pre-login просмотр).
  - **`authenticated`:** **НЕ ревокать** — приложение читает таблицы напрямую;
    контроль = RLS (deny-by-default на уровне строк). Lint 0027 = «дискаверабельно
    каждому аккаунту»; здесь это by design, защита — RLS, не grant. Подтвердить,
    что RLS-политики deny-by-default на каждой таблице (отдельный чек).

### F5 — WARN: SECURITY DEFINER RPC `can_current_user_access_support_thread` исполним anon/authenticated
- Риск: anon может вызвать DEFINER-функцию через `/rest/v1/rpc/...`.
- Fix: `REVOKE EXECUTE ... FROM anon` (и authenticated, если не нужно); либо
  `SECURITY INVOKER`; либо вынести из exposed-схемы. Проверить вызовы в коде.

### F6 — WARN: Leaked Password Protection отключена
- Fix: включить в Supabase Auth (dashboard, владелец) — проверка паролей по HIBP.

### F7 — P1 (Codex): широкий `GRANT ALL` на PD-таблицах, а не только SELECT
- Риск: текущие гранты — `GRANT ALL` для `anon`/`authenticated` на многих
  PD-таблицах (включая INSERT/UPDATE/DELETE), плюс **default privileges** выдают
  права и БУДУЩИМ таблицам/функциям.
- Fix: заменить `GRANT ALL` на per-table least-privilege: `anon` — ничего, кроме
  намеренных публичных вью/конфигов; `authenticated` — только точные
  SELECT/INSERT/UPDATE, реально используемые приложением. `ALTER DEFAULT
  PRIVILEGES ... REVOKE` для будущих объектов. (Хардening не ограничивать SELECT.)

### F8 — P1 (Codex): слабый RLS `chat_participants` — эскалация в чужой чат
- Риск: INSERT-политика проверяет только `auth.uid() = user_id` → любой
  залогиненный пользователь может **добавить себя в ЛЮБОЙ тред** (зная
  `thread_id`), затем SELECT сообщений доверяет членству в `chat_participants` →
  **чтение чужой переписки.** Фронт делает прямой upsert participant
  (`matchChat.ts:21`). В synthetic-only активно не эксплуатируется (только
  owner-аккаунты), но **must-fix до реальных юзеров.**
- Fix: INSERT/UPSERT participant разрешать только если вызывающий уже
  `chat_threads.family_id`/`nanny_id`, существующий участник, support-agent через
  безопасный helper, или service_role. Добавить как **новый RISK в RISK_REGISTER.**

### F9 — P2 (Codex): `support_messages` INSERT допускает подмену отправителя
- Риск: INSERT-политика проверяет только владение тикетом, не поля отправителя →
  владелец тикета может писать любой `sender_type`/`sender_id` (выдать себя за
  AI/агента). Фронт шлёт user-сообщения напрямую (`supportEngine.ts:88`).
- Fix: authenticated-клиент INSERT — требовать `sender_type='user'` И
  `sender_id=auth.uid()`; сообщения AI/агента — только service/admin.

## Порядок применения (после approve + проверки зависимостей)
1. Проверить зависимости фронта (F3/F4): grep браузерных прямых чтений таблиц/бакетов.
2. Написать миграцию `supabase/migrations/<ts>_security_hardening.sql` (F1/F2/F4/F5).
3. `supabase db push --linked` (по DB-протоколу), не manual DDL.
4. F3 bucket-policy + F6 — частично dashboard/storage-policy.
5. Повторный прогон advisors → подтвердить закрытие.
6. Обновить registers/RISK_REGISTER; smoke публичного каталога + чата (не сломано).

## Статус
План-черновик. Зависит от: approve владельца (прод-БД), проверки зависимостей
фронта (F3/F4), DB-протокола. Маппится на PoC **T13 (deny-by-default)** и
вторичную posture из аудита 2026-06-17.
