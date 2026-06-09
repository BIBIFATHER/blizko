-- Add display_position to matching_outcomes.
-- Records the 1-based position of the candidate in the list shown to the parent
-- (after ε-greedy reordering). Required for propensity estimation and to measure
-- whether wildcard candidates at position 3 get comparable engagement to
-- exploit candidates at the same position.

ALTER TABLE matching_outcomes
  ADD COLUMN IF NOT EXISTS display_position INTEGER;
