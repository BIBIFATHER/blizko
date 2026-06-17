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
    (`7919e29`).
- `main` HEAD `7919e29`. Release gate PASSED before each merge; Vercel
  `blizko`+`blizko-3` deploys success; `www.blizko.app` 200.
- Contour unchanged: synthetic-only ON, all egress/PII gates default-closed.
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

1. No open execution task. Both slices merged + deployed.
2. Open follow-ups (no deadline): BLI-116 analytics allowlist; geocode
   legal-acceptance before opening `BLIZKO_GEOCODE_EGRESS_GATE_OPEN`.
3. Keep two-sided Claude/Codex review at risk gates; verify findings
   independently. Deploy only via release-gate PASS + owner approval.
