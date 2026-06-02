#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-}"

if [[ -z "$DATABASE_URL" ]]; then
  cat <<'EOF'
Usage:
  DATABASE_URL="postgresql://..." bash scripts/check_chat_messages_rls.sh

Required:
  DATABASE_URL

The database user must be able to inspect pg_policies and SET ROLE anon/authenticated.
This catches regressions where chat_messages becomes visible outside thread participants.
EOF
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required"
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  broad_select_count integer;
BEGIN
  SELECT count(*)
    INTO broad_select_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'chat_messages'
    AND cmd = 'SELECT'
    AND qual = 'true';

  IF broad_select_count > 0 THEN
    RAISE EXCEPTION 'chat_messages has a broad SELECT policy USING (true)';
  END IF;
END $$;

BEGIN;
SET LOCAL ROLE anon;
DO $$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*)
    INTO visible_rows
  FROM public.chat_messages;

  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'anon can see % chat_messages rows', visible_rows;
  END IF;
END $$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*)
    INTO visible_rows
  FROM public.chat_messages;

  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'authenticated without auth.uid() can see % chat_messages rows', visible_rows;
  END IF;
END $$;
ROLLBACK;
SQL

echo "OK: chat_messages RLS smoke test passed"
