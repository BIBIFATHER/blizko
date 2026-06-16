# ACTIVE_TASK.md

Single resumable checkpoint for the current Blizko task. Verify external state
before acting: branches, PR heads, CI, deployments, Linear, and production may
have changed.

## Status

`ACTIVE`

Last updated: 2026-06-16 (Europe/Moscow)

## Objective

Continue BLI-110: Jurisdiction Router / stateless egress enforcement for the
closed synthetic-only development contour and later RU data-contour readiness.

## Current State

- `main` includes PR #28: Jurisdiction Router MVP foundation.
- `main` includes PR #29: stateless external-AI egress guard.
- Current branch: `codex/bli-110-stateless-notification-egress-guard`.
- Latest code commit on this branch:
  `464a46f feat(jurisdiction): guard notification egress`.
- This branch adds stateless notification egress enforcement for Resend and
  Telegram without DB persistence, migrations, jurisdiction pins, or audit
  writes.

## Current Slice

Notification egress guard:

- `api/_notificationEgress.ts` blocks external notification processors outside
  synthetic-only unless jurisdiction is RU and
  `BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN=true`.
- `/api/notify` rejects non-allowlisted restored sessions in synthetic-only and
  calls the guard before Resend/Telegram provider fetches.
- `api/ai-support.ts` calls the notification guard before assembling Telegram
  human-handoff context or calling Telegram Bot API.
- Docs/registers/env/changelog note the default-closed notification gate and
  the sender-vs-recipient limitation.

## Verification Already Run For Current Slice

- Targeted tests: notification + notify + ai-support egress passed.
- Full local gate passed after final correction:
  - `npm run typecheck`
  - `npm test` → 161 tests / 39 files passed
  - `npm run lint`
  - `npm run build`
  - `npm run format:check`
  - `git diff --check`
- Claude independent review:
  - first pass: `Confirmed with conditions`
  - second pass found AI-support Telegram handoff coverage gap
  - final pass: egress coverage confirmed; residual condition is future
    legal/security ratification before opening notification gate.

## Residual Risks / Preconditions

- BLI-110 remains `In Progress`; do not close it after this slice.
- `BLIZKO_EXTERNAL_NOTIFICATION_GATE_OPEN` must not be opened for real data
  until legal/security explicitly accepts sender-keyed routing or replaces it
  with subject-level routing.
- If AI-support Telegram handoff is blocked, user-facing escalation copy still
  succeeds while no external Telegram alert is sent. A later real-data workflow
  should add an in-contour staff queue before relying on that copy.
- Jurisdiction pin/audit persistence remains deferred until RU data-plane
  storage design is ready; do not add a new PD store casually.

## Next Steps

1. Push the current branch.
2. Open a draft PR for the notification egress slice.
3. Wait for CI/Vercel preview checks.
4. Update Linear BLI-110 with PR URL, verification, Claude result, and residual
   limitations.
5. Keep BLI-110 `In Progress`.
