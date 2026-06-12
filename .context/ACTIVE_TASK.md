# ACTIVE_TASK.md

Single resumable checkpoint for the current Blizko task. Read this file before
daily notes and long-term memory. Verify every external status before acting:
branches, PR heads, CI, deployments, Linear, and production may have changed.

## Status

`ACTIVE`

Last updated: 2026-06-12 (Europe/Moscow)

## Objective

Finish BLI-103: deterministic Playwright smoke for the parent flow to
`/success` and the admin view at `/admin/parents`. Use the result to finish
BLI-55 only after the full acceptance gate is proven.

## Current Work

- Harness PR: [#21](https://github.com/BIBIFATHER/blizko/pull/21)
- Bootstrap workflow PR: [#22](https://github.com/BIBIFATHER/blizko/pull/22)
- BLI-55 remains open.
- Do not trust commit hashes or CI states recorded in chat. Read the current PR
  heads and checks before continuing.

## Completed

- Additive `data-testid` instrumentation for the parent and admin flows.
- Playwright harness, parent/admin specs, console/network guard, and exact-ID
  cleanup design.
- Test-auth is fail-closed for production.
- Service-role access stays in Node setup/teardown, never in the browser.
- Preview execution requires a separate E2E Supabase project and matching
  project references.

## Pending, In Order

1. Review the latest diff and security boundaries of PRs #21 and #22.
2. Confirm a separate E2E Supabase project exists and has all committed
   migrations.
3. Configure the Vercel Preview environment to use only that E2E project.
4. Configure GitHub Environment `e2e-preview` with E2E-only secrets and
   protection. Never reuse production service-role credentials.
5. Merge PR #22 only after review and explicit user approval.
6. Redeploy PR #21 and obtain five consecutive green smoke runs without
   retries.
7. Verify teardown deleted only exact IDs guarded by the run marker and left
   zero test rows.
8. Review and merge PR #21 only after explicit user approval.
9. Attach evidence to BLI-103/BLI-55 and close them only when their acceptance
   criteria are fully met.

## Hard Boundaries

- Never run the E2E harness against production.
- Never enable test-phone bypass in production.
- Never expose service-role keys to browser code, logs, artifacts, or
  `storageState`.
- Never broad-delete production or E2E data; require exact ID plus marker and
  verify zero.
- Do not merge PRs, change production, or apply migrations without the required
  explicit approval.
- Do not start BLI-99, BLI-101, or BLI-102 while this task is active.

## Resume Procedure

1. Read this file.
2. Run `git status --short --branch`.
3. Re-read the live PR heads, diffs, reviews, and checks.
4. Continue the first pending safe step that is not approval-gated.
5. Update this file after every material checkpoint and before `/compact`,
   session/token limits, handoff, or stopping.

When the objective is complete, set status to `COMPLETE`, move durable evidence
to Linear/CHANGELOG, then replace task-specific sections with `No active task`.
