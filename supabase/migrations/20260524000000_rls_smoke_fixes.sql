-- BLI-20: RLS smoke audit fixes
-- Findings:
--   1. nannies_public view: GRANT was only to `authenticated`, not `anon`.
--      Unauthenticated parents can't browse nannies — product breakage.
--   2. Recreate view with security_invoker = false (explicit) so the view
--      owner's permissions apply, not the calling role's RLS context.
--   3. analytics_events, admin_actions, payments — already service_role only ✅

BEGIN;

-- Fix 1: Grant anon read access to the public view (no PII).
GRANT SELECT ON public.nannies_public TO anon;

-- Fix 2: Recreate view with explicit security_invoker = false so the view
-- owner (postgres) handles the underlying table access, independent of the
-- calling role. This ensures anon + authenticated users see the same
-- PII-stripped rows without needing a raw-table SELECT policy.
CREATE OR REPLACE VIEW public.nannies_public
  WITH (security_invoker = false)
AS
SELECT
  id,
  user_id,
  created_at,
  (payload - 'contact' - 'documents' - 'resumeNormalized') AS payload
FROM public.nannies;

-- Re-apply grants after recreating the view.
GRANT SELECT ON public.nannies_public TO anon;
GRANT SELECT ON public.nannies_public TO authenticated;

-- Verify service-only tables have RLS enabled (idempotent).
ALTER TABLE IF EXISTS public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_actions     ENABLE ROW LEVEL SECURITY;

-- payments table (conditional — may not exist in all environments).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    EXECUTE 'ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

COMMIT;
