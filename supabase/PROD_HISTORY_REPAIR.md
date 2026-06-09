# Prod migration-history repair — runbook (BLI-94)

**Status:** REQUIRED after merging PR #9. **Touches prod** (the
`supabase_migrations.schema_migrations` metadata table only — **no schema
change**). Run with deploy-gate approval.

## Why

PR #9 replaced the fictional migration history with an authoritative baseline
(`00000000000000_remote_schema.sql`, dumped from prod) plus a few keepers. But
prod's recorded migration history still lists the OLD versions, and none of them
match the new local filenames:

| local file (version)                                     | prod recorded version                        |
| -------------------------------------------------------- | -------------------------------------------- |
| `00000000000000_remote_schema`                           | — (not in prod)                              |
| `00000000000001_realtime_publication`                    | — (not in prod)                              |
| `20260527000000_create_nanny_storage_buckets`            | `20260527114356`                             |
| `20260604130000_create_security_audit_log`               | `20260604113023`                             |
| `20260604140000_revoke_service_only_table_grants`        | `20260604120941`                             |
| `20260609000000_fix_chat_messages_support_agent_definer` | `20260609000000` ✅ already applied (PR #12) |

> `20260609000000` (chat-RLS definer fix) was applied to prod **out of band**
> during PR #12: the DDL ran via `execute_sql` and the row was registered with
> `supabase migration repair 20260609000000 --status applied --linked`. Its local
> filename **already matches** the prod-recorded version, so it needs **no repair
> and must NOT be re-run** — it is listed here only for completeness.

Plus prod still records these, now folded into the baseline:
`20260322170000`, `20260519190227`, `20260519190231`, `20260528192033`,
`20260529091537`, `20260602160652`, `20260604110305`.

**Risk if not repaired:** `supabase db push --linked` to prod would treat all 5
local migrations as unapplied and try to re-run them → `CREATE POLICY` fails
(policies already exist). `db reset` / new environments are unaffected.

## Goal

Make prod's recorded history equal the local files:
`00000000000000, 00000000000001, 20260527000000, 20260604130000, 20260604140000,
20260609000000`. (`20260609000000` is already applied — see note above; only the
first five need repair.)

## Prerequisites

`supabase migration repair` is **CLI-only** — it connects directly to the prod
database, so it needs `SUPABASE_DB_PASSWORD` in the env and network access to the
pooler. The Supabase MCP server does **not** expose `migration repair`. Run these
from a host that can reach `*.pooler.supabase.com` (a TLS-throttled network will
fail with `i/o timeout` even though the password is correct).

## Commands

Pre-check (read-only):

```bash
supabase migration list --linked   # shows local vs remote drift
```

Mark superseded / renamed prod versions as reverted (removes the rows; no schema
change):

```bash
supabase migration repair --status reverted \
  20260322170000 20260519190227 20260519190231 20260527114356 \
  20260528192033 20260529091537 20260602160652 20260604110305 \
  20260604113023 20260604120941
```

Mark the authoritative local versions as applied (registers without running):

```bash
supabase migration repair --status applied \
  00000000000000 00000000000001 20260527000000 20260604130000 20260604140000
```

## Verify

```bash
supabase migration list --linked          # local == remote, no drift
supabase db diff --linked --schema public  # still: No schema changes found
```

Expected after repair: `migration list` shows the 6 local versions on both
sides (the 5 repaired + the already-applied `20260609000000`), zero drift;
`db diff` stays empty (schema was never touched).

## Rollback

`migration repair` only edits the metadata table (no schema change). To undo the
repair, reverse both steps — first mark the five new local versions reverted, then
re-register the ten original prod versions as applied:

```bash
supabase migration repair --status reverted \
  00000000000000 00000000000001 20260527000000 20260604130000 20260604140000

supabase migration repair --status applied \
  20260322170000 20260519190227 20260519190231 20260527114356 \
  20260528192033 20260529091537 20260602160652 20260604110305 \
  20260604113023 20260604120941
```

`20260609000000` is left untouched in both the repair and this rollback — it is
already applied and its filename matches the recorded version. The prod schema
itself is never modified by these commands.
