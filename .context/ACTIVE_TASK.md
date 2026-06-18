# ACTIVE_TASK.md

Single resumable checkpoint for the current Blizko task. Verify external state
before acting: branches, PR heads, CI, deployments, Linear, and production may
have changed.

## Status

`MERGED + DEPLOYED` (four BLI-110/116 egress/PII slices shipped 2026-06-16/17)

Last updated: 2026-06-17 (Europe/Moscow)

## Objective

BLI-110/116 hardening: narrow, reversible egress / PII guards for the closed
synthetic-only contour. Each slice self-reviewed via two-sided Claude/Codex,
merged to `main` and deployed to production.

## Current State

- `main` includes PRs #28–#30 plus, all `MERGED` + prod-deployed:
  - **#31** geocode egress guard (`ebaa729`).
  - **#32** analytics PII denylist (`35436922`).
  - **#33** BLI-116 analytics per-event schema allowlist (`94d7a71`) — shared
    `src/services/analyticsSchema.ts`, prod POST verified 201.
  - **#34** Sentry scrubbing + tracing/replay/BrowserSession disabled
    (`7919e29`) — Linear BLI-117.
  - **#35** server-side function-log PII scrubbing (`5c6b874`) — Linear BLI-118;
    prod analytics POST verified 201.
  - **#36** cut live PD exposure (`f53396d`) — Metrica removed + geocode
    default-closed; prod geocode 403 + Metrica gone verified.
  - **#37** live-PD audit (A'+C) + CSP cleanup (`4f397d9`) — prod CSP verified
    clean of Yandex/doubleclick. See `docs/compliance/live-pd-audit-2026-06-17.md`.
- **`main` HEAD `4f397d9`.**
- **Audit findings (2026-06-17):** PostHog NOT loaded (ghost). Live loaders:
  Cloudflare Insights, Google Fonts, Unsplash (all IP egress). **C: Supabase
  `disable_signup=false` — entry OPEN at project config; only 3 owner accounts
  exist. CRITICAL owner dashboard action: disable signups (+ CF Web Analytics
  OFF).** I cannot flip prod auth config autonomously.
  - **#38** privacy `/privacy` factual sync — removed Yandex Metrica (`cea7e55`).
- Plan (consensus w/ Codex): C → A'(done) → privacy quick-gate (DONE: /privacy
  exists, Metrica removed; completeness → BLI-123) → B legal drafts. Phase 3
  RU data-plane PoC deferred.
- Linear (under BLI-110): **BLI-121 Urgent — owner closes open signups
  (`disable_signup=true`) + CF Web Analytics OFF**; BLI-122 self-host
  fonts/Unsplash; BLI-123 legal drafts (B). BLI-116/117/118 Done.
- Release gate PASSED before each merge; Vercel deploys success; `www.blizko.app` 200.
- Contour: synthetic-only ON, egress/PII gates default-closed. NOTE: closed-entry
  claim is FALSE until the owner closes open signups.
- AI operating model now formalized:
  - `.context/AI_OPERATING_MODEL.md` defines Claude as lead executor and Codex
    as evidence/risk controller.
  - `.context/EVIDENCE_PACK_TEMPLATE.md` defines required proof before
    readiness claims on risk gates.
  - `.context/RISK_REGISTER.md` tracks long-lived launch/legal/security risks.
- Open follow-ups (no deadline): geocode auth/jurisdiction for the public path
  (legal Conditional-Go, needs counsel); analytics per-event allowlist edge
  follow-up = none (shipped); PostHog autocapture / Yandex Metrica minimization;
  Vercel function-log PII review (server-side).

## Shipped slices (history)

### PR #31 — geocode egress guard

- `api/_geocodeEgress.ts` + `api/geocode.ts`: fail-closed before any external
  Yandex/Nominatim fetch; allowed in synthetic-only, else 403 unless
  `BLIZKO_GEOCODE_EGRESS_GATE_OPEN=true`. No DB/persistence/jurisdiction pin.
- 8 egress tests (forward/reverse blocked, Yandex-key blocked, nannies dispatch).
- Registers updated: Yandex Geocoder + Nominatim in PROCESSOR_REGISTER; Geocoding
  row in DATA_REGISTER (synthetic-only/default-closed).
- Codex verdict: `Confirmed with conditions` → all addressed.

### PR #32 — analytics PII-property guard

- `src/services/analytics.ts` + `api/data.ts`: drop PII keys / contact-like
  values / opaque ids (UUID, long decimal) / objects; `parent_id`/`nanny_id`
  kept only as a whole UUID (learning-loop correlation); `session_id` reserved
  safe-id (regression fix — generated UUID session was being dropped);
  `identify()` traits sanitized; endpoint-level server test.
- Codex verdict: `Rejected` x2 → addressed; verified each finding in code first.

## Verification (per branch, last run)

- #31: typecheck 0 · lint 0 · 169 tests · build ✓ · prettier ✓ · diff ✓.
- #32: typecheck 0 · lint 0 · 173 tests · build ✓ · prettier ✓ · diff ✓.

## Residual Risks / Preconditions

- BLI-110 closed, but two follow-ups remain:
  - **BLI-116** (Backlog): analytics per-event property allowlist — closes the
    DATA_REGISTER "prohibit free-text" condition. Deferred (synthetic-only =
    no real PD; allowlist carries funnel-regression risk).
  - Geocode gate-open precondition: legal/security acceptance of the
    unauthenticated public `/api/geocode` path (or add auth/jurisdiction
    routing) before `BLIZKO_GEOCODE_EGRESS_GATE_OPEN=true`. Documented in
    `.env.example` + registers. Gate stays default-closed.
- All egress/PII gates default-closed; synthetic-only contour keeps real users,
  PD, and production payments out until RU-core Go.

- Geocode legal pre-open assessment (`$blizko-lawyer`, 2026-06-16):
  **Conditional Go** to open the gate for real data — blocker is the
  unauthenticated public path; conditions tracked in PR #31 comments. Issue-
  spotting only; needs practicing counsel before opening. Gate stays closed.

## Next Steps

1. Owner action: close Supabase open signups (`disable_signup=true`) and disable
   or explicitly accept/document Cloudflare Web Analytics (BLI-121).
2. Agent action after owner confirmation: verify Auth config, user inventory,
   session behavior, and update `.context/RISK_REGISTER.md` / compliance
   registers.
3. Next autonomous work: B legal draft package (BLI-123) after current factual
   processing is confirmed.
4. Keep two-sided Claude/Codex review at risk gates; use the evidence pack
   template before any readiness claim.
