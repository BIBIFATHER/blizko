#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-}"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"

can_use_supabase_cli=0
if command -v supabase >/dev/null 2>&1 && [[ -f "supabase/.temp/project-ref" ]]; then
  can_use_supabase_cli=1
fi

if [[ -z "$DATABASE_URL" && -z "$SUPABASE_ACCESS_TOKEN" && "$can_use_supabase_cli" -eq 0 ]]; then
  cat <<'EOF'
Usage:
  DATABASE_URL="postgresql://..." bash scripts/check_chat_messages_rls.sh
  SUPABASE_ACCESS_TOKEN="<token>" bash scripts/check_chat_messages_rls.sh
  bash scripts/check_chat_messages_rls.sh

Required:
  DATABASE_URL, SUPABASE_ACCESS_TOKEN, or an already authenticated linked Supabase CLI

DATABASE_URL mode:
  The database user must be able to inspect pg_policies and SET ROLE anon/authenticated.

Supabase CLI mode:
  The repository must be linked with Supabase CLI (`supabase link`). In CI, pass
  SUPABASE_ACCESS_TOKEN. Locally, an existing Supabase CLI login is enough.

This catches regressions where chat_messages becomes visible outside thread participants.
EOF
  exit 1
fi

sql_file="$(mktemp)"
trap 'rm -f "$sql_file"' EXIT

cat > "$sql_file" <<'SQL'
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

-- The support-agent branch of the chat_messages policy must run through the
-- SECURITY DEFINER helper, otherwise authenticated cannot evaluate the policy
-- at all (permission denied on support_agents at plan time). Assert the helper
-- exists with the expected hardening.
DO $$
DECLARE
  fn_oid oid;
  fn_secdef boolean;
  fn_nargs integer;
  fn_argtypes text;
  fn_config text[];
BEGIN
  SELECT p.oid, p.prosecdef, p.pronargs, pg_get_function_identity_arguments(p.oid), p.proconfig
    INTO fn_oid, fn_secdef, fn_nargs, fn_argtypes, fn_config
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'can_current_user_access_support_thread';

  IF fn_oid IS NULL THEN
    RAISE EXCEPTION 'can_current_user_access_support_thread() is missing';
  END IF;
  IF NOT fn_secdef THEN
    RAISE EXCEPTION 'can_current_user_access_support_thread() is not SECURITY DEFINER';
  END IF;
  IF fn_nargs <> 1 OR fn_argtypes <> 'p_thread_id uuid' THEN
    RAISE EXCEPTION 'can_current_user_access_support_thread() must take exactly (p_thread_id uuid) (got %)', fn_argtypes;
  END IF;
  -- Postgres stores `SET search_path = ''` as either `search_path=` or
  -- `search_path=""` depending on version; accept both (both mean empty).
  IF fn_config IS NULL
     OR NOT ('search_path=' = ANY(fn_config) OR 'search_path=""' = ANY(fn_config)) THEN
    RAISE EXCEPTION 'can_current_user_access_support_thread() must SET search_path = '''' (got %)', fn_config;
  END IF;
  IF has_function_privilege('public', fn_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'PUBLIC must NOT have EXECUTE on can_current_user_access_support_thread()';
  END IF;
  IF NOT has_function_privilege('authenticated', fn_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must have EXECUTE on can_current_user_access_support_thread()';
  END IF;
END $$;

-- BLI-97 invariant must hold: client roles still cannot read support_agents
-- directly. The definer helper is the only sanctioned path.
BEGIN;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM 1 FROM public.support_agents;
  RAISE EXCEPTION 'authenticated can read support_agents directly — BLI-97 regressed';
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL; -- expected: REVOKE from BLI-97 still in effect
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

  supabase db query --linked --file "$sql_file" >/tmp/check_chat_messages_rls.log
fi

echo "OK: chat_messages RLS smoke test passed"
