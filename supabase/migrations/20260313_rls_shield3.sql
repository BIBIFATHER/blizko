-- ============================================
-- SHIELD 3: Bulletproof RLS Policies for Blizko
-- Run this migration in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. NANNIES TABLE
-- Read: any authenticated user
-- Write: only service_role (admin API handles this)
-- ============================================
ALTER TABLE IF EXISTS nannies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "nannies_read_authenticated" ON nannies;
DROP POLICY IF EXISTS "nannies_admin_write" ON nannies;

-- Anyone authenticated can read nanny profiles
CREATE POLICY "nannies_read_authenticated" ON nannies
  FOR SELECT
  USING (true); -- Public read (nanny listing is the product)

-- Only service_role can write (API endpoints use service_role key)
CREATE POLICY "nannies_admin_write" ON nannies
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================
-- 2. PARENTS TABLE
-- Read own: authenticated user can see only their own data
-- Write own: authenticated user can modify only their own data
-- Admin: service_role can see/modify all
-- ============================================
ALTER TABLE IF EXISTS parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parents_own_read" ON parents;
DROP POLICY IF EXISTS "parents_own_write" ON parents;
DROP POLICY IF EXISTS "parents_admin_all" ON parents;

-- Parents can only see their own data
CREATE POLICY "parents_own_read" ON parents
  FOR SELECT
  USING (
    auth.uid()::text = id
    OR auth.role() = 'service_role'
  );

-- Parents can only modify their own data
CREATE POLICY "parents_own_write" ON parents
  FOR INSERT
  WITH CHECK (auth.uid()::text = id OR auth.role() = 'service_role');

CREATE POLICY "parents_own_update" ON parents
  FOR UPDATE
  USING (auth.uid()::text = id OR auth.role() = 'service_role');

CREATE POLICY "parents_own_delete" ON parents
  FOR DELETE
  USING (auth.uid()::text = id OR auth.role() = 'service_role');


-- ============================================
-- 3. SUPPORT_TICKETS TABLE
-- Users: see only own tickets
-- Admin/service_role: see all
-- ============================================
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_own_or_admin" ON support_tickets;
DROP POLICY IF EXISTS "tickets_insert_own" ON support_tickets;

CREATE POLICY "tickets_own_or_admin" ON support_tickets
  FOR SELECT
  USING (
    auth.uid()::text = user_id
    OR auth.role() = 'service_role'
  );

CREATE POLICY "tickets_insert_own" ON support_tickets
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id
    OR auth.role() = 'service_role'
  );

-- Update/delete only by service_role (admin)
CREATE POLICY "tickets_admin_modify" ON support_tickets
  FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "tickets_admin_delete" ON support_tickets
  FOR DELETE
  USING (auth.role() = 'service_role');


-- ============================================
-- 4. SUPPORT_MESSAGES TABLE
-- Users: see messages in own tickets only
-- Admin/service_role: see all
-- ============================================
ALTER TABLE IF EXISTS support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_own_ticket" ON support_messages;
DROP POLICY IF EXISTS "messages_insert" ON support_messages;

CREATE POLICY "messages_own_ticket" ON support_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id::text = support_messages.ticket_id::text
        AND st.user_id = auth.uid()::text
    )
    OR auth.role() = 'service_role'
  );

CREATE POLICY "messages_insert" ON support_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id::text = support_messages.ticket_id::text
        AND st.user_id = auth.uid()::text
    )
    OR auth.role() = 'service_role'
  );


-- ============================================
-- 5. PHONE_OTPS TABLE (rate limiting data)
-- Only service_role access (API endpoints)
-- ============================================
ALTER TABLE IF EXISTS phone_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "otps_service_only" ON phone_otps;

CREATE POLICY "otps_service_only" ON phone_otps
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================
-- 6. MATCHING_OUTCOMES TABLE (RLHF data)
-- Only service_role — admin/ML pipeline access
-- ============================================
ALTER TABLE IF EXISTS matching_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outcomes_service_only" ON matching_outcomes;

CREATE POLICY "outcomes_service_only" ON matching_outcomes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ============================================
-- VERIFICATION: List all RLS statuses
-- ============================================
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
