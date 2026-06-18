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
- Fix: пересоздать как `security_invoker = true` ИЛИ обосновать (это намеренный
  публичный каталог с коротким key-denylist). Проверить, что вью отдаёт только
  очищенные публичные поля.
- Зависимость: публичный каталог. Сохранить функциональность.

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
