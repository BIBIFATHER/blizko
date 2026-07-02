# BLI-141 План E — Contract lockdown + cutover runbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Завершить эпик BLI-141 до состояния «один owner-гейт до прода»: удалить мёртвый confirmations-клиент, написать migrate(backfill)- и contract(lockdown)-миграции с постусловиями и rollback, role-correct PG-интеграцию и cutover-runbook (§9/§10 дизайна).

**Architecture:** Expand-фаза (План A) и compatible-код (Планы B/C) уже на ветке. План E добавляет ТОЛЬКО файлы миграций/тестов/runbook — **ни одна миграция не применяется к проду**; локальная репетиция apply→rollback→reapply обязательна. Прод-исполнение — по runbook на owner-гейте.

**Tech Stack:** PostgreSQL DDL (supabase/migrations), pg (интеграция), Vitest, Markdown runbook.

## Global Constraints

- Design-источник: `docs/superpowers/specs/2026-06-30-bli141-booking-integrity-lifecycle-epic-design.md` §2/§4/§8/§9/§10/§11.
- **PE1 — Confirmations premise refuted (проверено grep 2026-07-02):** `src/services/confirmations.ts` — мёртвый код, ноль вызывающих у всех 5 экспортов. Server-authoritative respond-flow (бывший План D) НЕ строится (YAGNI: нет UX, нет вызывающих); BLI-140 уходит в продуктовый backlog. Lockdown `booking_confirmations` при этом безопасен — клиентских writers нет. Дизайн §8 амендируется (Task 0), сама таблица+каскад+recipient-колонки остаются.
- **PE2 — canonical active-набор:** `status IN ('pending','confirmed','active')` — единый для CHECK `bookings_active_complete`, partial index `bookings_active_pair_uq` и lifecycle. Копируется verbatim из §2/§4.
- **PE3 — имена констрейнтов фиксированы контрактом кода:** `bookings_idempotency_key_key` (уже существует, План A), `bookings_active_pair_uq` (создаёт этот план; `api/bookings.ts` ветвится по этим именам на SQLSTATE 23505).
- **PE4 — backfill детерминирован и идемпотентен:** `idempotency_key = 'legacy:'||id` (id уникален), `idempotency_fingerprint = 'sha256:v1:legacy'` (легаси-маркер, не участвует в replay-сравнении — легаси-строки не имеют живых intent-ретраев); повторный запуск не трогает уже заполненные. Ambiguous (активная строка с NULL parent_id/nanny_id/request_id/date — нарушит canonical CHECK) → **RAISE EXCEPTION, ABORT** всей транзакции (§9 шаг 4).
- **PE5 — FK recreation:** `parent_id`/`nanny_id` → auth.users, `request_id` → parents — пересоздать с `ON DELETE SET NULL` (сейчас NO ACTION). Это defense-in-depth для терминальных строк; порядок «lifecycle сперва cancel» гарантирует §6-код (План C), НЕ FK.
- **PE6 — RLS split + grants:** `bookings_participant` (ALL) → `bookings_participant_select` (FOR SELECT); `confirmations_participant` (ALL) → `confirmations_participant_select` (FOR SELECT). `REVOKE ALL FROM anon` на обеих таблицах; `authenticated` — только `SELECT`. Существующие RESTRICTIVE `*_deletion_barrier` политики (План C Task 7) НЕ трогаются. Серверные пути (pool, service_role) вне RLS.
- **PE7 — прод не трогаем.** Миграции — файлы на ветке + локальная репетиция. Порядок прод-исполнения фиксирует runbook (Task 4); после contract — только forward-fix (§10).
- Каждая миграция: `BEGIN...COMMIT`, DO-блок постусловий (fail-closed, паттерн барьер-миграции Плана C), парный rollback-скрипт в `scripts/sql/` с собственными постусловиями.
- Тесты: PG-интеграция `describe.skipIf(!INTEGRATION_PG_URL)`, паттерн `api/delete-account.integration.test.ts` (SET LOCAL ROLE authenticated + `request.jwt.claims`).
- Протокол пачки: git status → commit → push → Linear comment.

---

## File Structure

- Delete: `src/services/confirmations.ts` (Task 0, PE1).
- Modify: `docs/superpowers/specs/2026-06-30-bli141-booking-integrity-lifecycle-epic-design.md` §8 — амендмент (Task 0).
- Create: `supabase/migrations/20260702220000_bli141_e_backfill.sql` (Task 1).
- Create: `scripts/sql/rollback_20260702220000.sql` (Task 1).
- Create: `supabase/migrations/20260702230000_bli141_e_contract.sql` (Task 2).
- Create: `scripts/sql/rollback_20260702230000.sql` (Task 2).
- Create: `api/contract.integration.test.ts` (Task 3).
- Create: `docs/runbooks/2026-07-02-bli141-cutover.md` (Task 4).

---

### Task 0: удалить мёртвый confirmations-клиент + амендмент §8

**Files:**
- Delete: `src/services/confirmations.ts`
- Modify: design-док §8 (после строки 310)

**Interfaces:** Ничего не потребляет и не производит — файл не импортируется нигде (проверка в Step 1 обязательна).

- [ ] **Step 1: Пере-верифицировать отсутствие вызывающих (защита от гонки с параллельными ветками)**

Run: `grep -rn "confirmations" src --include='*.ts*' -l | grep -v "src/services/confirmations.ts"`
Expected: только несвязанные совпадения (`AuthModal.tsx` email-confirm, `ProfileTab.tsx` deleteConfirm, `translations.ts`, `types.ts`). Если появился импорт `services/confirmations` — СТОП, эскалация.

- [ ] **Step 2: Удалить файл**

```bash
git rm src/services/confirmations.ts
```

- [ ] **Step 3: Амендмент §8 design-дока**

После таблицы действий §8 (строка ~333) добавить:

```markdown
**Амендмент 2026-07-02 (План E, PE1):** премисса «`confirmations.ts:67` пускает
любого» опровергнута evidence: сервис — мёртвый код (0 вызывающих, grep
2026-07-02), фича не была подключена к UI. Server-authoritative respond-flow НЕ
строится до продуктового UX-решения (BLI-140 → продуктовый backlog). Клиентский
сервис удалён (План E Task 0). Таблица, каскад и recipient-колонки (expand)
остаются; RLS lockdown таблицы выполняется в contract-фазе без server-API —
ломать нечего. Mapping и правила respond этого параграфа вступают в силу при
реализации BLI-140.
```

- [ ] **Step 4: Verify + commit**

Run: `npm run typecheck && npx vitest run && npm run build`
Expected: чисто (мёртвый файл не участвовал в графе импортов).

```bash
git add docs/superpowers/specs/2026-06-30-bli141-booking-integrity-lifecycle-epic-design.md
git commit -m "chore(bli140): удалён мёртвый confirmations-клиент; §8 амендмент (премисса опровергнута)"
```

---

### Task 1: migrate-фаза — audit + идемпотентный backfill

**Files:**
- Create: `supabase/migrations/20260702220000_bli141_e_backfill.sql`
- Create: `scripts/sql/rollback_20260702220000.sql`

**Interfaces:**
- Produces: все строки `bookings` имеют non-NULL `idempotency_key`; активные строки гарантированно совместимы с canonical CHECK (иначе транзакция упала). Task 2 (contract) полагается на это.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260702220000_bli141_e_backfill.sql
-- BLI-141 План E, migrate-фаза (§9 шаги 3-5): audit + детерминированный
-- идемпотентный backfill. Прод — только через runbook на owner-гейте.

BEGIN;

-- 3. Read-only audit: активные строки, несовместимые с canonical CHECK (§2),
--    останавливают всю фазу (ambiguous -> ABORT, §9 шаг 4).
DO $$
DECLARE
  bad_active int;
BEGIN
  SELECT count(*) INTO bad_active
  FROM public.bookings
  WHERE status IN ('pending','confirmed','active')
    AND (parent_id IS NULL OR nanny_id IS NULL
         OR request_id IS NULL OR date IS NULL);
  IF bad_active > 0 THEN
    RAISE EXCEPTION 'backfill abort: % active bookings violate canonical completeness', bad_active;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE parent_id IS NOT NULL AND parent_id = nanny_id
  ) THEN
    RAISE EXCEPTION 'backfill abort: self-booking rows present';
  END IF;
END $$;

-- 4. Идемпотентный backfill ключей: только строки без ключа; 'legacy:'||id
--    детерминирован (id уникален). Fingerprint — легаси-маркер (PE4).
UPDATE public.bookings
SET idempotency_key         = 'legacy:' || id,
    idempotency_fingerprint = 'sha256:v1:legacy'
WHERE idempotency_key IS NULL;

-- 5. Провенанс nanny_profile_id: выводим детерминированно только когда у
--    nanny_id ровно одна строка nannies (иначе NULL — аудит-поле, не блокирует).
UPDATE public.bookings b
SET nanny_profile_id = n.id
FROM public.nannies n
WHERE b.nanny_profile_id IS NULL
  AND b.nanny_id IS NOT NULL
  AND n.user_id = b.nanny_id
  AND (SELECT count(*) FROM public.nannies n2 WHERE n2.user_id = b.nanny_id) = 1;

-- Постусловия фазы.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.bookings WHERE idempotency_key IS NULL) THEN
    RAISE EXCEPTION 'backfill postcondition failed: NULL idempotency_key rows remain';
  END IF;
END $$;

COMMIT;
```

- [ ] **Step 2: Write the rollback**

```sql
-- scripts/sql/rollback_20260702220000.sql
-- Откат backfill: снять только legacy-заполненные значения (строки, созданные
-- новым кодом с реальными ключами, НЕ трогаются).
BEGIN;
UPDATE public.bookings
SET idempotency_key = NULL, idempotency_fingerprint = NULL
WHERE idempotency_key LIKE 'legacy:%';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.bookings WHERE idempotency_key LIKE 'legacy:%') THEN
    RAISE EXCEPTION 'backfill rollback incomplete';
  END IF;
END $$;
COMMIT;
```

- [ ] **Step 3: Local rehearsal**

Run (локальный PG):
`psql "$INTEGRATION_PG_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260702220000_bli141_e_backfill.sql`
затем rollback-скрипт, затем повторно forward.
Expected: все три прохода чисто; повторный forward — no-op (идемпотентность).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260702220000_bli141_e_backfill.sql scripts/sql/rollback_20260702220000.sql
git commit -m "feat(bli141): migrate-фаза — audit + идемпотентный backfill idempotency_key/fingerprint/провенанс"
```

---

### Task 2: contract-фаза — lockdown

**Files:**
- Create: `supabase/migrations/20260702230000_bli141_e_contract.sql`
- Create: `scripts/sql/rollback_20260702230000.sql`

**Interfaces:**
- Produces: `bookings.idempotency_key NOT NULL`; CHECKs `bookings_active_complete`, `bookings_distinct_parties`; index `bookings_active_pair_uq`; FK `ON DELETE SET NULL`; RLS `bookings_participant_select`/`confirmations_participant_select` (FOR SELECT); grants: anon — ничего, authenticated — SELECT. `booking_confirmations.recipient_role` CHECK (NULL-допустимый до BLI-140).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260702230000_bli141_e_contract.sql
-- BLI-141 План E, contract-фаза (§9 шаги 6-9). Одна транзакция.
-- После применения на прод — только forward-fix (§10): клиент не откатывать
-- к direct-write, grants не возвращать.

BEGIN;

-- 6. NOT NULL после доказанного backfill (Task 1 постусловие).
ALTER TABLE public.bookings ALTER COLUMN idempotency_key SET NOT NULL;

-- 7a. Canonical CHECKs (§2, verbatim).
ALTER TABLE public.bookings ADD CONSTRAINT bookings_active_complete CHECK (
  status NOT IN ('pending','confirmed','active')
  OR (parent_id IS NOT NULL AND nanny_id IS NOT NULL
      AND request_id IS NOT NULL AND date IS NOT NULL)
);
ALTER TABLE public.bookings ADD CONSTRAINT bookings_distinct_parties CHECK (
  parent_id IS NULL OR nanny_id IS NULL OR parent_id <> nanny_id
);

-- 7b. Pair-cardinality (§4; имя фиксировано PE3 — код ветвится по нему).
CREATE UNIQUE INDEX bookings_active_pair_uq ON public.bookings (parent_id, nanny_id)
  WHERE status IN ('pending','confirmed','active');

-- 7c. FK recreation -> ON DELETE SET NULL (PE5; defense-in-depth для
--     терминальных строк, у активных canonical CHECK не даст обнулить).
ALTER TABLE public.bookings
  DROP CONSTRAINT bookings_parent_id_fkey,
  ADD CONSTRAINT bookings_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.bookings
  DROP CONSTRAINT bookings_nanny_id_fkey,
  ADD CONSTRAINT bookings_nanny_id_fkey
    FOREIGN KEY (nanny_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.bookings
  DROP CONSTRAINT bookings_request_id_fkey,
  ADD CONSTRAINT bookings_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES public.parents(id) ON DELETE SET NULL;

-- 7d. recipient_role CHECK (адресат из §8; NULL допустим до BLI-140).
ALTER TABLE public.booking_confirmations
  ADD CONSTRAINT booking_confirmations_recipient_role_check
  CHECK (recipient_role IS NULL OR recipient_role IN ('family','nanny'));

-- 8. RLS split: ALL-политики участника -> только SELECT. Мутации — service_role
--    (bypassrls) через серверные endpoints. RESTRICTIVE deletion-барьеры не трогаем.
DROP POLICY "bookings_participant" ON public.bookings;
CREATE POLICY bookings_participant_select ON public.bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = parent_id OR auth.uid() = nanny_id);

DROP POLICY "confirmations_participant" ON public.booking_confirmations;
CREATE POLICY confirmations_participant_select ON public.booking_confirmations
  FOR SELECT TO authenticated
  USING (booking_id IN (
    SELECT id FROM public.bookings
    WHERE auth.uid() = parent_id OR auth.uid() = nanny_id
  ));

-- 9. Grants: anon — ничего; authenticated — только SELECT.
REVOKE ALL ON public.bookings FROM anon;
REVOKE ALL ON public.bookings FROM authenticated;
GRANT SELECT ON public.bookings TO authenticated;
REVOKE ALL ON public.booking_confirmations FROM anon;
REVOKE ALL ON public.booking_confirmations FROM authenticated;
GRANT SELECT ON public.booking_confirmations TO authenticated;

-- Постусловия (fail-closed).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='bookings'
      AND column_name='idempotency_key' AND is_nullable='YES'
  ) THEN
    RAISE EXCEPTION 'contract: idempotency_key still nullable';
  END IF;

  IF (SELECT count(*) FROM pg_constraint
      WHERE conname IN ('bookings_active_complete','bookings_distinct_parties',
                        'booking_confirmations_recipient_role_check')) <> 3 THEN
    RAISE EXCEPTION 'contract: CHECK constraints missing';
  END IF;

  IF to_regclass('public.bookings_active_pair_uq') IS NULL THEN
    RAISE EXCEPTION 'contract: pair index missing';
  END IF;

  IF (SELECT count(*) FROM pg_constraint
      WHERE conname IN ('bookings_parent_id_fkey','bookings_nanny_id_fkey',
                        'bookings_request_id_fkey')
        AND confdeltype = 'n') <> 3 THEN
    RAISE EXCEPTION 'contract: FK ON DELETE SET NULL missing';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
             WHERE c.relname IN ('bookings','booking_confirmations')
               AND p.polname IN ('bookings_participant','confirmations_participant')) THEN
    RAISE EXCEPTION 'contract: old ALL policies still present';
  END IF;

  IF (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
      WHERE c.relname IN ('bookings','booking_confirmations')
        AND p.polname IN ('bookings_participant_select','confirmations_participant_select')
        AND p.polpermissive AND p.polcmd = 'r') <> 2 THEN
    RAISE EXCEPTION 'contract: SELECT policies missing/wrong command';
  END IF;

  IF has_table_privilege('anon','public.bookings','SELECT')
     OR has_table_privilege('anon','public.booking_confirmations','SELECT')
     OR has_table_privilege('authenticated','public.bookings','INSERT')
     OR has_table_privilege('authenticated','public.bookings','UPDATE')
     OR has_table_privilege('authenticated','public.bookings','DELETE')
     OR has_table_privilege('authenticated','public.booking_confirmations','INSERT')
     OR NOT has_table_privilege('authenticated','public.bookings','SELECT')
  THEN
    RAISE EXCEPTION 'contract: grants mismatch';
  END IF;
END $$;

COMMIT;
```

- [ ] **Step 2: Write the rollback**

```sql
-- scripts/sql/rollback_20260702230000.sql
-- Аварийный откат contract-фазы ДО прод-cutover (после cutover — forward-fix only,
-- §10: возвращение client-write grants небезопасно и не выполняется).
BEGIN;

ALTER TABLE public.bookings ALTER COLUMN idempotency_key DROP NOT NULL;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_active_complete;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_distinct_parties;
ALTER TABLE public.booking_confirmations
  DROP CONSTRAINT IF EXISTS booking_confirmations_recipient_role_check;
DROP INDEX IF EXISTS public.bookings_active_pair_uq;

ALTER TABLE public.bookings
  DROP CONSTRAINT bookings_parent_id_fkey,
  ADD CONSTRAINT bookings_parent_id_fkey
    FOREIGN KEY (parent_id) REFERENCES auth.users(id);
ALTER TABLE public.bookings
  DROP CONSTRAINT bookings_nanny_id_fkey,
  ADD CONSTRAINT bookings_nanny_id_fkey
    FOREIGN KEY (nanny_id) REFERENCES auth.users(id);
ALTER TABLE public.bookings
  DROP CONSTRAINT bookings_request_id_fkey,
  ADD CONSTRAINT bookings_request_id_fkey
    FOREIGN KEY (request_id) REFERENCES public.parents(id);

DROP POLICY IF EXISTS bookings_participant_select ON public.bookings;
CREATE POLICY "bookings_participant" ON public.bookings
  USING ((auth.uid() = parent_id) OR (auth.uid() = nanny_id));
DROP POLICY IF EXISTS confirmations_participant_select ON public.booking_confirmations;
CREATE POLICY "confirmations_participant" ON public.booking_confirmations
  USING (booking_id IN (SELECT bookings.id FROM public.bookings
         WHERE (auth.uid() = parent_id) OR (auth.uid() = nanny_id)));

GRANT ALL ON public.bookings TO anon, authenticated;
GRANT ALL ON public.booking_confirmations TO anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.bookings_active_pair_uq') IS NOT NULL
     OR EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_active_complete')
  THEN
    RAISE EXCEPTION 'contract rollback incomplete';
  END IF;
END $$;
COMMIT;
```

- [ ] **Step 3: Local rehearsal**

Run: forward (`-v ON_ERROR_STOP=1`) → rollback → forward.
Expected: чисто; финальное состояние — contract применён.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260702230000_bli141_e_contract.sql scripts/sql/rollback_20260702230000.sql
git commit -m "feat(bli141): contract-фаза — NOT NULL, canonical CHECKs, pair-index, FK SET NULL, RLS split, REVOKE"
```

---

### Task 3: PG-интеграция — role-correct lockdown

**Files:**
- Create: `api/contract.integration.test.ts`

**Interfaces:** Прогон против локального PG с ПРИМЕНЁННЫМИ Task 1/2 миграциями. Паттерн harness — `api/delete-account.integration.test.ts` (uuid-фикстуры, cleanup c нулевым остатком, `SET LOCAL ROLE authenticated`).

- [ ] **Step 1: Write the failing test**

```ts
// api/contract.integration.test.ts
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import { Pool } from 'pg';

const PG_URL = process.env.INTEGRATION_PG_URL;
const REQ_ID = `it_ct_req_${process.pid}_${Date.now()}`;
const NANNY_ID = `it_ct_nanny_${process.pid}_${Date.now()}`;
const PARENT_UID = crypto.randomUUID();
const NANNY_UID = crypto.randomUUID();

let pool: Pool;

vi.mock('./_cors.js', () => ({ setCors: vi.fn() }));
vi.mock('./_rate-limit.js', () => ({ rateLimit: vi.fn(() => ({ ok: true })) }));
vi.mock('./_logScrub.js', () => ({ logError: vi.fn(), logWarn: vi.fn() }));
vi.mock('./_auth.js', () => ({
  verifyBearerAdmin: vi.fn(async () => null),
  verifyBearerUser: vi.fn(async () => ({ id: PARENT_UID, email: 'p@x' })),
}));
vi.mock('./_db.js', () => ({ getDbPool: () => pool }));

import createHandler from './bookings';
import { createMockResponse } from './_testUtils';

describe.skipIf(!PG_URL)('PG integration: contract lockdown (План E)', () => {
  beforeAll(async () => {
    process.env.BOOKINGS_ENDPOINT_ENABLED = 'true';
    pool = new Pool({ connectionString: PG_URL, max: 3, statement_timeout: 8000 });
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
    await pool.query('DELETE FROM parents WHERE id = $1', [REQ_ID]).catch(() => {});
    await pool.query('DELETE FROM nannies WHERE id = $1', [NANNY_ID]).catch(() => {});
    await pool
      .query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [[PARENT_UID, NANNY_UID]])
      .catch(() => {});
    const { rows } = await pool.query(
      `SELECT (SELECT count(*)::int FROM bookings WHERE request_id = $1)
            + (SELECT count(*)::int FROM parents  WHERE id = $1)
            + (SELECT count(*)::int FROM nannies  WHERE id = $2) AS remaining`,
      [REQ_ID, NANNY_ID],
    );
    expect(rows[0].remaining).toBe(0);
    delete process.env.BOOKINGS_ENDPOINT_ENABLED;
    await pool.end();
  });

  const asAuthenticated = async (fn: (c: import('pg').PoolClient) => Promise<void>) => {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: PARENT_UID, role: 'authenticated' }),
      ]);
      await c.query('SET LOCAL ROLE authenticated');
      await fn(c);
      await c.query('ROLLBACK');
    } finally {
      await c.query('ROLLBACK').catch(() => {});
      c.release();
    }
  };

  it('authenticated cannot INSERT/UPDATE/DELETE bookings directly (42501, §11 RLS+grants)', async () => {
    await asAuthenticated(async (c) => {
      await expect(
        c.query(
          `INSERT INTO bookings (parent_id, nanny_id, request_id, date, status, idempotency_key)
           VALUES ($1,$2,$3,'2026-09-01','pending','it-ct-key')`,
          [PARENT_UID, NANNY_UID, REQ_ID],
        ),
      ).rejects.toMatchObject({ code: '42501' });
      await expect(c.query(`UPDATE bookings SET status = 'cancelled'`)).rejects.toMatchObject({
        code: '42501',
      });
      await expect(c.query(`DELETE FROM bookings`)).rejects.toMatchObject({ code: '42501' });
    });
  });

  it('authenticated cannot write booking_confirmations directly (42501)', async () => {
    await asAuthenticated(async (c) => {
      await expect(
        c.query(`INSERT INTO booking_confirmations (booking_id, type, status)
                 VALUES (gen_random_uuid(), 't_24h', 'pending')`),
      ).rejects.toMatchObject({ code: '42501' });
    });
  });

  it('participant SELECT still works post-lockdown; server create endpoint alive', async () => {
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
          date: '2026-09-01',
        },
      } as unknown as VercelRequest,
      create,
    );
    expect(create.statusCode).toBe(201);

    await asAuthenticated(async (c) => {
      const { rows } = await c.query(
        `SELECT id FROM bookings WHERE parent_id = $1 OR nanny_id = $1`,
        [PARENT_UID],
      );
      expect(rows.length).toBeGreaterThan(0);
    });
    await pool.query('DELETE FROM bookings WHERE request_id = $1', [REQ_ID]);
  });

  it('pair index enforces one active booking per pair at DB level (23505 bookings_active_pair_uq)', async () => {
    const insert = () =>
      pool.query(
        `INSERT INTO bookings (parent_id, nanny_id, request_id, date, status, idempotency_key)
         VALUES ($1,$2,$3,'2026-09-02','pending',$4)`,
        [PARENT_UID, NANNY_UID, REQ_ID, crypto.randomUUID()],
      );
    await insert();
    await expect(insert()).rejects.toMatchObject({
      code: '23505',
      constraint: 'bookings_active_pair_uq',
    });
    await pool.query('DELETE FROM bookings WHERE request_id = $1', [REQ_ID]);
  });

  it('canonical CHECK rejects active booking with missing side (23514)', async () => {
    await expect(
      pool.query(
        `INSERT INTO bookings (parent_id, nanny_id, request_id, date, status, idempotency_key)
         VALUES ($1, NULL, $2, '2026-09-03', 'pending', $3)`,
        [PARENT_UID, REQ_ID, crypto.randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
});
```

- [ ] **Step 2: Run — до применения Task 1/2 миграций тест ДОЛЖЕН падать**

Run: `INTEGRATION_PG_URL=… npx vitest run api/contract.integration.test.ts`
Expected: FAIL (нет index/CHECK, grants ещё ALL). Применить миграции (Task 1/2 rehearsal) → PASS.

- [ ] **Step 3: Full suite + commit**

Run: `npm run typecheck && npx vitest run`
Expected: PASS (contract-suite skip без env, интеграция локально — PASS).

```bash
git add api/contract.integration.test.ts
git commit -m "test(bli141): PG-интеграция contract lockdown — RLS/grants/pair-index/canonical CHECK"
```

---

### Task 4: cutover runbook

**Files:**
- Create: `docs/runbooks/2026-07-02-bli141-cutover.md`

**Interfaces:** Исполняемая последовательность прод-cutover (§10) для owner-гейта. Только документ — исполнение вне этого плана.

- [ ] **Step 1: Write the runbook**

```markdown
# BLI-141 cutover runbook (прод) — owner-гейт обязателен

Предусловия: PR #46+#48+План E смержены в main; все локальные репетиции PASS;
`.context/CODEX_DB_CHANGE_PROTOCOL.md` прочитан; путь — `supabase db push --linked`.

Порядок (§10 дизайна; шаг = отдельная сверка):

1. **Expand DDL** (`20260630193000`, `20260702210000`): nullable-колонки,
   account_deletions, deletion-барьер. Обратимо (`scripts/sql/rollback_*`).
2. **Deploy кода** (merge в main → Vercel). Проверить: endpoint 404
   (`BOOKINGS_ENDPOINT_ENABLED` не выставлен), delete-account работает
   (после DDL шага 1 таблица есть), cron-роуты отвечают 401 без секрета.
3. **Включение endpoint**: `BOOKINGS_ENDPOINT_ENABLED=true` в Vercel env +
   redeploy. Smoke: create 201/409, status 200/409/403.
4. **Read-only audit** прод-данных (счётчики из Task 1 audit-блока, вручную).
5. **Migrate (backfill)** `20260702220000`. Ambiguous → автоматический ABORT.
6. **Contract** `20260702230000`. После этого — forward-fix only: grants и
   политики к client-write НЕ возвращаются, клиент к direct-write НЕ откатывается.
7. **Smoke** (§11): role-correct прогоны из `api/contract.integration.test.ts`
   против прод-реплики/стейджа НЕ прод-данных; на проде — только curl-смоуки
   create/status/delete-account на тестовом synthetic-аккаунте.
8. Reconciler cron активен деплоем `vercel.json` (суточный; решение о */10 —
   Pro/YC — отдельный owner-пункт).

Rollback-границы: шаги 1–5 обратимы соответствующими `scripts/sql/rollback_*`;
шаг 6 — точка невозврата (forward-fix only).
Гейты: owner approval прод-DDL; legal/security §Гейты дизайна; BLI-121 закрыт
до включения endpoint (закрытый контур).
```

- [ ] **Step 2: Commit + push + Linear**

```bash
git add docs/runbooks/2026-07-02-bli141-cutover.md
git commit -m "docs(bli141): cutover runbook — последовательность прод-выката с гейтами и rollback-границами"
git push origin codex/bli-141-plan-c
```

Linear-комментарий в BLI-141: План E исполнен локально, runbook готов, owner-гейт прод-cutover открыт к решению.

---

## Postconditions (Плана E)

- Эпик BLI-141 полностью code-ready: expand (A) + endpoints (B) + lifecycle/readers (C) + lockdown-миграции и runbook (E). BLI-140 — амендирован в продуктовый backlog (PE1).
- Прод не тронут; единственный оставшийся шаг эпика — cutover по runbook на owner-гейте.
- После cutover: BLI-138/139 закрываются; BLI-134 (thread provisioning) разблокирован.

## Out of scope

- Исполнение runbook (прод-DDL/deploy/env) — owner-гейт.
- BLI-140 server-authoritative respond-flow — продуктовый backlog (нужен UX).
- Merge PR #46/#48 — owner-действие в связке с cutover (merge без DDL ломает прод delete-account — зафиксировано 2026-07-02).
- `amount` типизация (decimal) — хвост из §4, отдельная задача.
