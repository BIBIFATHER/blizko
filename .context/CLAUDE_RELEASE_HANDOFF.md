# Claude Handoff — BLI-88

Use this as the short context for a fresh Claude Code session. Keep token usage low.

## Repo

- Path: `/Users/anton/Desktop/blizko 3`
- Branch: `codex/bli-88-parent-compatibility-layer`
- Base context: BLI-90 v0 compatibility model is already in commit `adc6d1d`.

## Goal

Review only the BLI-88 PR scope: optional, non-diagnostic parent compatibility signals for curator matching.

## Current Scope

- Parent optional compatibility inputs: home rhythm, adaptation style, boundary style, parent support needs, decision style.
- Compatibility model reasons: family rhythm, first shift, boundaries, parent support, decision format.
- Admin parent card: optional family compatibility panel with curator follow-up prompts.
- Critical product rule: skipped optional answers must stay absent. Do not auto-fill family-profile signals.

## Verified By Codex

- `npm run typecheck`
- `npm run lint`
- `npm test -- --run`
- `npm run build`
- `npm run test:e2e` (`8 passed / 4 skipped`)

## Do

1. `git status --short --branch`
2. Review only changed BLI-88 files if needed.
3. Report blockers only. If no blockers, say PR is review-ready.

## Do Not Touch

- `.agents/*`
- `.claude/*`
- `MEMORY.md`
- old `memory/*`
- `BOOTSTRAP.md`

## Token Discipline

- Do not reread the whole repo.
- Do not paste large diffs.
- Open changed files only when a check or review finding requires it.
