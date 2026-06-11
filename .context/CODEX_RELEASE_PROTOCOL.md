# CODEX_RELEASE_PROTOCOL.md

Release gate for Codex in this workspace.

Do not imply "ready", "safe to ship", or "done for release" without walking this checklist.
Do not say "ready", "done", "deployed", "can push", or "release is clean" when the local repository cannot reproduce the deployed state.

## Pre-Release Gate

0. Repository Hygiene

- run `git status --short`
- classify every dirty file as product / docs / memory / generated / accidental
- do not claim release readiness while product files are dirty
- do not commit `memory/*` or personal memory files unless explicitly asked
- if deploy happened from a dirty worktree, say so as a release risk
- final release output must include the latest commit hash or explicitly say no commit was made

1. Dependency Hygiene

- run `git diff -- package.json package-lock.json` when either file changed
- explain every dependency change
- do not add CLI tools to runtime dependencies
- tools such as `vercel`, Supabase CLI, Playwright CLI, or one-off deploy helpers must be global / `npx` / dev-only, not app runtime dependencies
- unexplained `package.json` or lockfile changes block release readiness

2. Scope

- state what changed
- state what user-facing behavior is affected

3. Verification

- lint
- test
- build
- any task-specific verification
- targeted eslint for changed `src` / `api` files

4. Environment

- list required env vars or secrets
- call out any new external dependency
- call out migration or config requirements
- if Vercel env vars changed, confirm target environment without exposing secret values
- if Supabase migrations were applied, list migration names and target environment

4.1 Database Contract

- if the release touches Supabase, SQL, Auth, Storage, RLS, RPC, or database-backed payloads, follow `.context/CODEX_DB_CHANGE_PROTOCOL.md`
- show that application code, committed migrations, a clean reset, and production agree
- verify the exact production schema objects and migration ledger
- run acceptance with the real client roles; `service_role` is not a substitute
- confirm exact-ID cleanup of smoke data
- a pending migration, unexplained schema diff, ledger drift, missing UI/API smoke, or pending cleanup blocks release readiness

5. Deploy Evidence

- provide deployment URL or deployment id when claiming deploy
- state the commit hash deployed
- if deploy tooling is not linked locally, say so instead of implying verification

6. Risk

- residual risks
- rollback path
- monitoring / feedback signal

## Required Output

```text
Release status
[ready / blocked / partial]

Repository
- git status: ...
- latest commit: ...
- dirty files intentionally left: ...

Verification
- lint: ...
- test: ...
- build: ...

Environment
- ...

Risks
- ...

Rollback
- ...
```

## Rules

- If `git status --short` was not run, release status is not "ready".
- If dirty product files remain, release status is not "ready".
- If `package.json` / lockfile changed without explanation, release status is not "ready".
- If lint/test/build was not run, say so directly.
- If one gate failed, release status is not "ready".
- If a migration exists, mention sequencing requirements.
- If database-backed code relies on schema not independently verified in production, release status is not "ready".
- If required smoke data cleanup is pending, release status is not "ready".
- If runtime monitoring is absent, say that explicitly.
- If a rollback path is weak, say that explicitly.
- "Deployed locally from dirty worktree" is not the same as "ready to push".

## Anti-patterns

- "should be fine"
- "ready" without verification
- "deployed" without URL/id and commit hash
- "ready to push" with dirty product files
- committing CLI tools into runtime dependencies
- hiding env or migration dependencies
- pretending warnings are irrelevant without checking impact
