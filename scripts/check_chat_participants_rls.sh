#!/usr/bin/env bash
set -euo pipefail

# BLI-124 / RISK-009 regression guard. Catches:
#   * chat_participants INSERT regressing to the weak bare self-check
#     (auth.uid() = user_id) that lets any authenticated user join any thread;
#   * the SECURITY DEFINER join helper losing its hardening;
#   * support_messages INSERT losing the sender_type/sender_id pin (spoofing).
# Mirrors scripts/check_chat_messages_rls.sh (pg_policies + SET ROLE).

DATABASE_URL="${DATABASE_URL:-}"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"

can_use_supabase_cli=0
if command -v supabase >/dev/null 2>&1 && [[ -f "supabase/.temp/project-ref" ]]; then
  can_use_supabase_cli=1
fi

if [[ -z "$DATABASE_URL" && -z "$SUPABASE_ACCESS_TOKEN" && "$can_use_supabase_cli" -eq 0 ]]; then
  cat <<'EOF'
Usage:
  DATABASE_URL="postgresql://..." bash scripts/check_chat_participants_rls.sh
  SUPABASE_ACCESS_TOKEN="<token>" bash scripts/check_chat_participants_rls.sh
  bash scripts/check_chat_participants_rls.sh

Required:
  DATABASE_URL, SUPABASE_ACCESS_TOKEN, or an already authenticated linked Supabase CLI

DATABASE_URL mode:
  The database user must be able to inspect pg_policies and SET ROLE authenticated.

This catches regressions where chat_participants becomes self-joinable into any
thread, or support_messages becomes spoofable.
EOF
  exit 1
fi

sql_file="$(mktemp)"
trap 'rm -f "$sql_file"' EXIT

cat > "$sql_file" <<'SQL'
-- 1. chat_participants INSERT must NOT be the bare self-check.
DO $$
DECLARE
  weak_check_count integer;
BEGIN
  SELECT count(*)
    INTO weak_check_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'chat_participants'
    AND cmd = 'INSERT'
    AND with_check = '(auth.uid() = user_id)';

  IF weak_check_count > 0 THEN
    RAISE EXCEPTION 'chat_participants INSERT is the weak bare self-check (RISK-009 regressed)';
  END IF;
END $$;

-- 2. The join helper must exist with the expected hardening.
DO $$
DECLARE
  fn_oid oid;
  fn_secdef boolean;
  fn_argtypes text;
  fn_config text[];
BEGIN
  SELECT p.oid, p.prosecdef, pg_get_function_identity_arguments(p.oid), p.proconfig
    INTO fn_oid, fn_secdef, fn_argtypes, fn_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'can_current_user_join_thread';

  IF fn_oid IS NULL THEN
    RAISE EXCEPTION 'can_current_user_join_thread() is missing';
  END IF;
  IF NOT fn_secdef THEN
    RAISE EXCEPTION 'can_current_user_join_thread() is not SECURITY DEFINER';
  END IF;
  IF fn_argtypes <> 'p_thread_id uuid, p_role text' THEN
    RAISE EXCEPTION 'can_current_user_join_thread() must take (p_thread_id uuid, p_role text) (got %)', fn_argtypes;
  END IF;
  IF fn_config IS NULL
     OR NOT ('search_path=' = ANY(fn_config) OR 'search_path=""' = ANY(fn_config)) THEN
    RAISE EXCEPTION 'can_current_user_join_thread() must SET search_path = '''' (got %)', fn_config;
  END IF;
  IF has_function_privilege('public', fn_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'PUBLIC must NOT have EXECUTE on can_current_user_join_thread()';
  END IF;
  IF NOT has_function_privilege('authenticated', fn_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must have EXECUTE on can_current_user_join_thread()';
  END IF;
END $$;

-- 3. support_messages INSERT must pin sender_type (anti-spoofing).
DO $$
DECLARE
  pinned_count integer;
BEGIN
  SELECT count(*)
    INTO pinned_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'support_messages'
    AND cmd = 'INSERT'
    AND with_check LIKE '%sender_type%'
    AND with_check LIKE '%auth.uid()%';

  IF pinned_count = 0 THEN
    RAISE EXCEPTION 'support_messages INSERT does not pin sender_type/sender_id (spoofing possible)';
  END IF;
END $$;

-- 4. authenticated without a JWT (no auth.uid()) sees no participant rows.
BEGIN;
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM public.chat_participants;
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'authenticated without auth.uid() can see % chat_participants rows', visible_rows;
  END IF;
END $$;
ROLLBACK;
SQL

if [[ -n "$DATABASE_URL" ]]; then
  if ! command -v psql >/dev/null 2>&1; then
    echo "ERROR: psql is required for DATABASE_URL mode"
    exit 1
  fi

  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$sql_file"
else
  if [[ "$can_use_supabase_cli" -eq 0 ]]; then
    echo "ERROR: supabase CLI is required for SUPABASE_ACCESS_TOKEN mode"
    exit 1
  fi

  supabase db query --linked --file "$sql_file" >/tmp/check_chat_participants_rls.log
fi

echo "OK: chat_participants + support_messages RLS smoke test passed"
