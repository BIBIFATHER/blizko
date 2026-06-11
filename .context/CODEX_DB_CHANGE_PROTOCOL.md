# CODEX_DB_CHANGE_PROTOCOL.md

Mandatory protocol for every Supabase, PostgreSQL, Auth, Storage, RLS, RPC, cron-SQL, or database-backed feature change.

## Core Rule

Database work is not done until all four sources agree:

1. application code
2. committed migration history
3. a clean database created from that history
4. the live production contract

A green unit test or successful build does not prove database compatibility.

## Trigger

Follow this protocol before editing when a task touches any of:

- `supabase/migrations/**`
- `.from(...)`, `.rpc(...)`, Storage buckets, Auth identities, SQL, policies, grants, functions, triggers, enums, or views
- API, cron, or background jobs that read or write Supabase
- generated database types
- production data cleanup or smoke fixtures

## Phase 1: Contract Audit Before Coding

Create a short contract matrix for every affected object:

| Object | Code expects | Local migrations define | Production defines | Verdict |
| --- | --- | --- | --- | --- |
| table / column / enum / policy / function / bucket | exact names and types | exact names and types | read-only verification | compatible / mismatch |

Mandatory checks:

1. Search every writer and reader, including API routes, cron jobs, background jobs, tests, and cleanup scripts.
2. List exact payload keys used by every `insert`, `upsert`, `update`, and RPC call.
3. Verify column names, types, nullability, defaults, enum values, constraints, indexes, grants, and RLS policies.
4. Verify identity domains explicitly. Never infer that similarly named IDs have the same type:
   - `auth.users.id` is UUID.
   - domain entity IDs may be TEXT.
   - record all conversions and joins.
5. Treat legacy migrations as historical evidence only. The authoritative sources are the current committed baseline/history and production read-only inspection.
6. Check dependent objects and transitive RLS. A policy querying another protected table may fail or hide rows.
7. Check every consumer that becomes active after the change. Restoring a missing column can expose a previously dormant cron, trigger, view, or function failure.
8. Check both schema compatibility and data compatibility.

If production cannot be inspected, stop before claiming the diagnosis or migration is complete. Record the blocked verification.

## Phase 2: Choose the Safe Change Shape

Prefer expand-migrate-contract:

1. Expand: additive, backward-compatible schema change.
2. Apply through an explicit production deploy gate.
3. Verify the live schema and migration ledger independently.
4. Deploy code that relies on the new contract.
5. Migrate or backfill data when required.
6. Contract/remove old fields only in a later release.

Rules:

- No manual Dashboard DDL as the source of truth.
- Create the migration first and commit it.
- Never edit a migration already applied to production.
- Keep schema, enum, RLS, and data-backfill changes separate when their risks differ.
- Prefer nullable additive columns first. Justify defaults, rewrites, locks, and destructive DDL.
- `IF NOT EXISTS` is idempotency, not verification. It can silently preserve an existing object with the wrong type or definition. Every migration needs an exact postcondition check.
- Production DDL requires explicit user approval.
- Code must not require a new production column before that column is verified live, unless a tested compatibility fallback or feature flag exists.
- Every migration needs a forward-fix or rollback runbook.
- Never manually edit `supabase_migrations.schema_migrations`; use supported migration tooling and verify the ledger afterward.
- A fallback that temporarily separates the production schema from the migration
  ledger is prohibited for routine work. Wait for the supported migration path
  to recover instead of offering drift as an equal option.
- The only exception is an active production outage where delaying the schema
  fix causes greater user harm. It requires explicit production approval, a
  documented recovery sequence, and ledger reconciliation in the same
  operational window whenever technically possible.
- The agent must choose the clean supported path automatically for non-outage
  work. Ask the user only for the final production approval, not to choose
  between a clean path and a drift-producing fallback.

## Phase 3: Error Visibility

Database failures must be observable:

- no silent `catch` around database writes
- log operation, table/function, error code, and non-secret context
- return or surface failure where the user flow depends on persistence
- add a test for the failure path
- do not log tokens, passwords, service keys, document contents, or personal data

## Phase 4: Required Verification

### Local

- `git diff --check`
- format, lint, typecheck, targeted tests, full tests, build
- clean `supabase db reset` from committed migrations
- verify the expected local migration list
- targeted SQL/RLS tests for every changed role and path
- verify generated database types are current when present

### Production Pre-Deploy, Read-Only

- inspect exact columns, types, enums, functions, policies, grants, buckets, and constraints
- compare local and remote migration ledgers
- run linked schema diff; any non-empty diff must be explained before approval
- verify that code values are valid production enum values

### Production Post-Deploy

- verify the exact migration version is registered
- independently re-read changed schema objects and assert exact types/defaults/nullability/definitions
- verify local and remote ledgers agree
- run role-correct smoke tests using `anon`, authenticated users, and admin/support roles as applicable
- never substitute `service_role` for a client-role acceptance test
- run every cron, function, view, or worker activated by the new schema contract
- run the changed UI/API flow and inspect console and network errors
- monitor the changed write path

## Investigation Discipline

Avoid long, repetitive debugging loops:

1. Write one falsifiable hypothesis and the minimum three checks before changing code.
2. Separate product failures from tool, MCP, DNS, rate-limit, and network failures.
3. Retry the same external operation at most twice. Then record the blocker and switch to an independent method or stop.
4. Do not rerun a data-heavy production smoke while a known schema/code defect remains.
5. Preserve sanitized evidence in the PR or Linear comment; `/tmp` is not the only acceptance record.
6. After a fix, run one consolidated acceptance pass instead of assembling `Done` from unrelated partial runs.
7. If the consolidated pass cannot run, report `partial` with the exact missing checks.

## Smoke Data Safety

- Use a unique marker for every run.
- Record exact inserted row IDs and storage object paths.
- Cleanup only by exact IDs/paths after verifying the marker.
- Never cleanup by a shared `user_id`, broad timestamp, prefix, or role.
- Verify zero remaining rows and objects.
- Pending cleanup blocks `Done`.

## PR Review Gate

For every new or changed database field, answer:

1. Where is it created?
2. Has the migration been applied to the target environment?
3. Where is it typed?
4. Where is it written?
5. Where is it read?
6. Does every enum value exist?
7. What RLS/grant path authorizes it?
8. What test proves the real role can use it?
9. What is the deployment order?
10. What is the rollback or forward-fix?

Any unanswered item is a review finding, not an assumption.

## Status Language

Do not say `Done`, `ready`, `fixed in production`, or close the Linear issue when:

- migration is not applied or independently verified
- local and production contracts differ without an accepted plan
- migration ledger drift remains
- required client-role smoke is missing
- console/network errors remain on the changed path
- test data cleanup is pending

Use `code ready`, `migration pending`, `production verification pending`, or `blocked` instead.

## Automation Requirement

The durable target state is:

- generate and commit Supabase TypeScript `Database` types from the authoritative schema
- instantiate clients as `createClient<Database>(...)`
- regenerate types after every migration
- fail CI when generated types differ
- add a schema-contract CI check for literal insert/upsert/update payloads and enum values

Until that automation exists, the manual contract matrix and production read-only inspection are mandatory.
