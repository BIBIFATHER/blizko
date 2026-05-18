# Blizko — CHANGELOG

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
