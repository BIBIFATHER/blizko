-- Allow shadow scoring and interest signals to exist before a final outcome.
ALTER TABLE matching_outcomes
  ALTER COLUMN outcome DROP NOT NULL;

DELETE FROM matching_outcomes older
USING matching_outcomes newer
WHERE older.parent_id = newer.parent_id
  AND older.nanny_id = newer.nanny_id
  AND older.ctid < newer.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_matching_outcomes_parent_nanny_unique
  ON matching_outcomes(parent_id, nanny_id);
