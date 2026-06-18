# Blizko — CHANGELOG

---

## 2026-06-18 (Thu) — Supabase security hardening plan review

- Updated `docs/architecture/supabase-security-hardening-plan.md` with the
  current advisor findings and dependency checks:
  - `nannies_public` should stay behind a curated allowlist or move behind
    `/api/nannies`; `security_invoker=true` would break the public catalog.
  - Added the `chat_participants` self-join escalation as new durable risk
    `RISK-009`.
  - Kept the plan explicitly scoped to the post-approve hardening path before
    real users.
- Updated `.context/RISK_REGISTER.md` with `RISK-009` so the chat escalation
  remains durable across sessions.

## 2026-06-17 (Wed) — Claude/Codex maker-checker operating model

- Added `.context/AI_OPERATING_MODEL.md`: Claude is the lead executor, Codex is
  the independent evidence/risk controller.
- Added `.context/EVIDENCE_PACK_TEMPLATE.md` for Auth, RLS, database, personal
  data, analytics, payments, deploy, legal/security, and release-readiness
  gates.
- Added `.context/RISK_REGISTER.md` for durable launch/legal/security risks that
  must survive individual tasks.
- Updated Codex and agent coordination protocols to require severity-tagged
  findings and evidence packs before readiness claims.
- Updated `.context/ACTIVE_TASK.md` to point the next work at BLI-121 owner
  actions, BLI-123 legal drafts, and evidence-based risk-gate closure.

## 2026-06-16 (Tue) — Stateless notification egress guard (BLI-110 follow-up)

- Added `api/_notificationEgress.ts`: a no-persistence jurisdiction guard for
  external notification processors.
- Connected the guard to `/api/notify` before Resend/Telegram provider calls
  and to AI-support Telegram human handoff before handoff context is assembled.
  Synthetic-only test contour remains usable; when synthetic-only is off,
  `UNKNOWN` / `EU` are blocked and `RU` requires
  `BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN=true`.
- Added endpoint and helper tests proving blocked notification egress does not
  call Resend or Telegram.
- Documented the closed-by-default notification gate in `.env.example`, the
  Jurisdiction Router architecture note, and the processor register.

## 2026-06-16 (Tue) — Stateless AI egress guard (BLI-110 follow-up)

- Added `api/_aiEgress.ts`: a no-persistence jurisdiction guard for external AI
  calls that may contain personal data.
- Connected the guard to `/api/ai` and `/api/ai-support` before Gemini calls and
  before support context enrichment. Synthetic-only test contour remains usable;
  when synthetic-only is off, `UNKNOWN` / `EU` are blocked and `RU` is blocked
  until `BLIZKO_CROSS_BORDER_AI_GATE_OPEN=true` after the separate cross-border
  gate. Current AI endpoints are sensitive-capable, so they also require
  `BLIZKO_SENSITIVE_AI_FLOW_GATE_OPEN=true` before any real RU personal data can
  reach external AI.
- Added endpoint and helper tests proving blocked AI egress does not call Gemini.
- Documented the closed-by-default cross-border AI gate in `.env.example` and
  updated the Jurisdiction Router architecture note and processor register. No
  jurisdiction pin/audit table was added; persistence remains gated on the RU
  data-plane decision.

## 2026-06-16 (Tue) — Jurisdiction Router MVP foundation (BLI-110)

- Added `api/_jurisdiction.ts`: a pure server-side Jurisdiction Router policy
  resolver with the MVP matrix for `RU`, `UNKNOWN`, and `EU`.
- Locked fail-closed behavior: missing verified signals, unsupported countries,
  or conflicting RU applicability resolve to `UNKNOWN`; advisory IP/locale/timezone
  are minimized for audit and cannot select a weaker policy.
- Added `api/_jurisdiction.test.ts` covering RU, UNKNOWN, EU placeholder,
  conflicts, advisory-only behavior, and supported +7 phone-country inference.
- Added `docs/architecture/jurisdiction-router-mvp.md` to define the foundation
  scope and the follow-up integration steps. This change does not open real-user
  admission and does not switch storage, AI, payments, or Supabase data planes.

## 2026-06-16 (Tue) — Synthetic-only closed contour (BLI-105/106 rebuild)

- Reverted the prior "disable PD features" diff: forms, photo, documents, video,
  AI, matching, chat, support, bookings restored to full functionality for
  testing on synthetic data. Removed the egress-guard / sanitize / upload-disable
  infra.
- Kept two correctness guards: `documentAi` returns `pending` (never a false
  `verified`) on AI failure/partial; no unconditional `ai_checked` trust badge
  (also removed from dev preview fixtures).
- Added a simple global synthetic-only mode (`BLIZKO_SYNTHETIC_ONLY` /
  `VITE_SYNTHETIC_ONLY`, default ON / fail-closed): closed dev/staging contour on
  synthetic data; real users, real PD, and production payments not admitted.
- Closed admission: phone OTP (`api/auth/phone.ts` 403), email magic-link
  (`AuthModal`), authenticated server external-egress APIs reject non-allow-listed
  identities incl. restored sessions/existing JWTs — AI (`api/ai.ts`,
  `api/ai-support.ts`) and payments/YooKassa (`api/payments/create.ts`,
  `finalize.ts`) via `identityAdmissionClosed`; the client signs out non-admitted
  restored sessions (`useAuthSession`, `AuthModal`).
- No visual TEST UI: removed the in-product banner and the admin TEST badge.
  Synthetic-only is internal env flags + server guards, not a visible test stand.
- Payments: admission is enforced (non-allow-listed identities rejected before
  YooKassa egress). Real payments are not used in this contour; the code does not
  verify test-vs-production keys, so enabling real payments is a separate pre-open
  gate — not claimed as code-enforced "sandbox-only".
- `docs/architecture/synthetic-only-mode.md` holds a pre-real-data checklist
  (disable open email signups, revoke existing sessions, production payment gate +
  webhook guard, outbound-notifications guard). These are pre-open steps, not dev
  blockers, and do not block BLI-110 / RU-core work.
- Verification (branch `feat/bli-106-105-pd-stop-risk`, worktree, 2026-06-16):
  `npx tsc --noEmit` clean; `npx vitest run` 137 passed / 33 files; `npm run
  build` ok; `npx eslint` 0 errors on changed src; `prettier --check` clean;
  `git diff --check` clean. Independent Codex review run via `npm run
  review:codex`.

## 2026-06-13 (Sat) — Single-entry Claude / Codex coordination

- Added `.context/AGENT_COORDINATION.md` so Anton can give a task to either
  agent once instead of relaying prompts and findings manually.
- Set Claude Code as the default lead and Codex as the default independent
  reviewer; direct assignments to Codex remain supported.
- Added symmetric read-only review commands: `npm run review:codex` and
  `npm run review:claude`.
- Required each agent to challenge the other's conclusions, resolve findings
  against repository evidence, and repeat review after material corrections.
- Hardened reviewer isolation: Codex ignores user config/MCPs; Claude requires
  version `2.1.170+`, safe mode, no persistence, and only read/search tools.
- Clarified that restricted challenge-review supplements rather than replaces
  the normal legal, security, database, and release specialist gates.
- Assigned end-to-end ownership to the receiving agent and limited mandatory
  dual-agent review to legal, security, production, release, and material
  architecture gates.
- Documented a local read-only Claude Code invocation for Codex and required a
  single consolidated owner-facing result.
- Connected the coordination contract to both Claude and Codex startup rules.

---

## 2026-06-13 (Sat) — Minimized nanny warm-pool workflow

- Added `docs/nanny-warm-pool-ops.md` with the current nanny proposition,
  scripts for unanswered and interrupted HH conversations, permitted fields,
  daily workflow, status model, and RU-core migration path.
- Added a local AES-256-GCM encrypted lead registry whose key is held in macOS
  Keychain; real lead data and plaintext exports are ignored by Git.
- Kept full resumes and direct contacts in the source platform and prohibited
  documents, health data, AI scoring, bulk scraping, and Supabase EU import.
- Marked legacy recruiting scripts as superseded for real candidates.
- Made the legacy HH-to-Gemini-to-Supabase importer fail closed unless the
  input is explicitly declared synthetic.
- Incorporated Claude's independent review: added hard erasure, 90-day purge,
  explicit-yes follow-up selection, pilot-status consent enforcement, source
  reference checks, and tests for each control.
- Gated the second privileged synthetic seeder against production and renamed
  the HH fixture to make its synthetic nature explicit, removing its
  realistic-looking phone number.
- Updated the data and processor registers. No real candidate data was read,
  imported, messaged, or sent to an external service.

---

## 2026-06-13 (Sat) — Jurisdiction Router decision incorporated

- Added a server-side, versioned `JurisdictionPolicy` design to the RU
  data-contour memo.
- Set `UNKNOWN` to fail closed with RU-grade strictness and made the EU branch
  a non-collecting placeholder with no personal-data plane.
- Required verified signals, server pinning, strictest-wins conflict handling,
  and supervised country-change migration without cross-region dual-write.
- Added jurisdiction-routing evidence and external geo admission rules to the
  data and processor registers.
- Clarified that the cross-border AI gate cannot enable personal-data AI for
  `UNKNOWN` or the MVP EU placeholder.
- No code, migration, provider, production, filing, or contract action was
  authorized.

---

## 2026-06-13 (Sat) — Corrected PD/AI MVP decision candidate

- Added `docs/blizko-pd-ai-mvp-corrected-decision.md` for independent Claude
  review.
- Corrected the original proposal's treatment of pseudonymized profiles,
  child/personal data in external AI, denylist-based filtering, trust evidence,
  and the nonexistent `nanny_profiles` table.
- Set external AI to deny-by-default for real-user personal data until the
  cross-border legal, contractual, retention, and security gates pass.
- Documented current code risk: file-to-data-URL document AI and false
  `verified` fallback behavior.
- Incorporated Claude's independent technical review: historical-egress
  remediation, support-AI gateway enforcement, gateway abuse controls,
  recipient-country assessment, defensible public trust wording, and the
  `nannies_public` denylist exposure.
- Kept `security_invoker` as a role-tested design choice rather than a blind
  flag change because the current public-catalog access contract must be
  preserved securely.
- This is a review candidate only; it authorizes no code, migration, filing,
  production, contract, or deletion action.

---

## 2026-06-13 (Sat) — Mandatory agent-owned legal/security gate

- Added `.context/CODEX_LEGAL_SECURITY_PROTOCOL.md`.
- Made Claude/Codex responsible for evidence collection, legal/security review,
  and compliance-register maintenance without asking Anton to fill forms.
- Added initial agent-maintained data and processor registers under
  `docs/compliance/`.
- Connected the gate to operating, review, release, agent routing,
  `AGENTS.md`, and `CLAUDE.md`.
- Added a heartbeat drift check for undocumented data, processor, AI, logging,
  retention, and access changes.
- Unknown mandatory evidence now blocks release or forces a conservative
  synthetic-data/disabled-flow fallback.

---

## 2026-06-13 (Sat) — Codex legal and security skills

- Added user-level Codex skills `blizko-lawyer` and `blizko-security`.
- Added focused reference checklists for current-law verification and
  Blizko-specific application/security review.
- Connected the skills to the RU data-contour memo and mandatory database,
  review, and release protocols.
- The legal skill requires current primary-source verification and separates
  verified rules, application, assumptions, and counsel escalation.
- The security skill enforces role-correct testing for RLS/Auth, server-only
  service credentials, fail-closed test auth, private document storage, and
  PII-safe logs and external AI flows.

---

## 2026-06-13 (Sat) — RU personal-data contour decision framework

- Added `docs/ru-data-contour-decision-memo.md`.
- Documented the current Supabase EU/Vercel/Gemini data flow, including document
  image and personalized support prompts.
- Defined four options: synthetic-only, minimal RU personal-data plane, full RU
  application plane, and protected/attested contour.
- Added legal, information-security, provider, product, and Supabase PoC
  questions plus pilot/scale decision gates.
- No infrastructure decision was made. Self-hosted Supabase and UZ-1 remain
  conditional on confirmation of real production PII, required protection
  level, and allowed external AI processing.

---

## 2026-06-12 (Fri) — Durable active-task continuity

- Added `.context/ACTIVE_TASK.md` as the single compact checkpoint for live
  execution state, blockers, next steps, approval gates, and safety boundaries.
- Claude and Codex must read it at session start and after compaction, verify
  live git/PR/CI/deployment state, and continue the first safe pending step.
- The checkpoint must be updated before token/session limits, handoff, or
  stopping; secrets are prohibited.
- Seeded the checkpoint with the current BLI-103/BLI-55 E2E work so it can
  resume without relying on chat history.

---

## 2026-06-11 (Thu) — `20260610000000` applied to production (BLI-98)

Shadow-scoring columns migration applied and independently verified. Production
schema/data not otherwise changed.

### Apply

- Migration: `20260610000000_add_shadow_scoring_columns`.
- Tool: standard `supabase db push --db-url …` (no manual DDL, no MCP
  `execute_sql` DDL, no `migration repair`).
- Connection: **Supavisor Session Pooler, port 5432**. The direct host
  `db.<ref>:5432` is IPv6-only and its TLS handshake was network-throttled (raw
  TCP succeeded, TLS timed out); the session pooler TLS path worked. (URL,
  password, and project ref are not recorded here.)
- Dry-run first showed only `20260610000000`; apply finished cleanly.

### Verification (read-only)

- Schema: `heuristic_score` double precision (null), `factors` jsonb (null),
  `weight_snapshot` jsonb (null), `explore_flag` boolean NOT NULL DEFAULT false —
  exactly per spec; `parent_id/nanny_id` (UUID → `auth.users`) unchanged.
- Ledger: remote now 7 versions incl. `20260610000000`; `local == remote`;
  re-run `db push --dry-run` → "Remote database is up to date".
- Write/read smoke (marker `smoke-dbcol-20260611`): INSERT row with all four
  columns → read-back persisted → DELETE by exact id + marker guard → verified
  0/0 remaining.

### Effect & scope

- `shadowScoring` upsert now persists the four columns without a schema error.
- Not touched: BLI-100 (`matching_outcome_type` `'interested'`), enum, cron.
  `DROP COLUMN` not performed (destructive — separate approval).

---

## 2026-06-11 (Thu) — Non-urgent migration drift prohibited

- Routine migrations must wait for the supported Supabase migration path when
  CLI/TLS access is unavailable.
- Manual DDL followed by later ledger repair may not be offered as an equal
  alternative because it recreates schema/history drift.
- Emergency fallback is limited to an active production outage, requires
  explicit approval, and must reconcile the migration ledger in the same
  operational window whenever possible.
- For non-outage work, the agent chooses the clean path automatically and asks
  the user only for final production approval.

---

## 2026-06-11 (Thu) — Mandatory database change protocol

- Added `.context/CODEX_DB_CHANGE_PROTOCOL.md` as the shared contract for
  Supabase/PostgreSQL/Auth/Storage/RLS/RPC and database-backed work.
- `CLAUDE.md` now requires Claude Code to read it before diagnosis,
  implementation, review, deployment, or production approval and to state the
  selected migration path.
- Operating, review, release, and `AGENTS.md` rules now enforce contract
  comparison across application code, committed migrations, clean reset, and
  production before a database change can be called ready.
- Standard path is supported Supabase migration tooling. Manual DDL plus
  migration-history repair is a documented fallback only after a demonstrated
  CLI failure and explicit production approval.

---

## 2026-06-10 (Wed) — Vercel: деплой падал из-за 8 фантомных test-функций

### Истинный корень (ground truth из `vercel build`)

Локальный `vercel build` кладёт в `.vercel/output/functions/` **19** функций, не
12. Vercel превращает в Serverless Function **каждый** не-`_` файл под `api/` —
**включая `*.test.ts`**. 8 тест-файлов (`api/data.test`, `api/cron/index.test`,
`api/auth/phone.test`, `api/auth/phone.handler.test`, `api/payments/{create,
finalize,webhook}.test`, и др.) деплоились как функции → 11 реальных + 8 фантомных
= 19 > Hobby-лимит 12 → `exceeded_serverless_functions_per_deployment` на
`patchBuild`. Это и есть многодневная «Versal опять», а не флап на 12.
Побочно — латентная экспозиция: `/api/data.test`, `/api/payments/webhook.test` —
живые задеплоенные эндпоинты.

### Fix (config + ре-вайр, логика не тронута) — 19 → 11

- `.vercelignore`: `*.test.ts`, `*.test.tsx`, `*.handler.test.ts` — Vercel больше
  не видит тест-файлы → −8 фантомных функций. (CI vitest их по-прежнему гоняет —
  `.vercelignore` влияет только на деплой.)
- Консолидация двух public-GET read-only эндпоинтов (минимальный prod-риск из
  сравнения пар; `phone+delete-account` и `ai+ai-support` отклонены — auth/security
  границы): `api/nannies.ts` → `api/_nannies.ts` (helper), `api/geocode.ts` —
  guard `?resource=nannies` делегирует в `_nannies`; `vercel.json` rewrite
  `/api/nannies → /api/geocode?resource=nannies` (Vercel доклеивает `?id=…`).
  Клиенты не меняются. `/api/geocode` нативный путь нетронут. −1 реальная функция.
- `api/geocode.test.ts` — routing-тесты dispatch (теперь сам тоже не деплоится).

### Verified

- `vercel build` локально → `.vercel/output/functions/` = **11** (.func): 11
  реальных handler'ов, ноль `.test`. Запас 1 под лимитом 12.
- `tsc --noEmit` 0 · `eslint` 0 · `format:check` pass · `vitest` 27 файлов/94.
- Деплой — под deploy-gate (approve).

> Не зависит от PR #14 (BLI-98). payments сознательно не трогали.

---

## 2026-06-10 (Wed) — Shadow scoring columns missing in prod (BLI-98)

### Симптом

`src/core/ai/shadowScoring.ts` (`_logShadowScoresAsync`) делает fire-and-forget
upsert в `matching_outcomes` с колонками `heuristic_score, factors,
weight_snapshot, explore_flag`. В проде их нет (baseline BLI-94 не содержит) →
PostgREST schema-cache отказ, проглатывался `catch {}`. Найдено при prod smoke
BLI-55.

### Root cause

Колонки не были включены в authoritative baseline
(`00000000000000_remote_schema.sql`). Outcome-строки пишет другой путь
(`matchingFeedback.ts`, BLI-59), но **без `factors`**, а cron
`update-matching-weights` фильтрует `WHERE o.factors IS NOT NULL` → обучающий
сигнал (factor breakdowns) в прод не попадает; self-evolving loop (Этап 0) мёртв.
`parent_id/nanny_id` (UUID → `auth.users`) — НЕ баг, схема намеренная.

### Fix (прод НЕ менялся — отдельный deploy-gate после PR)

- `20260610000000_add_shadow_scoring_columns.sql`:
  `ADD COLUMN IF NOT EXISTS heuristic_score double precision, factors jsonb,
  weight_snapshot jsonb, explore_flag boolean NOT NULL DEFAULT false` + COMMENT.
  Enum `matching_outcome_type` не трогает.
- `shadowScoring.ts`: silent `catch {}` → явный `console.error` (ошибка upsert +
  outer catch), остаётся non-throwing.
- `shadowScoring.test.ts` (6 кейсов): payload-колонки, onConflict, explore_flag
  для wildcard, логирование ошибки, no-op без parentId, ε-greedy.
- Зелёное: vitest 27/96, `tsc --noEmit` 0, eslint 0, format:check pass.

### Связано

- BLI-100 (отдельно): enum `matching_outcome_type` без `'interested'`; cron
  `_update-matching-weights` ссылается на него. Фикс = убрать `'interested'` из
  крона (interest = `outcome=NULL` + `feedback_text` interest_signal), enum НЕ
  расширять.

---

## 2026-06-09 (Tue) — URGENT: authenticated chat сломан (BLI-97 × chat policy)

### Симптом

`authenticated` (любой клиент по JWT) не мог читать/писать `chat_messages` в
проде с ~06-04: `ERROR 42501: permission denied for table support_agents`.

### Root cause

BLI-97 (`20260604140000`) сделал `REVOKE ALL ON public.support_agents FROM
anon, authenticated`. Но политики `chat_messages` SELECT/INSERT
(`20260602153000`) ссылаются на `public.support_agents` инлайн через
`EXISTS (... FROM public.support_agents ...)`. Postgres проверяет привилегии на
таблицы из RLS-политики **на этапе планирования**, до оценки строк → отказ
независимо от числа строк. Smoke `check_chat_messages_rls.sh` это и ловил
(краснота = реальный prod-баг, не дефект теста).

### Fix

- `20260609000000_fix_chat_messages_support_agent_definer.sql` (вся миграция в
  одной транзакции — `BEGIN` перед `CREATE FUNCTION`):
  `public.can_current_user_access_support_thread(p_thread_id uuid)` —
  `SECURITY DEFINER`, `LANGUAGE sql`, `STABLE`, `SET search_path = ''`;
  `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated`. Обе
  политики `chat_messages` зовут функцию вместо инлайн-`support_agents`.
- Функция обходит RLS для **двух** таблиц: `support_agents` (членство, revoked
  BLI-97) и `chat_threads` (агент не участник треда → его RLS иначе скрыл бы
  support-тред, и проверка членства не дала бы доступ). Аргумент — `thread_id`
  строки (не user_id): узкий boolean-API, нельзя пробить произвольного юзера.
- BLI-97 `REVOKE` **сохранён** — клиент по-прежнему не читает `support_agents`
  напрямую; доступ только через definer-функцию.
- Smoke расширен: функция existует, `SECURITY DEFINER`, ровно `(p_thread_id uuid)`,
  `search_path=''`, PUBLIC без EXECUTE, authenticated с EXECUTE; `authenticated`
  direct `SELECT support_agents` остаётся `permission denied`.
- Добавлена positive-matrix `scripts/sql/chat_messages_rls_matrix.sql`
  (`check:chat-rls-matrix`): participant read/write своего треда, outsider denied,
  support-agent только в support-треде, anon denied, support_agents direct denied.

### Verified

- `check:chat-rls-matrix` против прода (`BEGIN … ROLLBACK`, прод не изменён):
  все 7 сценариев зелёные (`matrix-ok`).
- Apply в прод — под deploy-gate (approve): `execute_sql` DDL, затем
  `supabase migration repair 20260609000000 --status applied --linked`,
  `migration list`, `db push --dry-run`; затем production RLS smoke.

## 2026-06-08 (Mon) — fix(vercel): разморозка деплоя (Hobby ≤12 функций)

### Проблема

Все деплои Error ~5 дней (prod + preview): build OK → `Deploying outputs` →
Error. Прод заморожен на 5-дневном Ready-билде, фиксы не доезжали.

### Root cause

- `api/testUtils.ts` — тест-хелпер (импортит `vitest`, без default-handler,
  используется только `*.test.ts`) лежал в `api/` → Vercel билдил его как
  serverless-функцию → падёж на бандлинге.
- Всего **14** функций при Hobby-лимите **12** (рост: BLI-36 delete-account и пр.).

### Fix (логика не тронута, только ре-вайр)

- `api/testUtils.ts` → `api/_testUtils.ts` (`_`-префикс → Vercel не строит как
  функцию); обновлены 5 импортов в `*.test.ts`.
- 2 cron → `_`-хелперы (`_ghosted-outcomes.ts`, `_update-matching-weights.ts`) +
  один диспатчер `api/cron/index.ts` (`?job=...`); `vercel.json` crons обновлены.
- Итог: **12** deployable-функций (ровно в лимит).

### Verified

- ✅ `tsc --noEmit` · `vitest` 85 passed · `vite build`.
- Деплой — под deploy-gate (твой approve).

> Запас нулевой (12/12). Следующая новая функция снова упрётся → тогда слить
> payments в роутер (→10) или Pro.

## 2026-06-08 (Mon) — BLI-94: authoritative prod baseline (история ≡ прод)

### Почему понадобилось

Предыдущий «Done» (06-05) был **ложно-зелёным**. `db reset` сделали зелёным,
переключив репо `parents.id`/`nannies.id`/`chat_threads.match_id` на **UUID** —
т.е. подогнали схему под валидный FK, **не под прод**. Замер прода (Supabase MCP +
`db dump`) показал обратное: в проде эти id = **TEXT**, FK на `chat_threads` нет,
а колонки `parents`/`nannies` вообще другие (`user_id uuid DEFAULT auth.uid()`,
`payload jsonb`). Расхождение repo↔prod не устранили, а усилили.

**Корень:** прод исторически собирали руками через Supabase Dashboard, а `.sql` в
репо были инструкцией («Run in SQL Editor»), не миграцией. `prod_baseline.sql`
пометили applied через `migration repair`, не выполняя → история = фикшен поверх
hand-built прод. Поэтому `db reset` с нуля падал, а baseline врал о схеме.

### Что сделано (прод = авторитет, read-only)

- `supabase db dump --schema public` из прода → новый
  `supabase/migrations/00000000000000_remote_schema.sql` (18 таблиц, 44 политики,
  view `nannies_public`, 2 функции, 11 FK, гранты — реальная схема, id = TEXT).
- Keepers поверх baseline (нет в public-дампе):
  - `00000000000001_realtime_publication.sql` — членство в `supabase_realtime`
    (chat_messages, support_tickets, support_messages), идемпотентно.
  - `20260527000000_create_nanny_storage_buckets.sql` — storage-схема.
  - `20260604130000` (BLI-96 audit revoke) + `20260604140000` (BLI-97 revoke) —
    `REVOKE` дефолтных грантов; `db dump` их не эмитит, без них shadow
    переполучал anon/authenticated гранты на 6 служебных таблиц.
- 13 старых public-миграций (вкл. UUID-фикшен `migration_v1` и poison-фикс 06-05)
  → `supabase/migrations_legacy/superseded_by_baseline_20260608/`.
- В baseline выровнен порядок ролей 2 политик (`anon, authenticated`) под прод,
  чтобы убрать косметический diff polroles.

### Acceptance (закрыто)

- `supabase db diff --linked --schema public` → **No schema changes found** —
  shadow из миграций ≡ прод. Все миграции применяются чисто (только идемпотентные
  NOTICE).
- `tsc --noEmit` ✅ · `vitest run` 85 passed ✅ · `vite build` ✅.
- Прод **не тронут** — только read-only `db dump`/`db diff`.

### Ре-верификация 06-09 (rebase на main + chat-fix в истории)

- Ветка ребейзнута на `main`; `20260609000000_fix_chat_messages_support_agent_definer`
  (chat-RLS, уже в проде через PR #12) включён в authoritative history — лежит в
  `migrations/` **после** baseline, не в legacy.
- `supabase start` / `db reset` (локально, Docker): **все 6 миграций применяются с
  нуля чисто** — `00000000000000`, `00000000000001`, `20260527000000`,
  `20260604130000`, `20260604140000`, `20260609000000` (NOTICE идемпотентны:
  keepers поверх baseline). Падёж только на healthcheck `storage`-контейнера —
  инфра, не миграция.
- Schema ≡ prod подтверждено через Supabase MCP (CLI `--linked` был отрезан
  TLS-throttle RU-сети): `parents.id`/`nannies.id` = `text` (baseline-авторитет, не
  ложный UUID); definer-функция `can_current_user_access_support_thread(p_thread_id
  uuid)` есть, `SECURITY DEFINER`; обе политики `chat_messages` ссылаются на неё.
- Sverka `schema_migrations` (MCP): remote числит 10 старых fictional-версий +
  `20260609000000`; local — 6 baseline-версий. Совпадает только `20260609000000`
  (уже applied). Drift = **ровно** reverted/applied списки из runbook → ожидаем до
  репейра.

> **Требуется после merge** (deploy-gate, только метаданные): прод
> `schema_migrations` ещё числит старые versions, не совпадающие с новыми
> файлами → `db push` к проду попытается переприменить baseline. Runbook:
> `supabase/PROD_HISTORY_REPAIR.md` (`supabase migration repair`, схему не меняет).
> `20260609000000` уже applied (PR #12) — репейра не требует.

> Замечание (вне scope, отдельные issue): `nannies_public` создан с
> `security_invoker=false` (SECURITY DEFINER, ERROR-адвайзер) — захвачен в baseline
> как есть; флип на invoker — отдельный риск-план.

---

## 2026-06-05 (Fri)

### fix(db): TYPE mismatch + атомарное удаление аккаунта

- `20260101000000`: `chat_threads.match_id TEXT→UUID` (FK был невалиден, блокировал `db reset`)
- `delete-account.ts`: SQL в транзакции BEGIN/ROLLBACK/COMMIT; auth.delete до COMMIT — откат при ошибке

### BLI-94: Done ✅

Schema reset верифицирован через `docker run public.ecr.aws/supabase/postgres:17.6.1.063` + ручное применение всех 16 миграций. Все прошли без критических ошибок.

```
chat_threads.match_id = uuid ✅  (было TEXT — FK невалиден)
parents.id             = uuid ✅
```

Non-fatal при reset: `auth.jwt()` (нет Supabase auth extension в plain Postgres), duplicate `supabase_realtime` ADD TABLE, `storage.buckets` (нет Storage schema).

---

## 2026-06-04 (Thu) — BLI-97: revoke client grants на service-only таблицах

### Security

- Все `public.*` имели дефолтные anon/authenticated гранты (вкл. INSERT/UPDATE/
  DELETE) и держались только на RLS. Пять служебных таблиц, которые клиент
  **никогда** не читает (verified: 0 supabase-обращений в `src/`; realtime только
  на support/chat), захардненены: `REVOKE ALL` с anon/authenticated.
  - `phone_otps` (OTP-коды), `admin_actions`, `support_agents`,
    `analytics_events`, `referrals`.
- API ходит service-ключом (bypass) → нулевое влияние на работу; defense in depth
  поверх RLS. Совпадает с acceptance BLI-20.
- `supabase/migrations/20260604140000_revoke_service_only_table_grants.sql`.
  **Применено в прод** (MCP), verified: гранты сняты у всех 5; anon →
  `permission denied for table phone_otps`.

### Follow-up (вне scope, заведены отдельно)

- `nannies_public` SECURITY DEFINER (ERROR) — флип на `security_invoker` с
  проверкой RLS на `nannies`.
- `function_search_path_mutable`, `auth_leaked_password_protection`.

---

## 2026-06-04 (Thu) — BLI-93/96/95: cleanup + восстановление аудита

Follow-up из BLI-64. (BLI-94 — baseline reconciliation — **остаётся открытым**:
сюда по ошибке попал security_audit_log фикс, он вынесен в BLI-96.)

### BLI-93 — Dev Supabase URL

- `.env.local` (local-only): `VITE_SUPABASE_URL` и `SUPABASE_URL` указывали на
  `blizko-seo-worker.blizko-ai.workers.dev` (SEO-воркер, отдаёт HTML-404 на
  `/rest/v1/*`) → локальная разработка била supabase через сломанный прокси.
  Исправлено на канонический хост `geomyyfjvemdphaeimkz.supabase.co`.
- `.env.example` — добавлен документированный блок client-side `VITE_SUPABASE_URL`
  / `VITE_SUPABASE_ANON_KEY` с предупреждением «канон-хост, не прокси».

### BLI-96 — security_audit_log отсутствовал в проде

- Проверка прод-БД (MCP): таблицы `security_audit_log` **не существовало**
  (`to_regclass = null`), хотя `api/_audit.ts` пишет в неё (fire-and-forget,
  silent `.catch()`) и `api/data.ts` читает как источник product-аналитики.
  Итог: **все аудит-события в проде молча терялись**, часть аналитики битая.
  Определена только в `migrations_legacy/`, в прод не накатывалась.
- `supabase/migrations/20260604130000_create_security_audit_log.sql` — создаёт
  таблицу (схема из legacy), RLS service-role only, индексы; `REVOKE ALL` с
  anon/authenticated (sensitive: IP/phone/user_id, API ходит service-ключом).
  **Применено в прод** (MCP), verified: таблица есть, RLS on, anon доступа нет,
  advisors без новых ERROR.

### BLI-95 — CI format-gate

- `.prettierignore` — корневые `*.md` (рукописные доки) выведены из-под prettier;
  раньше `npm run format` тянул 100+ доков (и мог снести `BOOTSTRAP.md` из diff'а).
- Одноразово отформатирован накопленный код-долг (17 файлов: src/api/scripts/
  config, `index.html`, `vercel.json` и пр.).
- `.github/workflows/ci.yml` — добавлен шаг `Format check` (`npm run format:check`)
  после Lint → формат-долг больше не копится молча.

### Verified

- ✅ `npm run format:check` / `lint` / `typecheck` / `build`

---

## 2026-06-04 (Thu) — BLI-64: починка production matching-chain

Симптомы в проде: `/api/ai` aborted, `matching_weights`/`matching_insights` 404,
`matching_outcomes` 400. Код фронта корректен и деградирует мягко — отказы были
на уровне schema/permissions/таймаут-бюджета, не TS-логики.

### Root cause

- **`/api/ai` aborted** — `api/ai.ts`: 2 модели × (1+`MAX_RETRIES`=3) попытки ×
  `REQUEST_TIMEOUT_MS=20s` ≈ до 120s, без `config.maxDuration`. После BLI-85 сайт
  за Cloudflare (~100s proxy timeout) → длинные вызовы Gemini обрывались апстримом
  до ответа; клиент (`aiGateway.ts`, без AbortController) видел aborted.
- **weights/insights 404** — проверка прод-БД через Supabase MCP: таблиц
  `matching_weights` / `matching_insights` **не существует вообще**
  (`to_regclass = null`). `prod_baseline` числится applied, но эти таблицы там
  не накатились — локальный baseline.sql рассинхронен с реально применённым.
  PostgREST на missing relation → 404. Лоадеры (`matchingWeights.ts`,
  `insightsLoader.ts`) читают client-side под anon-ключом → молчаливый фолбэк на
  дефолты, learning-слой мёртв. (Первоначальная гипотеза «RLS service_role only»
  оказалась неполной — таблиц нет.)
- **`matching_outcomes` 400** — upsert `onConflict:'parent_id,nanny_id'` без
  unique-constraint. По факту в проде constraint
  `matching_outcomes_parent_nanny_key UNIQUE(parent_id,nanny_id)` **уже применён**
  (`20260529091537`) → 400 **уже закрыт**, отдельных действий не требует.

### Changed

- `api/ai.ts` — добавлен `export const config = { maxDuration: 60 }`;
  `REQUEST_TIMEOUT_MS` 20s→12s; глобальный дедлайн `TOTAL_DEADLINE_MS=45s` в
  retry-цикле — новые upstream-вызовы не стартуют, если выйдут за бюджет.
  Worst case ~45s < 60s maxDuration < ~100s CF. Нормальный путь (flash <10s) не задет.

### Added

- `supabase/migrations/20260604120000_matching_weights_insights_client_read.sql` —
  **создаёт** таблицы `matching_weights` (+seed 17 весов = текущие
  `DEFAULT_WEIGHTS`) и `matching_insights`, включает RLS, оставляет записи
  service-role only, даёт read-only (`*_client_read` SELECT + GRANT) для
  anon/authenticated. Таблицы non-PII. Идемпотентно (`IF NOT EXISTS` + guard'ы).

### Verified

- ✅ `npm run typecheck`
- ✅ `npx vitest run` (AI + matching: 18 passed)
- ✅ `npm run build`

### Applied to prod (Supabase MCP, project geomyyfjvemdphaeimkz)

- ✅ Миграция `matching_weights_insights_client_read` применена (`apply_migration`).
- ✅ Проверено: обе таблицы существуют, `matching_weights` = 17 строк, политики
  `*_client_read` + `*_service_only` на месте; чтение под ролью `anon` возвращает
  17 строк → **404 закрыт**.
- ✅ `400` уже был закрыт ранее (constraint `matching_outcomes_parent_nanny_key`).
- ✅ `get_advisors security` — новых ERROR нет; weights/insights попадают в
  `pg_graphql_anon_table_exposed` (WARN) **намеренно** (non-PII, нужен client read).
- `/api/ai` abort-фикс — во фронт-деплое (merge в `main`), едет через Vercel.

### Follow-up (отдельные мелкие задачи, не BLI-64)

- `prod_baseline.sql` рассинхронен с реальным продом (декларирует таблицы, которых
  нет) — выверить baseline.
- CI не гоняет `format:check` → формат-долг копится молча (см. 5 неформатированных
  файлов из BLI-85/88). Добавить шаг в CI.

---

## 2026-06-03 (Wed) — BLI-88: optional parent compatibility layer

### Changed

- ✅ Added optional parent compatibility signals for curator matching: home rhythm, adaptation style, boundary style, parent support needs, and decision style.
- ✅ Extended the v0 compatibility explanation model with family-profile reasons for rhythm, first shift, boundaries, parent support, and decision format.
- ✅ Added an admin parent-card panel for the optional family compatibility profile and curator follow-up prompts.
- ✅ Hardened the parent form state so skipped optional compatibility answers are not auto-filled with defaults.
- ✅ Added regression and e2e coverage for optional profile behavior and admin preview visibility.

### Verified

- ✅ `npm run typecheck`
- ✅ `npm run lint`
- ✅ `npm test -- --run`
- ✅ `npm run build`
- ✅ `npm run test:e2e` (`8 passed / 4 skipped`)

---

## 2026-06-03 (Wed) — BLI-85: доступность из РФ без VPN (Вариант A)

### Changed

- `vercel.json` — добавлены явные `Cache-Control` заголовки:
  - `/assets/*` → `public, max-age=31536000, immutable` (Vite content-hash → long cache безопасен; CF кеширует на российских edge-узлах)
  - `*.png|ico|svg|woff2` → `public, max-age=604800, stale-while-revalidate=86400`
  - `/` → `public, max-age=0, must-revalidate`
- `index.html` — Google Fonts загружается асинхронно (`preload` → `onload`); страница рендерится с системными шрифтами если Google Fonts недоступен на сети
- `public/sw.js` — убран `/` из `PRE_CACHE`; SW не кеширует HTML-документ и не блокирует обновление при новом деплое

### Added

- `infra/nginx-rf-proxy.conf` — готовый Nginx-конфиг для российского VPS (Timeweb/Selectel); использовать как Вариант B если CF edge кеша недостаточно
- `docs/adr/001-rf-availability.md` — зафиксировано архитектурное решение и критерии перехода к VPS

---

## 2026-05-26 (Tue) — DEV DEBT: vite proxy мисроутит весь /api в AI worker

### Tech debt (dev-experience, prod НЕ затронут)

- `vite.config.ts` server.proxy: `'/api'` → `https://ai-proxy.blizko-ai.workers.dev`
  ловит **все** `/api/*` в dev → не-AI эндпоинты (data/notify/payments/auth/nannies)
  мисроутятся в AI-воркер.
  - Симптомы в dev: `POST /api/data?resource=analytics` → 400 `{"error":"Empty prompt"}`;
    `GET /api/nannies?id=...` → 405.
  - **Prod не затронут:** vite-прокси только в dev; в проде `/api/*` идёт в реальные
    serverless-функции (`api/data.ts`, `api/nannies.ts` существуют и работают).
- **Решение позже (отдельно):** сузить прокси — только AI-роут на ai-proxy, остальной
  `/api/*` на `vercel dev` или задеплоенный preview. Не делать сейчас.

---

## 2026-05-24 (Sun) — ProfileTab: удаление мёртвого кода и редизайн

### Deleted

- ✅ **`src/components/referral/ReferralWidget.tsx`** — хардкод «0 приглашений / 0 бонусов», бэкенда нет
- ✅ **`src/services/referral.ts`** — localStorage-заглушка без реального бэкенда

### Changed (`src/components/profile/ProfileTab.tsx`)

- Удалены: `ReferralWidget`, платёжная карточка (`isRegistrationPaid`), UUID-чип «User ID», импорты `Wallet`/`Lock`
- Дизайн: все карточки переведены на `section-shell rounded-[1.5rem]` (единый токен)
- Верификация телефона вынесена в отдельный `section-shell`-блок
- Статистика няни показывается только при наличии реальных данных (`hasNannyStats`)
- Карточки запросов родителей → `section-shell rounded-[1.5rem]` вместо `Card p-4!`
- Асинхронные вызовы (`sendPhoneCode`, `verifyPhoneCode`, `handleResubmit`) правильно помечены `void`

---

## 2026-05-24 (Sun) — BLI-20: Supabase RLS smoke audit

### Findings

- ⚠️ **`nannies_public` view**: GRANT был только `authenticated`, не `anon`.
  Анонимные родители не могли читать список нянь — потенциальный product-баг.
- ✅ `nannies` raw table: только owner + service_role — ок.
- ✅ `parents`: только owner + service_role — ок.
- ✅ `admin_actions`, `analytics_events`, `payments`: service_role only — ок.

### Fixed

- ✅ **`supabase/migrations/20260524000000_rls_smoke_fixes.sql`**:
  - `GRANT SELECT ON nannies_public TO anon`
  - Пересоздаёт view с `security_invoker = false` (explicit)
  - Idempotent `ALTER TABLE … ENABLE ROW LEVEL SECURITY`
    для `analytics_events`, `admin_actions`, `payments`
- ✅ **`scripts/check_nannies_rls.sh`** — добавлены
  `check_service_only` проверки для `admin_actions`,
  `analytics_events`, `payments` (anon + authenticated).

### How to run smoke tests

Нужен прямой URL Supabase проекта (не через CF Worker):

```bash
SUPABASE_URL="https://<project>.supabase.co" \
ANON_KEY="<anon_key>" \
USER_JWT="<session_token>" \
OWNER_USER_ID="<user_id>" \
bash scripts/check_nannies_rls.sh
```

---

## 2026-05-24 (Sun) — BLI-27: Документы и фото нянь → Supabase Storage

### Done

- ✅ **`src/services/storageUpload.ts`** — новый сервис: `uploadDocumentFile` и
  `uploadPhotoFile`. Загружают в бакеты `nanny-documents` и `nanny-photos`.
  Graceful fallback: если Supabase недоступен — возвращает `null`, компонент
  сам решает что делать.
- ✅ **`DocumentUploadModal`** — параллельный вызов `analyzeDocument` +
  `uploadDocumentFile`; `fileDataUrl` — permanent Storage URL.
  Fallback на `objectUrl` если Storage off.
- ✅ **`Step1_BasicInfo`** — `handlePhotoUpload` стал async; пробует
  `uploadPhotoFile`, fallback на `readAsDataURL` (base64) если недоступен.
- ✅ **`.env.example`** — добавлены `VITE_SUPABASE_DOCS_BUCKET` и
  `VITE_SUPABASE_PHOTOS_BUCKET`.

### Что создать в Supabase Dashboard

Нужно создать два публичных бакета вручную (или через миграцию):

- `nanny-documents` — public, mime: image/\*, application/pdf
- `nanny-photos` — public, mime: image/\*

---

## 2026-05-24 (Sun) — BLI-39: Убрать платёжный гейт (временно бесплатно)

### Done

- ✅ **Удалён `PaymentModal.tsx`** — мёртвый мок с Tochka Bank-брендингом,
  нигде не использовался.
- ✅ **Удалены переводы Tochka/payment-mock** — 16 ключей (ru + en),
  `payTitle`, `tochkaBank`, `methodCard`, `methodSBP` и т.д.
- ✅ Бэкенд YooKassa (`api/payments/`) сохранён без изменений — вернём
  к нему когда выберем провайдера.
- ✅ **Все 44 теста зелёные.**

---

## 2026-05-24 (Sun) — BLI-34: Журнал аудита с adminId

### Done

- ✅ **`AdminPage`** — получает `currentAdminId` из Supabase-сессии при монтировании.
- ✅ **Локальные записи** — `logAdminAction` и `logWorkflowEvent` теперь включают
  `adminId` в кеш localStorage.
- ✅ **Серверные записи** — `admin_id` уже сохранялся в `admin_actions`,
  теперь отображается.
- ✅ **`AdminJournalTab`** — каждая строка показывает `admin:xxxxxxxx` (первые 8 символов
  UUID); `title` содержит полный ID; adminId добавлен в поиск.

---

## 2026-05-24 (Sun) — BLI-33: Отправка уведомлений из админки

### Done

- ✅ **`adminSendNotification`** — новая функция в `adminApi.ts` (POST /api/notify).
- ✅ **Детальная модалка родителя** — секция «Уведомления»:
  - кнопка «Повторить уведомление о статусе» (notifyUserStatusChanged);
  - compose-форма: тема + текст → кастомный email родителю.
- ✅ Скрывается если `requesterEmail` не задан.

---

## 2026-05-24 (Sun) — BLI-32: Куратор-таб для ручного матчинга

### Done

- ✅ **`AdminCuratorTab`** — новый компонент: сплит-вью «заявки | няни».
- ✅ **Совместимость** — скоринг по городу, графику, возрасту, верификации (0–100%).
- ✅ **Назначение** — диалог подтверждения → `createBooking` → toast + `onDataChanged`.
- ✅ **Таб «Куратор»** добавлен в `AdminPage` (иконка `Blend`, роут `/admin/curator`).

---

## 2026-05-24 (Sun) — BLI-31: analysisNotes в карточке родителя

### Done

- ✅ **`ParentRequest.analysisNotes?: string`** — добавлено поле в тип.
- ✅ **Карточка в списке** — если `analysisNotes` задан, показывается янтарный блок «Заметка: ...».
- ✅ **Детальная модалка** — секция «Заметки куратора» с inline-редактированием: textarea + кнопки «Сохранить» / «Отмена».
- ✅ **Сохранение** — через `adminUpdateParentRequest`, после сохранения обновляется `selectedParent` и вызывается `onDataChanged`.

---

## 2026-05-24 (Sun) — BLI-18: Release gate passed

### Done

- ✅ **`npm run build`** — чистая сборка, 0 ошибок.
- ✅ **`npm run lint`** — 0 ошибок (устранён unused `toggleLanguage` + `setLang` в App.tsx).
- ✅ **`npm test`** — 44/44 тестов прошли.
- ✅ **Smoke routes (локально)**: `/`, `/find-nanny`, `/success`, `/match-results`, `/nanny/:slug?mock=1` — все 5/5.
- ✅ **Vercel preview** — `blizko-3-6qpjg4jws-blizkos-projects.vercel.app` — 4/4 маршрутов.

---

## 2026-05-24 (Sun) — BLI-17: Accessibility and reduced-motion pass

### Done

- ✅ **Глобальный `:focus-visible` ринг** — `2px solid var(--color-primary)` + `outline-offset: 2px` для всех интерактивных элементов (кнопки, ссылки, чипы).
- ✅ **`.btn-honey:focus-visible`** — усиленный ринг с box-shadow для главного CTA.
- ✅ **`prefers-reduced-motion` усилен** — `.animate-fade-in`, `.animate-slide-up`, `.animate-fade-up`, `.animate-pop-in`, `.animate-scale-in`, `.animate-slide-down` сбрасываются в `opacity: 1; transform: none` (без мигания от промежуточных keyframe состояний). `.btn-honey-pulse` также отключён.
- ✅ **Splash экран** — уже корректно обрабатывал `prefers-reduced-motion` (`animation: none; opacity: 1`).
- ✅ **Иконочные кнопки** — AppHeader back button имеет `aria-label`. Все форм-чипы — правильные `<button type="button">`.
- ✅ **`outline-none`** — в публичных компонентах нет голого `outline-none` без замены.

---

## 2026-05-24 (Sun) — CI: test expectations after brand voice pass

### Done

- ✅ **Unit tests fixed** — `matchingAiResult.test.ts` ожидания обновлены под BLI-19 vocabulary: `няни`, `вариант`, `matches` вместо старых `кандидат/матч`.
- ✅ **Smoke E2E fixed** — `e2e_test.py` теперь проходит актуальный story-first ParentForm: textarea → `Малыши` → `Продолжить`.

### Effect

- GitHub Actions quality failure на run `26359085953` устранён локально.
- Smoke E2E больше не сломается после прохождения quality job.

---

## 2026-05-24 (Sun) — BLI-13: NannyPublicProfile trust architecture

### Done

- ✅ **Убран collapsible** — About, Work Style, Skills+Ages теперь всегда видны, не скрыты под toggle.
- ✅ **Новый раздел "Что обсудить при знакомстве"** — static copy куратора о первой встрече (ru+en).
- ✅ **CTA переработан** — "Начать подбор" → "Познакомиться с [firstName]" + подпись "Куратор поможет организовать встречу".
- ✅ **Badge labels** — "Модерация пройдена" → "Профиль проверен"; "Soft skills оценены" → "Характер и стиль изучены"; "Есть отзывы" → "Есть отзывы семей".
- ✅ **profileOpenWhyTitle/Body** — переписано с meta-UX-описания на куратора-голос: "Почему именно эта няня".
- ✅ **profileStyleTitle** — "Стиль работы с детьми" → "Характер и стиль работы".
- ✅ **profileSkillsTitle** — "Навыки" → "Навыки и занятия".
- ✅ **Порядок секций**: Hero → About → Work Style → Reviews → "Что обсудить" → Skills+Ages → CTA.

---

## 2026-05-24 (Sun) — BLI-12: MatchResults as curated shortlist

### Done

- ✅ **h1 динамический** — "Куратор подобрал N вариантов для вашей семьи" (ru) / "Your curator found N matches for your family" (en), вместо статичного заголовка.
- ✅ **Ограничение до 3 карточек** — `candidates.slice(0, 3)`.
- ✅ **CTA** — "Открыть профиль" → "Познакомиться" / "Meet this nanny".
- ✅ **Eyebrow** — "Подборка куратора" / "Curated by Blizko".
- ✅ **Текст секции** — курatorский голос: "Куратор поставил сначала тех, кто точнее всего совпал...".

---

## 2026-05-24 (Sun) — BLI-19: Brand Voice copy pass

### Done

- ✅ **translations.ts** — убраны все "shortlist", "кандидат", "Humanity+" из пользовательских строк. `heroSubtitle`, `homeProofChips`, `trust2Title/Detail`, `explainText`, `shortlist*`, `parentEtaLine`, `successDesc`, `recsTitle`, `successMatchingTitle`, `successProcessingNote` — полный перевод на язык куратора (RU + EN).
- ✅ **SuccessScreen.tsx** — "Готовим shortlist" → "Готовим варианты"; subtitle "подготовит 2–3 варианта".
- ✅ **CompatibilityModal.tsx** — "shortlist" → "подборка"; "кандидат" → "няня"; "Shortlist" → "Подборка".
- ✅ **MatchResultsScreen.tsx** — "Кандидат N" → "Вариант N"; "Shortlist" → "Подборка/Your options"; "вернуться к shortlist" → "вернуться к списку"; hardcoded "Пока кандидатов нет" → "Пока нянь нет".
- ✅ **AppHeader.tsx** — "/match-results" title "Ваш shortlist" → "Подборка от куратора".
- ✅ **Step1_Requirements.tsx** — описание "для shortlist" → "куратор понял, кого именно искать".
- ✅ **Step2_Calendar.tsx** — "список кандидатов" → "куратор найдёт подходящий вариант".
- ✅ **matchingAiResult.ts** — "Кандидат/Candidate" → "Няня/Nanny"; pluralize "кандидатов" → "нянь"; overallAdvice и рекомендации.
- ✅ **pushNotifications.ts** — "кандидатов" → "нянь".
- ✅ **assessment.ts** — поведенческие описания "кандидат" → "няня".
- ✅ **SeoPages.tsx** — schema "кандидат попал в shortlist" → "эта няня подошла".
- ✅ **LegalPages.tsx** — "shortlist" → "2–3 подходящих варианта".

---

## 2026-05-24 (Sun) — BLI-7/8: ParentForm story flow + budget

### Done

- ✅ **BLI-7 Step1_FamilyStory** — textarea + story chips (6 эмоц. фраз) + опциональные чипы возраста и графика. City удалён из Step 1.
- ✅ **BLI-7 Step2_Calendar** — Город перенесён в Step 2 (с Nominatim autocomplete и GPS кнопкой). `locationError` выводится inline (alert убран).
- ✅ **Геолокация починена** — удалён запрещённый `User-Agent` заголовок, `alert()` заменён на inline state.
- ✅ **BLI-8 Step3_FamilyProfile** — добавлены RangeSlider бюджета (hourly + monthly), Nanny Sharing toggle, requirements chips в collapsed extras. Все поля из старого Step1_Requirements теперь присутствуют в flow.

---

## 2026-05-23 (Sat) — Animated splash screen + Blizko logo mark

### Done

- ✅ **Logo SVG** — `public/logo.svg`: two overlapping circles (teal #2A6B6E + copper #C4744A) on warm paper background `#F9F6F2`, rounded-rect format, ready for icon export.
- ✅ **Inline HTML splash** — `index.html`: pure CSS/HTML splash renders before React boots. Left circle slides in from left (delay 0.25s), right from right (delay 0.45s), wordmark fades up (delay 0.95s). `prefers-reduced-motion` respected.
- ✅ **React exit hook** — `App.tsx` `useEffect`: tracks `window.__splashStart` (set at page load), waits minimum 2200ms, then adds `splash-exiting` class (0.45s fade), removes element. Verified correct timing in production build (exits at ~2.2s from app load for fast users, or whenever React mounts for slow connections).

---

## 2026-05-22 (Fri) — Full-width forms + fixed CTA + chip UX

### Done

- ✅ **StepWizardShell полная ширина** — все шаги (включая 1-й) теперь без карточного контейнера, `w-full px-4 py-5`. Home не затронут.
- ✅ **Кнопка «Продолжить» fixed** — `position: fixed; bottom: 0` + градиент-фейд. `pb-32` (128px) в каждом step-компоненте обеспечивает скролл последнего элемента выше кнопки. `flow-frame` обнуляет лишний `padding-bottom` у `app-main-frame` на flow-экранах.
- ✅ **Чипы не пишут в textarea** — `selectAge` / `selectSchedule` только устанавливают структурированные поля. Extra-чипы — toggle с визуальным выделением, фразы уходят в `extraPhrases[]` и добавляются к description при сабмите в блоке `[Пожелания]`.

### Effect

- Форма на телефоне: полная ширина, кнопка всегда видна внизу, textarea чистая для пользовательского ввода.

---

## 2026-05-21 (Thu) — Footer + RLHF Этап 1 + manifest

### Done

- ✅ **AppFooter скрыт на flow-экранах** — `/find-nanny`, `/become-nanny`, `/match-results` больше не рендерят footer. Одно условие в `App.tsx`. QA 9/9 (390/393/430px): нет перекрытия sticky CTA, нет hscroll.
- ✅ **RLHF Этап 1** — `api/cron/update-matching-weights.ts`: еженедельный cron (пн 4:00 UTC), читает `matching_outcomes`, нудирует `matching_weights` к факторам, коррелирующим с hired/interested. Guard: пропуск при <50 сигналов. Байесовская сдвижка alpha=N/(N+200), зажим [prior×0.5, prior×2.0].
- ✅ **manifest.json** — `theme_color` `#6C5CE7` → `#2A6B6E`, `background_color` → `#F9F6F2` (Warm Trust).

### Effect

- Flow-экраны: один путь — без конкурирующей навигации внизу
- RLHF loop замкнут end-to-end: shown → outcome → weight update
- PWA theme совпадает с дизайн-системой

---

## 2026-05-20 (Wed) — CI fixes

### Done

- ✅ **e2e_test.py** — локатор `"Малыши (1-3 года)"` → `"Тоддлеры (1–3)"` (чип был переименован в ParentForm, тест не обновили)
- ✅ **ci.yml: порт** — healthcheck и `BASE_URL` исправлены с 5173 → 3000 (совпадает с `vite.config.ts server.port`)
- ✅ **ci.yml: actions** — `actions/checkout`, `actions/setup-node` → v5, `actions/setup-python` → v6 (Node.js 24 runtime, убраны deprecation warnings)

### Effect

- CI зелёный без warnings на всех трёх jobs: Lint/Test/Build + Smoke E2E

---

## 2026-05-19 (Tue) — QA + Prod deploy

### Done — Release gate passed

- ✅ **CRON_SECRET** — добавлен в Vercel Production env
- ✅ **Vercel deploy** — задеплоен
- ✅ **Supabase миграции применены в prod**:
  - `matching_outcomes_update_rls` — UPDATE RLS policy для authenticated parents (критичный фикс upsert)
  - `matching_outcomes_display_position` — колонка `display_position INTEGER`
- ✅ **QA pass 20/20** — все проверки прошли на 390px:
  - Home: hero, CTA
  - NannyForm 4 шага: no AES, no fake 28 семей, no AI theater, no countdown CTAs, no PCM jargon, no quality funnel
  - MatchResultsScreen: no score %, no "ИИ подобрал"

### Effect

- RLHF learning loop полностью замкнут и работает в проде
- NannyForm соответствует Warm Trust tone guide
- MatchResultsScreen не показывает числовой score родителю

---

## 2026-05-19 (Tue) — NannyForm tone reframe

### Done — NannyForm: Warm Trust palette + tone cleanup (all 4 steps)

- ✅ **Step1_BasicInfo** — Removed fake "28 семей" social proof from aha-moment banner; rewritten to warm, honest copy. Replaced violet-50/violet-100 aha-moment with Warm Trust (#EFF3F2 / #2A6B6E). Replaced emerald photo security badge with Warm Trust colors + non-jargon copy ("Данные защищены и не передаются"). CTA "Осталось 3 шага" → "Продолжить".
- ✅ **Step2_Experience** — Removed AI theater copy ("поможет нашему AI найти лучшие совпадения"). About textarea placeholder rewritten from generic "Люблю детей, добрая..." to a real conversational prompt. Hint block → Warm Trust surface. CTA "Осталось 2 шага" → "Продолжить".
- ✅ **Step3_Verification** — All sky-*/green-* colors → Warm Trust (#EFF3F2 / #2A6B6E / #7FA99B). Removed internal label "Статус quality funnel" → "Готовность профиля". Removed "Score X/100" technical score from parent-facing text. amber/emerald quality card → petrol/copper palette. CTA "Остался 1 шаг" → "Продолжить".
- ✅ **Step4_Psychology** — amber-50/amber-200 cards → Warm Trust. violet border on "notBestAt" input → petrol. Section label "Психологический профиль" → "Как вы работаете с детьми". PCM jargon removed from chip label → "Стиль общения". Signal chips → #EFF3F2 / #2A6B6E.

### Effect

- No more countdown pressure framing ("Осталось N шагов") — replaced with neutral "Продолжить" across all steps
- No more fake numbers or AI theater in copy visible to nanny
- All 4 steps now use the Warm Trust palette consistently
- Build clean, lint 0 errors

---

## 2026-05-19 (Tue)

### Done — RLHF loop: race condition fix, display_position, hired outcome

- ✅ **Race condition removed** — `logWildcardFlag()` удалена. `wildcardId` теперь передаётся в `logShadowScores()` и пишется атомарно в том же upsert-ряду как `explore_flag`. Отдельный UPDATE невозможен до INSERT.
- ✅ **display_position** — добавлен в `matching_outcomes` (миграция `20260519000001`). Логируется как 1-based позиция кандидата в выдаче **после** ε-greedy, т.е. то, что реально видел пользователь. Нужен для propensity estimation.
- ✅ **Порядок вызовов** — `applyEpsilonGreedy` теперь вызывается до `logShadowScores`, чтобы позиции были post-greedy, а не pre-greedy.
- ✅ **Hired outcome** — `updateBookingStatus('confirmed'|'completed')` вызывает `recordMatchOutcome(..., 'hired')`. Повторный вызов безопасен (upsert). Самый сильный сигнал в learning loop теперь записывается.
- ⚠️ **CRON_SECRET** — должен быть задан в Vercel env, иначе ghosted cron возвращает 401.

### Done — RLHF outcome loop closed end-to-end

- ✅ **Fix 1 (RLS CRITICAL)** — `supabase/migrations/20260519000000_matching_outcomes_update_rls.sql`: UPDATE RLS policy added for authenticated parents on `matching_outcomes`. Without this, upserts in `recordMatchOutcome()` silently failed on existing shadow rows.
- ✅ **Fix 2 (wildcardId)** — `src/core/ai/shadowScoring.ts`: added `logWildcardFlag(parentId, nannyId)` → sets `explore_flag=true`. `matchingAi.ts`: captures `wildcardId` from `applyEpsilonGreedy` and calls it.
- ✅ **Fix 3 (UI wiring)** — `MatchResultsScreen.tsx`: open profile → `recordMatchOutcome(..., 'interested')`; new "Не подходит" ghost button → `'rejected'`. parentId from `supabase.auth.getUser()` on mount.
- ✅ **Fix 4 (ghosted cron)** — `api/cron/ghosted-outcomes.ts` + `vercel.json` cron at `0 3 * * *`. Sets `outcome='ghosted'` for rows with `outcome IS NULL` older than 7 days. `CRON_SECRET` env var required.

### Effect

- Full loop: shown → interested/rejected → hired/ghosted → future weight training
- ε-greedy wildcards now measurable via `explore_flag`

---

## 2026-05-18 (Mon)

### Done

- ✅ Created `.context/FRONTEND_RELAUNCH_HANDOFF.md` as the shared source of truth for Codex, Claude, Antigravity, and other agents
- ✅ Captured current frontend relaunch context: Linear project/docs, tired-parent principle, Home direction, Warm Trust palette, Fraunces/Inter typography, preview URLs, and next task order
- ✅ Documented external-agent preview workflow with Cloudflare Tunnel and Vite `allowedHosts`

### Effect

- Future agent sessions can start from a common project memory instead of reconstructing decisions from chat history
- Claude and Codex can now stay aligned by reading the same handoff before making or reviewing UI changes

---

## 2026-04-10 (Fri)

### Done

- ✅ Added `.context/BLIZKO_UI_CODEX.md` as the durable UI art-direction system for Blizko
- ✅ Captured the approved visual direction: editorial typography, paper-layer surfaces, tonal separation, curated coral CTA, and trust-first microcopy rules
- ✅ Converted one-off design feedback into reusable rules for Lovable, Figma, and implementation work

### Effect

- Future UI work can now be steered by a stable brand codex instead of ad hoc "make it prettier" prompting
- Blizko now has a shared visual standard that should reduce generic AI-generated UI drift

## 2026-03-28 (Fri)

### Done

- ✅ Added a durable proactive plugin-prompting rule to `.context/WORKING_CONTRACT.md`
- ✅ Defined default trigger cases for `Linear`, `Notion`, `Figma`, `GitHub`, `Sentry`, `Vercel`, `Google Calendar`, and `Gmail`
- ✅ Updated `HEARTBEAT.md` so periodic checks can suggest one exact plugin shortcut when it removes real friction

### Effect

- Codex should now nudge toward the right external system of record at the right moment instead of listing plugins generically
- Plugin suggestions are now constrained to one concrete tool and one concrete reason
## 2026-03-26 (Thu)

### Done

- ✅ Workspace bootstrap pass completed for operating-system hygiene
- ✅ `TOOLS.md` upgraded from template to structured local environment sheet
- ✅ `TOOLS.md` enriched with real machine facts: browsers, host machine, shortcuts, and SSH status
- ✅ `MEMORY.md` created as curated long-term memory for this main-session workspace
- ✅ Added `.context/AI_STACK.md` for model routing and AI operating rules
- ✅ Added `.context/MCP_STACK.md` for integration priorities and policy
- ✅ Added `.context/BOOTSTRAP_CHECKLIST.md` with current-state audit and next actions
- ✅ `HEARTBEAT.md` upgraded from empty placeholder to useful periodic checklist
- ✅ `WORKING_CONTRACT.md` extended with routing and context-maintenance rules
- ✅ Daily memory file for `2026-03-26` created to record this bootstrap session
- ✅ Audited global Codex MCP config: `figma`, `notion`, `linear` already present
- ✅ Added `github` remote MCP to global Codex config
- ✅ Added `supabase` remote MCP to global Codex config in read-only limited mode
- ✅ Upgraded global `codex` CLI and re-audited MCP auth modes
- ✅ Verified product contour: `npm test` passes, `npm run build` passes
- ✅ Reduced lint from `37 errors / 97 warnings` to `0 errors / 101 warnings`
- ✅ Added GitHub Actions CI workflow for `lint`, `test`, and `build`
- ✅ Added `.context/CODEX_OPERATING_PROTOCOL.md` to mirror the Antigravity operating layer for Codex
- ✅ Added strict Codex review protocol, release gate, and decision logging docs
- ✅ Strengthened zero-exception research escalation rule for current-information work
- ✅ Hardened Antigravity routing for `full codebase analysis` requests: these now map to review mode instead of generic analytics/static-analysis summaries

### Found

- ⚠️ `npm run lint` is now non-blocking but still has 101 warnings
- ⚠️ GitHub Actions now exist, but still need first run validation in GitHub
- ⚠️ Sentry is only partially active: build-time integration exists, but runtime DSN is missing from current `.env.local`

## 2026-03-22 (Sun)

### Done

- ✅ Full technical audit of codebase (18 SQL files, types, services, API layer)
- ✅ `.context/DNA.md` created with real data (13 tables, RLS map, design tokens, patterns)
- ✅ `.context/` memory system established
- ✅ **Security audit**: 9 vulnerabilities found (3🔴 3🟠 3🟡), 7 areas solid
- ✅ **C1 FIXED**: `analytics_events` RLS → `service_role` only (new migration `20260322_lock_analytics_events_rls.sql`)
- ✅ **C2 FIXED**: `api/ai.ts` → `verifyBearerUser()` added, 401 on unauthenticated
- ✅ **C3 FIXED**: `data.ts` POST → `extractOwnedUserId()`, rejects missing `user_id`
- ✅ **M2 FIXED**: `admin_actions` → `service_role` only (new migration `20260322_harden_admin_actions_policy.sql`)
- ✅ Added server-side confirmation guard for destructive admin `DELETE` on `/api/data`
- ✅ Audited `matching_outcomes` consumers: nullable `outcome` is intentional, current dashboards do not read this table
- ✅ Prod security hotfix applied directly to Supabase for `nannies_public`, `analytics_events`, `admin_actions`
- ✅ Migration normalization started: legacy daily migrations archived, new baseline migration created
- ✅ React 19 optimization proposals (useActionState, useOptimistic, use())
- ✅ Figma MCP configured (from yesterday)
- ✅ Added `scripts/check_nannies_rls.sh` + `npm run check:nannies-rls` for post-migration RLS smoke testing

---

## 2026-03-21 (Sat)

### Done

- ✅ Initial `.context/` setup (later lost, recreated today)
- ✅ Weekly plan created (Mon-Fri time-blocked)
- ✅ Project audit: 75% MVP, 12/12 core screens

---

## 2026-03-19 (Wed)

- Updated landing page copy (honest service guarantees)
- Tailwind CSS upgrade investigation

## 2026-03-18 (Tue)

- Design reference analysis (Apple Design Awards → Blizko)
- Redesign art direction analysis

## 2026-03-14 (Fri)

- Pre-launch audit started
- 12/12 core features confirmed implemented

## 2026-03-13 (Thu)

- Pre-launch system audit: 75% MVP status
- Critical gaps: Risk Flags UI, Payments (mock), node_modules EPERM
