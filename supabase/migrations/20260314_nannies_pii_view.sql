-- ============================================
-- NANNIES PII REMEDIATION — Full Closure
-- Creates public-safe view for client SDK reads
-- APPLIED: 2026-03-14
-- ============================================

-- 1. Create nannies_public view — strips PII from payload
--    Removes: contact, documents, resumeNormalized
--    Keeps: id, name, photo, city, district, metro, experience, schedule,
--           expectedRate, childAges, skills, about, isVerified, softSkills,
--           videoIntro, video, reviews, riskProfile, isNannySharing, createdAt, type
CREATE OR REPLACE VIEW nannies_public AS
SELECT
  id,
  user_id,
  created_at,
  (payload - 'contact' - 'documents' - 'resumeNormalized') AS payload
FROM nannies;

-- 2. Grant SELECT on the view to authenticated users
GRANT SELECT ON nannies_public TO authenticated;

-- 3. Restrict raw nannies table: only owner can SELECT their own row
--    Drop the broad read policy and replace with owner-only
DROP POLICY IF EXISTS "nannies_read_authenticated" ON nannies;

-- Owner can read their own full profile (for profile editing)
CREATE POLICY "nannies_read_own" ON nannies
  FOR SELECT USING (auth.uid() = user_id);

-- Service role retains full read access (admin, matching engine)
-- (service_role bypasses RLS by default, no explicit policy needed)

-- 4. Verify: the view inherits the base table's RLS for writes,
--    but since it's a SELECT-only view with no INSTEAD OF triggers,
--    writes must go through the nannies table directly (which has
--    own-profile INSERT/UPDATE from Phase 1 migration).
