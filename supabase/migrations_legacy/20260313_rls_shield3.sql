-- ============================================
-- SHIELD 3: Bulletproof RLS — all UUID columns
-- APPLIED: 2026-03-13
-- ============================================

-- 1. NANNIES
DROP POLICY IF EXISTS "nannies_owner" ON nannies;
DROP POLICY IF EXISTS "nannies_public_read" ON nannies;
DROP POLICY IF EXISTS "nannies_read_authenticated" ON nannies;
DROP POLICY IF EXISTS "nannies_admin_write" ON nannies;

CREATE POLICY "nannies_read_authenticated" ON nannies
  FOR SELECT USING (true);

CREATE POLICY "nannies_admin_write" ON nannies
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- 2. PARENTS (user_id = UUID FK → auth.users)
DROP POLICY IF EXISTS "parents_owner" ON parents;
DROP POLICY IF EXISTS "parents_own_read" ON parents;
DROP POLICY IF EXISTS "parents_own_write" ON parents;
DROP POLICY IF EXISTS "parents_own_update" ON parents;
DROP POLICY IF EXISTS "parents_own_delete" ON parents;

CREATE POLICY "parents_own_read" ON parents
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "parents_own_write" ON parents
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "parents_own_update" ON parents
  FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "parents_own_delete" ON parents
  FOR DELETE USING (auth.uid() = user_id OR auth.role() = 'service_role');


-- 3. SUPPORT_TICKETS (family_id = UUID)
DROP POLICY IF EXISTS "tickets_insert" ON support_tickets;
DROP POLICY IF EXISTS "tickets_select" ON support_tickets;
DROP POLICY IF EXISTS "tickets_own_or_admin" ON support_tickets;
DROP POLICY IF EXISTS "tickets_insert_own" ON support_tickets;
DROP POLICY IF EXISTS "tickets_admin_modify" ON support_tickets;
DROP POLICY IF EXISTS "tickets_admin_delete" ON support_tickets;

CREATE POLICY "tickets_own_or_admin" ON support_tickets
  FOR SELECT USING (auth.uid() = family_id OR auth.role() = 'service_role');

CREATE POLICY "tickets_insert_own" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = family_id OR auth.role() = 'service_role');

CREATE POLICY "tickets_admin_modify" ON support_tickets
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "tickets_admin_delete" ON support_tickets
  FOR DELETE USING (auth.role() = 'service_role');


-- 4. SUPPORT_MESSAGES (ticket_id = UUID FK)
DROP POLICY IF EXISTS "msg_insert" ON support_messages;
DROP POLICY IF EXISTS "msg_select" ON support_messages;
DROP POLICY IF EXISTS "messages_own_ticket" ON support_messages;
DROP POLICY IF EXISTS "messages_insert" ON support_messages;

CREATE POLICY "messages_own_ticket" ON support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = support_messages.ticket_id
        AND st.family_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "messages_insert" ON support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets st
      WHERE st.id = support_messages.ticket_id
        AND st.family_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );


-- 5. PHONE_OTPS
ALTER TABLE IF EXISTS phone_otps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "otps_service_only" ON phone_otps;

CREATE POLICY "otps_service_only" ON phone_otps
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- 6. MATCHING_OUTCOMES
ALTER TABLE IF EXISTS matching_outcomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "outcomes_service_only" ON matching_outcomes;

CREATE POLICY "outcomes_service_only" ON matching_outcomes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
