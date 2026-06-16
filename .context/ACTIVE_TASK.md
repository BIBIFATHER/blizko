# ACTIVE_TASK.md

Single resumable checkpoint for the current Blizko task. Verify external state
before acting: branches, PR heads, CI, deployments, Linear, and production may
have changed.

## Status

`ACTIVE`

Last updated: 2026-06-16 (Europe/Moscow)

## Objective

BLI-110 hardening: narrow, reversible stateless egress / PII guards for the
closed synthetic-only contour. Two review slices prepared and self-reviewed via
two-sided Claude/Codex while keeping all features working on synthetic data.

## Current State

- `main` includes PRs #28 (Jurisdiction Router MVP), #29 (AI egress guard),
  #30 (notification egress guard). BLI-110 marked `Done` in Linear.
- Two open Draft PRs, each its own branch off `main` (`5242ad3`):
  - **PR #31** `feat/bli-110-geocode-egress-guard` — head `9e5d636`.
  - **PR #32** `feat/bli-110-analytics-pii-guard` — head `a2c107b`.
- Current branch: `feat/bli-110-geocode-egress-guard`.

## Slices (both self-reviewed, both Draft — NOT Ready/merged/deployed)

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

## Next Steps

1. Owner gate: decide Ready/merge for PR #31 and/or #32 (do not flip without
   explicit Go). No deploy without release-gate PASS + approval.
2. If continuing: BLI-116 analytics allowlist (own focused slice + tests), or
   the geocode legal-acceptance item (needs `blizko-lawyer`).
3. Keep using two-sided Claude/Codex review at risk gates; verify findings
   independently before acting.
