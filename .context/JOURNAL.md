# Blizko — JOURNAL

> Owner: Anton

---

## Weekly Goals (Mar 22–28)

- [ ] **P1: Security** — RLS policies tested, no secrets in frontend
- [ ] **P2: Risk Flags UI** — incompatibility warnings in MatchResultsScreen
- [ ] **P3: Payments** — Yookassa integration (real keys, webhooks)
- [ ] **P4: Mobile QA** — smoke tests on iOS Safari + Android Chrome
- [ ] **P5: Release prep** — build, Sentry, staging deploy
- [ ] **P6: Operating System** — connect core MCPs and complete AI routing setup

---

## Flow State Tracker

| Date | Hours | Energy | Flow? | Notes |
|---|---|---|---|---|
| 2026-03-22 | ~3h | 🟢 Good | Yes | Deep audit → security findings → React 19 proposals |
| 2026-03-21 | ~1h | 🟡 Med | No | Late evening, context setup only |

---

## Insights & Reflections

### 2026-03-22

- **Security audit done**: 9 vulnerabilities found, 3 critical
- C1: `analytics_events` table has NO RLS — must fix immediately
- C2: `api/ai.ts` has zero auth — anyone can burn Gemini credits
- C3: Admin POST creates records without `user_id` — orphaned data
- M2: `admin_actions` uses `user_metadata` (user-settable!) instead of `app_metadata`
- PII protection via `nannies_public` view is solid ✅
- `parents` RLS is the best implemented — granular per-operation ✅
- React 19 `useActionState` + `useOptimistic` can replace 50+ lines of boilerplate

### 2026-03-26

- The workspace had strong raw documentation, but weak operational structure around integrations and AI routing.
- The highest-value missing layer is not more prompts, but better connectors and repeatable workflows.
- Heartbeat and tool notes were underutilized; both are now promoted into active operating files.
- Next leverage point: connect MCPs before adding more process.
- Confirmed that `linear`, `notion`, and `figma` were already configured globally in Codex.
- Added `github` and a safer initial `supabase` MCP setup to the global Codex config.
- `TOOLS.md` is no longer generic; it now reflects the actual machine instead of placeholders.
- The workspace now has a real long-term `MEMORY.md`, which reduces repeated re-discovery in main sessions.
- Delivery loop is mixed: tests and production build are healthy, but lint debt is still significant enough to block a clean quality gate.
- Sentry is not fully “done” until runtime DSN is present, not just build-time release upload config.

### Open Questions

- Is Next.js migration worth it, or ship with Vite+Vercel?
- Realistic launch date target?
- Payments: Yookassa keys — when ready?

---

## 💎 Core Values

1. Инновации (Blizko, AI-стек)
2. Эстетика (Фотография, чистый UI)
3. Близость (Семья, поддержка)

---

## Self-Care Log

| Date | Sleep | Meals | Exercise | Mood |
|---|---|---|---|---|
| 2026-03-22 | — | — | — | 🟢 |
| 2026-03-26 | — | — | — | 🟡 |

> 💡 Sustainable shipping > burnout sprints. Sleep ≥ 7h — non-negotiable.
