# Claude Release Handoff

Use this file as the short context for a fresh Claude Code session.

## Repo

- Path: `/Users/anton/Desktop/blizko 3`
- Branch: `admin-trust-redesign-wip`
- Latest pushed commit: `de205d0`

## Goal

Run final release validation for the admin trust redesign before merge/deploy.

## Do

1. `git status --short --branch`
2. `npm run release:gate`
3. `npm run test:e2e`
4. Manual smoke checklist for `/admin`:
   - overview
   - parents
   - nannies
   - curator
   - support
   - parent/nanny cards
5. Report blockers only. If green, say whether merge to `main` is safe.

## Known Context

- `chat_messages` RLS leak was fixed by migration.
- `npm run check:chat-rls` passes locally via Supabase CLI.
- GitHub Actions `SUPABASE_ACCESS_TOKEN` secret is not configured yet, so CI live RLS smoke will skip until a real Supabase PAT in `sbp_...` format is added.
- Do not touch unrelated dirty files: `memory/*`, `MEMORY.md`, `.claude/`, `.agents/`, `BOOTSTRAP.md`.

## Token Discipline

- Do not reread the whole project unless a command fails.
- Start from the commands above.
- Keep the final report short: checks, blockers, merge/deploy recommendation.
