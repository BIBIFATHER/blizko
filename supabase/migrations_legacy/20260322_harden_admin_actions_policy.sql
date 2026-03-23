-- admin_actions is an internal audit table.
-- Never trust user_metadata for authorization because clients can influence it.

ALTER TABLE IF EXISTS admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_actions_admin" ON admin_actions;
DROP POLICY IF EXISTS "admin_actions_service_only" ON admin_actions;

CREATE POLICY "admin_actions_service_only" ON admin_actions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
