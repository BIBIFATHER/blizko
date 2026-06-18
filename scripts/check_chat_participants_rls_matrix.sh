#!/usr/bin/env bash
# Runs the chat_participants + support_messages RLS positive/negative matrix
# (scripts/sql/chat_participants_rls_matrix.sql) for BLI-124 / RISK-009.
# Self-contained BEGIN..ROLLBACK — applies the fix, seeds fixtures, asserts every
# identity/role, rolls back. Safe against prod or any linked database (nothing persists).
set -euo pipefail

sql_file="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/scripts/sql/chat_participants_rls_matrix.sql"
DATABASE_URL="${DATABASE_URL:-}"

can_use_supabase_cli=0
if command -v supabase >/dev/null 2>&1 && [[ -f "supabase/.temp/project-ref" ]]; then
  can_use_supabase_cli=1
fi

if [[ -n "$DATABASE_URL" ]]; then
  command -v psql >/dev/null 2>&1 || { echo "ERROR: psql required for DATABASE_URL mode"; exit 1; }
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$sql_file"
elif [[ "$can_use_supabase_cli" -eq 1 ]]; then
  supabase db query --linked --file "$sql_file"
else
  echo "Usage: DATABASE_URL=postgresql://... bash scripts/check_chat_participants_rls_matrix.sh"
  echo "   or: link the repo with Supabase CLI (SUPABASE_ACCESS_TOKEN in CI)"
  exit 1
fi

echo "OK: chat_participants + support_messages RLS matrix passed"
