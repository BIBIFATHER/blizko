-- Align remote nannies RLS with the sanitized public view strategy.
-- Raw public.nannies stays owner-only for SELECT.
-- Public discovery must go through public.nannies_public.

BEGIN;

DROP POLICY IF EXISTS "nannies_public_read" ON public.nannies;
DROP POLICY IF EXISTS "nannies_read_authenticated" ON public.nannies;

COMMIT;
