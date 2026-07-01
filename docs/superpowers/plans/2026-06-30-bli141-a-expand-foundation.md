# BLI-141 План A — Foundation (expand-фаза) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить аддитивный (обратимый, без смены поведения) фундамент схемы для эпика целостности booking: новые nullable-колонки на `bookings`/`booking_confirmations` и таблицу `account_deletions`.

**Architecture:** Чистая expand-фаза DB-протокола (CODEX_DB_CHANGE_PROTOCOL.md). Только аддитивный DDL: новые nullable-колонки, новая таблица, новые индексы/FK на новых колонках. Никаких NOT NULL, CHECK-инвариантов активности, RLS-lockdown, REVOKE — это План E (contract). После Плана A прод-поведение не меняется; старый и новый код совместимы со схемой.

**Tech Stack:** Supabase (PostgreSQL 17.6), SQL-миграции в `supabase/migrations/`, локальная верификация через `supabase db reset` + `docker exec ... psql` guard-SQL.

## Global Constraints

- Дизайн-источник: `docs/superpowers/specs/2026-06-30-bli141-booking-integrity-lifecycle-epic-design.md` (ред. 3). Каждая задача реализует фрагмент §2/§3.1/§8.
- DB-протокол: `.context/CODEX_DB_CHANGE_PROTOCOL.md` — четыре источника должны совпасть; точные постусловия + rollback runbook обязательны.
- Идентичность (verified §1): `bookings.parent_id/nanny_id` = UUID → `auth.users(id)`; `bookings.request_id` = TEXT → `parents(id)`; `nannies.id`/`parents.id` = TEXT entity-id; `nannies.user_id`/`parents.user_id` = UUID auth-uid.
- Только аддитивно и обратимо. Все новые колонки **nullable** без DEFAULT, меняющего существующие строки. `account_deletions.user_id` — **БЕЗ FK к `auth.users`** (строка переживает удаление identity).
- Имя миграции: `supabase/migrations/20260630193000_bli141_expand_booking_integrity.sql`. Rollback: `scripts/sql/rollback_20260630193000.sql`.
- Локальный DB-контейнер: `supabase_db_blizko_3`. Применение: `supabase db reset` (DB-only fallback при нездоровых контейнерах: `supabase db reset` пересоздаёт только БД из миграций). Guard-SQL — через `docker exec -i supabase_db_blizko_3 psql -U postgres -d postgres`.
- Никаких секретов в миграциях/скриптах. Русский во всех артефактах; SQL-идентификаторы английские.
- **Прод-precondition (Codex #4, для будущего прод-применения, НЕ локально):** «аддитивно» ≠ «без блокировок». `ALTER TABLE ... ADD CONSTRAINT UNIQUE` строит индекс со сканом `bookings` и берёт table-lock; на проде — сперва row-count/size-аудит `bookings`, задать `lock_timeout`, и решить normal vs `CREATE UNIQUE INDEX CONCURRENTLY` + `ADD CONSTRAINT ... USING INDEX` при значимой кардинальности/трафике. На локальной синтетике (текущая фаза) — normal DDL.
- **Type-обновления (Codex #6):** репо имеет РУЧНЫЕ TS-интерфейсы booking/confirmation (`src/services/booking.ts`, `confirmations.ts` — касты через `as`). План A **не требует** правок TS: новые колонки nullable и не читаются/пишутся кодом до Плана B. Плановое обновление интерфейсов (добавить опциональные поля) делает **План B** при подключении endpoints — зафиксировано здесь явно, не «если используются».

---

## File Structure

- `supabase/migrations/20260630193000_bli141_expand_booking_integrity.sql` — единая expand-миграция (создаётся инкрементально по задачам).
- `scripts/sql/rollback_20260630193000.sql` — реверс expand-миграции.
- `scripts/sql/bli141_expand_guards.sql` — постусловия (guard-ассерты), используется как «тест» в каждой задаче.

---

### Task 1: account_deletions table

**Files:**
- Create: `supabase/migrations/20260630193000_bli141_expand_booking_integrity.sql`
- Create: `scripts/sql/bli141_expand_guards.sql`

**Interfaces:**
- Produces: таблица `public.account_deletions (user_id uuid PK, state text, attempts int, lease_until timestamptz, last_error text, created_at timestamptz, updated_at timestamptz)`; CHECK `state IN ('deleting','db_done','deleted','failed')`. Потребляется Планами B (deletion-guard) и C (lifecycle/reconciler).

**ВАЖНО (Codex #1):** `account_deletions` — service-only таблица. Новые public-таблицы
в Supabase получают дефолтный GRANT ALL для `anon`/`authenticated` (см.
`remote_schema.sql` default privileges + `20260604140000_revoke_service_only_table_grants.sql`).
Поэтому RLS + REVOKE делаются **в этой же задаче**, НЕ откладываются в План E — иначе
таблица анонимно-писабельна (anon мог бы вставлять UUID, менять state, читать
`last_error`, блокировать создание booking через deletion-guard). Паттерн — как `phone_otps`.

- [ ] **Step 1: Write the failing guard**

Создать `scripts/sql/bli141_expand_guards.sql` с первым (точным) ассертом:

```sql
-- BLI-141 expand-фаза постусловия. Точные ассерты (DB-протокол: IF NOT EXISTS
-- мог бы оставить несовместимый объект — проверяем каталог явно). Каждый DO падает с ASSERT.
DO $$
DECLARE t_oid oid;
BEGIN
  SELECT c.oid INTO t_oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='account_deletions';
  ASSERT t_oid IS NOT NULL, 'account_deletions missing';
  -- точные колонки/типы/nullability/defaults
  ASSERT (SELECT format_type(atttypid,atttypmod) FROM pg_attribute
          WHERE attrelid=t_oid AND attname='user_id') = 'uuid', 'user_id not uuid';
  ASSERT (SELECT attnotnull FROM pg_attribute WHERE attrelid=t_oid AND attname='state'), 'state must be NOT NULL';
  ASSERT (SELECT attnotnull FROM pg_attribute WHERE attrelid=t_oid AND attname='attempts'), 'attempts must be NOT NULL';
  -- PK именно на user_id
  ASSERT (SELECT string_agg(a.attname,',' ORDER BY a.attnum)
          FROM pg_constraint con JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=ANY(con.conkey)
          WHERE con.conrelid=t_oid AND con.contype='p') = 'user_id', 'PK must be (user_id)';
  -- state CHECK перечисляет ровно 4 состояния
  ASSERT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t_oid AND contype='c'
          AND pg_get_constraintdef(oid) ILIKE '%deleting%db_done%deleted%failed%'), 'state CHECK wrong';
  -- НЕТ FK (переживает удаление auth.users)
  ASSERT NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t_oid AND contype='f'), 'account_deletions must NOT have FK';
  -- RLS включён
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid=t_oid), 'RLS not enabled on account_deletions';
  -- НИ anon НИ authenticated не имеют привилегий
  ASSERT NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
          WHERE table_schema='public' AND table_name='account_deletions'
            AND grantee IN ('anon','authenticated')), 'anon/authenticated must have NO grants';
  RAISE NOTICE 'Task1 guards passed';
END $$;
```

- [ ] **Step 2: Run guard to verify it fails**

Run:
```bash
docker exec -i supabase_db_blizko_3 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/sql/bli141_expand_guards.sql
```
Expected: FAIL — `ERROR: account_deletions missing` (таблицы ещё нет).

- [ ] **Step 3: Write the migration (account_deletions + lockdown)**

Создать `supabase/migrations/20260630193000_bli141_expand_booking_integrity.sql`:

```sql
-- BLI-141 expand-фаза: аддитивный фундамент целостности booking.
-- ОБРАТИМО. Без NOT NULL/CHECK-активности booking-инвариантов (это План E contract).
-- account_deletions — service-only, поэтому RLS+REVOKE делаются здесь же.

-- 1. Durable deletion workflow (дизайн §3.1). user_id БЕЗ FK к auth.users —
--    строка переживает удаление identity (для reconciler/аудита).
CREATE TABLE IF NOT EXISTS public.account_deletions (
  user_id     uuid PRIMARY KEY,
  state       text NOT NULL DEFAULT 'deleting'
              CHECK (state IN ('deleting','db_done','deleted','failed')),
  attempts    int  NOT NULL DEFAULT 0,
  lease_until timestamptz,
  last_error  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_deletions OWNER TO postgres;

-- Service-only lockdown (как phone_otps): RLS + снять клиентские grants.
-- Доступ только через service_role (обходит RLS/grants). Никаких policy для
-- anon/authenticated → полный deny на привилегийном уровне.
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletions FROM anon, authenticated;
```

- [ ] **Step 4: Apply migration and run guard**

Run:
```bash
supabase db reset
docker exec -i supabase_db_blizko_3 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/sql/bli141_expand_guards.sql
```
Expected: PASS — `NOTICE: Task1 guards passed`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260630193000_bli141_expand_booking_integrity.sql scripts/sql/bli141_expand_guards.sql
git commit -m "feat(bli141): expand — таблица account_deletions (durable deletion workflow, RLS+REVOKE)"
```

---

### Task 2: bookings new nullable columns

**Files:**
- Modify: `supabase/migrations/20260630193000_bli141_expand_booking_integrity.sql`
- Modify: `scripts/sql/bli141_expand_guards.sql`

**Interfaces:**
- Consumes: существующая таблица `public.bookings` (`id uuid PK`, `parent_id`, `nanny_id`, `request_id`, `date`, `status`, `amount`, `created_at`).
- Produces: новые nullable-колонки `bookings.idempotency_key text` (**named UNIQUE constraint `bookings_idempotency_key_key`** — совпадает с §4 дизайна, на который Plan B ветвится по имени constraint), `idempotency_fingerprint text`, `nanny_profile_id text` (FK `bookings_nanny_profile_id_fkey` → `nannies(id) ON DELETE SET NULL`), `parent_erased_at timestamptz`, `nanny_erased_at timestamptz`. Потребляется Планом B (create пишет ключ/fingerprint/provenance; ловит `bookings_idempotency_key_key`) и Планом E (NOT NULL на idempotency_key).

- [ ] **Step 1: Write the failing guard**

Добавить в `scripts/sql/bli141_expand_guards.sql` второй (точный) блок:

```sql
DO $$
DECLARE b_oid oid;
BEGIN
  SELECT c.oid INTO b_oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='bookings';
  -- ровно 5 новых колонок присутствуют
  ASSERT (SELECT count(*) FROM pg_attribute WHERE attrelid=b_oid AND NOT attisdropped
            AND attname IN ('idempotency_key','idempotency_fingerprint',
                            'nanny_profile_id','parent_erased_at','nanny_erased_at')) = 5,
         'bookings expand columns missing';
  -- idempotency_key пока NULLABLE (NOT NULL — План E)
  ASSERT NOT (SELECT attnotnull FROM pg_attribute WHERE attrelid=b_oid AND attname='idempotency_key'),
         'idempotency_key must stay nullable in expand';
  -- named UNIQUE constraint именно на (idempotency_key), имя совпадает с §4 дизайна
  ASSERT EXISTS (SELECT 1 FROM pg_constraint
          WHERE conrelid=b_oid AND conname='bookings_idempotency_key_key' AND contype='u'
            AND (SELECT string_agg(a.attname,',' ORDER BY a.attnum)
                 FROM pg_attribute a WHERE a.attrelid=b_oid AND a.attnum=ANY(pg_constraint.conkey))='idempotency_key'),
         'bookings_idempotency_key_key must be UNIQUE(idempotency_key)';
  -- FK nanny_profile_id -> nannies ON DELETE SET NULL, scoped по таблице
  ASSERT (SELECT confdeltype FROM pg_constraint
          WHERE conrelid=b_oid AND conname='bookings_nanny_profile_id_fkey' AND contype='f') = 'n', -- 'n'=SET NULL
         'nanny_profile_id FK must be ON DELETE SET NULL';
  RAISE NOTICE 'Task2 guards passed';
END $$;
```

- [ ] **Step 2: Run guard to verify it fails**

Run:
```bash
docker exec -i supabase_db_blizko_3 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/sql/bli141_expand_guards.sql
```
Expected: FAIL — `bookings expand columns missing`.

- [ ] **Step 3: Extend the migration (bookings columns)**

Дописать в `supabase/migrations/20260630193000_bli141_expand_booking_integrity.sql`:

```sql
-- 2. bookings — новые nullable-колонки (дизайн §2). Без NOT NULL (План E).
--    bookings — client-read под RLS (оставлена как есть в 20260604140000), новые
--    nullable-колонки не меняют её grant-модель; REVOKE тут не нужен.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS idempotency_key         text,
  ADD COLUMN IF NOT EXISTS idempotency_fingerprint text,
  ADD COLUMN IF NOT EXISTS nanny_profile_id        text,
  ADD COLUMN IF NOT EXISTS parent_erased_at        timestamptz,
  ADD COLUMN IF NOT EXISTS nanny_erased_at         timestamptz;

-- Named UNIQUE constraint (НЕ просто индекс) — имя bookings_idempotency_key_key
-- совпадает с §4 дизайна, на которое Plan B ветвится по SQLSTATE 23505 constraint_name.
-- NULL допускается множественно (глобальный ключ по non-null значениям).
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_idempotency_key_key UNIQUE (idempotency_key);

-- Провенанс выбора няни → nannies(id) ON DELETE SET NULL (не RESTRICT).
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_nanny_profile_id_fkey
  FOREIGN KEY (nanny_profile_id) REFERENCES public.nannies(id) ON DELETE SET NULL;
```

- [ ] **Step 4: Apply migration and run guard**

Run:
```bash
supabase db reset
docker exec -i supabase_db_blizko_3 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/sql/bli141_expand_guards.sql
```
Expected: PASS — `Task1 guards passed` + `Task2 guards passed`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260630193000_bli141_expand_booking_integrity.sql scripts/sql/bli141_expand_guards.sql
git commit -m "feat(bli141): expand — nullable-колонки bookings (idempotency/provenance/erased_at)"
```

---

### Task 3: booking_confirmations recipient columns

**Files:**
- Modify: `supabase/migrations/20260630193000_bli141_expand_booking_integrity.sql`
- Modify: `scripts/sql/bli141_expand_guards.sql`

**Interfaces:**
- Consumes: существующая `public.booking_confirmations` (`id`, `booking_id`, `type`, `status`, `due_at`, `responded_at`, `created_at`).
- Produces: `booking_confirmations.recipient_role text` (без CHECK в expand — CHECK добавит План D/E), `recipient_user_id uuid` (nullable, без FK к auth.users — обезличивается). Потребляется Планом D (authz по recipient).

- [ ] **Step 1: Write the failing guard**

Добавить третий блок в `scripts/sql/bli141_expand_guards.sql`:

```sql
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM information_schema.columns
          WHERE table_schema='public' AND table_name='booking_confirmations'
            AND column_name IN ('recipient_role','recipient_user_id')) = 2,
         'booking_confirmations recipient columns missing';
  ASSERT (SELECT data_type FROM information_schema.columns
          WHERE table_schema='public' AND table_name='booking_confirmations'
            AND column_name='recipient_user_id') = 'uuid',
         'recipient_user_id not uuid';
  RAISE NOTICE 'Task3 guards passed';
END $$;
```

- [ ] **Step 2: Run guard to verify it fails**

Run:
```bash
docker exec -i supabase_db_blizko_3 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/sql/bli141_expand_guards.sql
```
Expected: FAIL — `booking_confirmations recipient columns missing`.

- [ ] **Step 3: Extend the migration (confirmations columns)**

Дописать в миграцию:

```sql
-- 3. booking_confirmations — явный адресат (дизайн §8). Nullable в expand;
--    CHECK(recipient_role IN ('family','nanny')) и backfill — План D/E.
ALTER TABLE public.booking_confirmations
  ADD COLUMN IF NOT EXISTS recipient_role    text,
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid;
```

- [ ] **Step 4: Apply migration and run guard**

Run:
```bash
supabase db reset
docker exec -i supabase_db_blizko_3 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/sql/bli141_expand_guards.sql
```
Expected: PASS — три блока `passed`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260630193000_bli141_expand_booking_integrity.sql scripts/sql/bli141_expand_guards.sql
git commit -m "feat(bli141): expand — recipient-колонки booking_confirmations"
```

---

### Task 4: Rollback script + reversibility proof + types

**Files:**
- Create: `scripts/sql/rollback_20260630193000.sql`
- Create: `scripts/sql/bli141_expand_revert_guard.sql`
- Type-обновления: **нет** в Плане A (новые колонки nullable/неиспользуемые; ручные TS-интерфейсы booking/confirmation правит План B при подключении endpoints).

**Interfaces:**
- Produces: обратимость expand-миграции (apply → rollback → схема как до миграции).

**Окно валидности rollback (Codex #5):** этот rollback безопасен **только до adoption** —
пока Планы B-D не начали писать `account_deletions`/`idempotency_*`/`recipient_*`. После
записи данных rollback уничтожит deletion-state, idempotency-доказательства и provenance →
использовать forward-fix ИЛИ сперва экспортировать/сохранить затронутые данные.

- [ ] **Step 1: Write the rollback script**

Создать `scripts/sql/rollback_20260630193000.sql` (реверс в обратном порядке):

```sql
-- Реверс BLI-141 expand-миграции 20260630193000. Только что добавленное снимается.
-- ВНИМАНИЕ: безопасно ТОЛЬКО до adoption (Планы B-D ещё не писали данные).
ALTER TABLE public.booking_confirmations
  DROP COLUMN IF EXISTS recipient_role,
  DROP COLUMN IF EXISTS recipient_user_id;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_nanny_profile_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_idempotency_key_key;
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS idempotency_key,
  DROP COLUMN IF EXISTS idempotency_fingerprint,
  DROP COLUMN IF EXISTS nanny_profile_id,
  DROP COLUMN IF EXISTS parent_erased_at,
  DROP COLUMN IF EXISTS nanny_erased_at;

DROP TABLE IF EXISTS public.account_deletions;
```

- [ ] **Step 2: Write the reversibility guard**

Создать временный ассерт `scripts/sql/bli141_expand_revert_guard.sql`:

```sql
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM information_schema.tables
          WHERE table_schema='public' AND table_name='account_deletions') = 0,
         'account_deletions still present after rollback';
  ASSERT (SELECT count(*) FROM information_schema.columns
          WHERE table_schema='public' AND table_name='bookings'
            AND column_name IN ('idempotency_key','idempotency_fingerprint',
                                 'nanny_profile_id','parent_erased_at','nanny_erased_at')) = 0,
         'bookings expand columns still present after rollback';
  ASSERT (SELECT count(*) FROM information_schema.columns
          WHERE table_schema='public' AND table_name='booking_confirmations'
            AND column_name IN ('recipient_role','recipient_user_id')) = 0,
         'confirmations recipient columns still present after rollback';
  RAISE NOTICE 'Revert guards passed';
END $$;
```

- [ ] **Step 3: Apply migration, then rollback, then verify clean**

Run:
```bash
supabase db reset
docker exec -i supabase_db_blizko_3 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/sql/rollback_20260630193000.sql
docker exec -i supabase_db_blizko_3 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/sql/bli141_expand_revert_guard.sql
```
Expected: PASS — `Revert guards passed` (схема вернулась к до-миграционному состоянию).

- [ ] **Step 4: Re-apply forward and confirm expand guards pass (idempotent forward)**

Run:
```bash
supabase db reset
docker exec -i supabase_db_blizko_3 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/sql/bli141_expand_guards.sql
```
Expected: PASS — три блока `passed` (миграция чисто применяется с нуля).

- [ ] **Step 5: Commit**

```bash
git add scripts/sql/rollback_20260630193000.sql scripts/sql/bli141_expand_revert_guard.sql
git commit -m "feat(bli141): expand — rollback-скрипт + доказательство обратимости"
```

---

## Postconditions (Плана A)

- `account_deletions` существует (PK на user_id, CHECK state 4 значения, без FK к auth.users, **RLS включён, anon/authenticated без привилегий** — service-only).
- `bookings` имеет 5 новых nullable-колонок + named UNIQUE constraint `bookings_idempotency_key_key` + FK `bookings_nanny_profile_id_fkey` ON DELETE SET NULL. bookings остаётся client-read под RLS (grant-модель не изменена).
- `booking_confirmations` имеет recipient_role/recipient_user_id (nullable).
- Прод-поведение существующих потоков НЕ изменено: bookings/confirmations — аддитивные nullable-колонки под текущей RLS; account_deletions — новая, но залочена (RLS+REVOKE), не доступна клиенту.
- Guard'ы проверяют ТОЧНЫЕ постусловия (pg_class/pg_attribute/pg_constraint/ACL/RLS), не только существование.
- Доказана обратимость (apply→rollback→clean) и чистое forward-применение.
- Никакого booking-инвариант-CHECK/NOT NULL/RLS-split bookings/REVOKE bookings (это План E).

## Out of scope (следующие планы)

- План B: create/status endpoints, idempotency-алгоритм, provenance-вывод.
- План C: delete-account lifecycle + reconciler (использует `account_deletions`).
- План D: confirmations server-authoritative + authz по recipient.
- План E: backfill → NOT NULL/canonical CHECK/partial unique active-index/FK SET NULL на uid/RLS-split/REVOKE grants (contract-lockdown).
- Типизация `amount` (TEXT→numeric) — План B/E (нужна для canonical fingerprint).
