-- ============================================
-- MATCHING EVOLUTION — Self-Evolving Infrastructure
-- Этап 0: Shadow Mode + Dynamic Weights
-- Этап 1: Insights RAG
-- APPLIED: 2026-03-14
-- ============================================

-- 1. Dynamic Weights Table (Bayesian weight storage)
CREATE TABLE IF NOT EXISTS matching_weights (
  factor TEXT PRIMARY KEY,
  weight FLOAT NOT NULL,
  prior_weight FLOAT NOT NULL,
  confidence FLOAT DEFAULT 0.5,
  sample_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with current hardcoded weights
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

-- 2. Learned Insights Table (RAG for System Prompt)
CREATE TABLE IF NOT EXISTS matching_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_text TEXT NOT NULL,
  segment TEXT DEFAULT 'all',
  correlation FLOAT,
  sample_count INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Extend matching_outcomes with shadow scoring columns
ALTER TABLE matching_outcomes ADD COLUMN IF NOT EXISTS
  heuristic_score FLOAT;
ALTER TABLE matching_outcomes ADD COLUMN IF NOT EXISTS
  shadow_score FLOAT;
ALTER TABLE matching_outcomes ADD COLUMN IF NOT EXISTS
  weight_snapshot JSONB;
ALTER TABLE matching_outcomes ADD COLUMN IF NOT EXISTS
  factors JSONB;
ALTER TABLE matching_outcomes ADD COLUMN IF NOT EXISTS
  explore_flag BOOLEAN DEFAULT false;

-- 4. RLS — service_role only for weights and insights
ALTER TABLE matching_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'matching_weights' AND policyname = 'weights_service_only'
  ) THEN
    CREATE POLICY "weights_service_only" ON matching_weights
      FOR ALL USING (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'matching_insights' AND policyname = 'insights_service_only'
  ) THEN
    CREATE POLICY "insights_service_only" ON matching_insights
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
