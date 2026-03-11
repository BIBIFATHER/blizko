-- RLHF feedback table for matching quality improvement
-- Migration: create_matching_outcomes
-- Date: 2026-03-11

CREATE TYPE matching_outcome_type AS ENUM ('hired', 'rejected', 'ghosted');

CREATE TABLE matching_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nanny_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outcome matching_outcome_type NOT NULL,
  feedback_text TEXT,
  score_at_match FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX idx_matching_outcomes_parent ON matching_outcomes(parent_id);
CREATE INDEX idx_matching_outcomes_nanny ON matching_outcomes(nanny_id);
CREATE INDEX idx_matching_outcomes_outcome ON matching_outcomes(outcome);
CREATE INDEX idx_matching_outcomes_created ON matching_outcomes(created_at);

-- RLS
ALTER TABLE matching_outcomes ENABLE ROW LEVEL SECURITY;

-- Parents can insert their own feedback
CREATE POLICY "Parents can insert own feedback"
  ON matching_outcomes FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- Parents can view their own feedback
CREATE POLICY "Parents can view own feedback"
  ON matching_outcomes FOR SELECT
  USING (auth.uid() = parent_id);

-- Nannies can view feedback about them
CREATE POLICY "Nannies can view feedback about them"
  ON matching_outcomes FOR SELECT
  USING (auth.uid() = nanny_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_matching_outcomes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_matching_outcomes_updated_at
  BEFORE UPDATE ON matching_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION update_matching_outcomes_updated_at();

COMMENT ON TABLE matching_outcomes IS 'RLHF feedback: outcome of parent-nanny matching for model training';
