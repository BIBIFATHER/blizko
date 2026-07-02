-- BLI-139 / Plan C Task 7: fail-closed barrier for accounts in deletion.
-- Local migration only until the explicit production DDL gate.

BEGIN;

CREATE OR REPLACE FUNCTION public.account_in_deletion()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_deletions WHERE user_id = auth.uid()
  );
$$;

-- Supabase default function privileges grant EXECUTE directly to anon and
-- service_role, so revoking PUBLIC alone is insufficient.
REVOKE ALL ON FUNCTION public.account_in_deletion() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.account_in_deletion() TO authenticated;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'parents','nannies','bookings','booking_confirmations',
    'chat_threads','chat_messages','chat_participants',
    'support_tickets','support_messages','matching_outcomes'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      table_name || '_deletion_barrier', table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
       USING (NOT public.account_in_deletion())
       WITH CHECK (NOT public.account_in_deletion())',
      table_name || '_deletion_barrier', table_name
    );
  END LOOP;
END $$;

-- Exact postconditions: fail the transaction if helper, grants, RLS, policy
-- mode, roles, command or expressions differ from the contract.
DO $$
DECLARE
  expected_tables text[] := ARRAY[
    'parents','nannies','bookings','booking_confirmations',
    'chat_threads','chat_messages','chat_participants',
    'support_tickets','support_messages','matching_outcomes'
  ];
  fn_oid oid := to_regprocedure('public.account_in_deletion()');
BEGIN
  IF fn_oid IS NULL OR NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    WHERE p.oid = fn_oid
      AND p.prosecdef
      AND p.provolatile = 's'
      AND p.proconfig @> ARRAY['search_path=public']
  ) THEN
    RAISE EXCEPTION 'account_in_deletion helper contract mismatch';
  END IF;

  IF NOT has_function_privilege('authenticated', fn_oid, 'EXECUTE')
     OR has_function_privilege('anon', fn_oid, 'EXECUTE')
     OR EXISTS (
       SELECT 1
       FROM pg_proc p,
            LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
       WHERE p.oid = fn_oid
         AND acl.grantee = 0
         AND acl.privilege_type = 'EXECUTE'
     )
  THEN
    RAISE EXCEPTION 'account_in_deletion grants mismatch';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(expected_tables) expected(table_name)
    LEFT JOIN pg_class c
      ON c.oid = to_regclass(format('public.%I', expected.table_name))
    LEFT JOIN pg_policy policy
      ON policy.polrelid = c.oid
     AND policy.polname = expected.table_name || '_deletion_barrier'
    WHERE c.oid IS NULL
       OR NOT c.relrowsecurity
       OR policy.oid IS NULL
       OR policy.polpermissive
       OR policy.polcmd <> '*'
       OR policy.polroles IS DISTINCT FROM
          ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'authenticated')]
       OR COALESCE(pg_get_expr(policy.polqual, policy.polrelid), '')
            NOT LIKE '%NOT account_in_deletion()%'
       OR COALESCE(pg_get_expr(policy.polwithcheck, policy.polrelid), '')
            NOT LIKE '%NOT account_in_deletion()%'
  ) THEN
    RAISE EXCEPTION 'deletion barrier policy contract mismatch';
  END IF;
END $$;

COMMIT;
