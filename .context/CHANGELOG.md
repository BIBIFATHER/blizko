# Blizko — CHANGELOG

---

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
