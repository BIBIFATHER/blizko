-- Fix matching_weights / matching_insights 404 (BLI-64).
--
-- Prod reality (verified via MCP 2026-06-04): NEITHER table exists in prod.
--   to_regclass('public.matching_weights')  -> null
--   to_regclass('public.matching_insights') -> null
-- prod_baseline (20260322170000) is recorded as applied but these tables were
-- never actually created there — the local baseline.sql drifted from what ran.
-- PostgREST returns 404 for a missing relation, which is exactly the symptom.
--
-- The matching layer reads them CLIENT-SIDE via the browser anon-key client:
--   - src/core/ai/matchingWeights.ts  -> supabase.from('matching_weights')
--   - src/core/ai/insightsLoader.ts   -> supabase.from('matching_insights')
-- Loaders fall back to DEFAULT_WEIGHTS / empty insights on error, so matching
-- still returns results, but the self-evolving / learned-insight layer is dead.
--
-- This migration creates both tables (idempotent), seeds weights with the
-- current static defaults (day-1 behavior identical), enables RLS, keeps WRITES
-- service-role only (cron jobs use the service key), and grants READ-ONLY access
-- to the client roles. Both tables hold NO PII: weights = factor->weight floats,
-- insights = anonymized aggregate strings.

-- 1. Dynamic weights table (Bayesian weight storage)
CREATE TABLE IF NOT EXISTS matching_weights (
  factor TEXT PRIMARY KEY,
  weight FLOAT NOT NULL,
  prior_weight FLOAT NOT NULL,
  confidence FLOAT DEFAULT 0.5,
  sample_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with the current hardcoded weights (matches DEFAULT_WEIGHTS in
-- src/core/ai/matchingWeights.ts) so behavior is unchanged on day 1.
INSERT INTO matching_weights (factor, weight, prior_weight) VALUES
  ('base', 40, 40),
  ('verification', 12, 12),
  ('childAge', 10, 10),
  ('schedule', 6, 6),
  ('requirementMatch', 6, 6),
  ('mirrorMax', 18, 18),
  ('softSkillsMax', 8, 8),
  ('qualityPremium', 10, 10),
  ('qualityGood', 6, 6),
  ('nannySharing', 8, 8),
  ('familyStyleMatch', 10, 10),
  ('disciplineMatch', 6, 6),
  ('communicationMatch', 6, 6),
  ('stressResponseMatch', 6, 6),
  ('pcmMatch', 6, 6),
  ('growthPerNeed', 6, 6),
  ('growthMax', 12, 12)
ON CONFLICT (factor) DO NOTHING;

-- 2. Learned insights table (RAG for system prompt)
CREATE TABLE IF NOT EXISTS matching_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_text TEXT NOT NULL,
  segment TEXT DEFAULT 'all',
  correlation FLOAT,
  sample_count INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE matching_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Writes: service_role only (cron weight/insight updates).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'matching_weights' AND policyname = 'weights_service_only'
  ) THEN
    CREATE POLICY "weights_service_only" ON matching_weights
      FOR ALL USING (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'matching_insights' AND policyname = 'insights_service_only'
  ) THEN
    CREATE POLICY "insights_service_only" ON matching_insights
      FOR ALL USING (auth.role() = 'service_role');
  END IF;

  -- Reads: client roles (loaders run client-side under the anon key).
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

-- 4. Table-level privileges for the client roles (RLS still applies on top).
GRANT SELECT ON matching_weights TO anon, authenticated;
GRANT SELECT ON matching_insights TO anon, authenticated;
