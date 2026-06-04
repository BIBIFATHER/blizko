-- Fix matching_weights / matching_insights 404 (BLI-64).
--
-- Root cause: both tables had RLS enabled with ONLY a service_role policy
-- (`weights_service_only`, `insights_service_only`) and no table-level GRANT
-- for anon/authenticated. The matching layer reads them CLIENT-SIDE via the
-- browser anon-key client:
--   - src/core/ai/matchingWeights.ts  → supabase.from('matching_weights')
--   - src/core/ai/insightsLoader.ts   → supabase.from('matching_insights')
-- With no privilege for the request role, PostgREST returns 404 ("relation not
-- exposed"), not an empty 200. The loaders silently fall back to DEFAULT_WEIGHTS
-- and empty insights, so the self-evolving / learned-insight layer was dead in
-- prod while flooding the console with 404s.
--
-- These tables hold NO PII: matching_weights = factor->weight floats,
-- matching_insights = anonymized aggregate insight strings. Read-only exposure
-- to clients is safe. WRITES stay service-role only (cron jobs use service key).

-- Read-only access for the client roles.
GRANT SELECT ON matching_weights TO anon, authenticated;
GRANT SELECT ON matching_insights TO anon, authenticated;

-- Add SELECT policies for client roles (writes remain covered only by the
-- existing service_role FOR ALL policy).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'matching_weights' AND policyname = 'weights_client_read'
  ) THEN
    CREATE POLICY "weights_client_read" ON matching_weights
      FOR SELECT TO anon, authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'matching_insights' AND policyname = 'insights_client_read'
  ) THEN
    CREATE POLICY "insights_client_read" ON matching_insights
      FOR SELECT TO anon, authenticated USING (active = true);
  END IF;
END $$;
