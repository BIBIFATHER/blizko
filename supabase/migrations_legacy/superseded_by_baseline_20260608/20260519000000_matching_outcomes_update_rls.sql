-- Allow parents to update their own matching_outcomes rows.
-- Required for recordMatchOutcome() upsert to succeed when a shadow row
-- (outcome=null) already exists from logShadowScores().
-- Without this policy, the upsert UPDATE silently fails (RLS rejects it).

CREATE POLICY "Parents can update their own matching outcomes"
  ON matching_outcomes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);
