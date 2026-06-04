-- Infra tables originally created via the Supabase Dashboard with no prior repo SQL:
-- phone_otps (OTP auth) and support_agents (support desk roster).
--
-- They existed in prod but no migration created them, so a fresh `supabase db reset`
-- could not reproduce the prod schema (later migrations referencing them would fail).
-- Folded into the migration history for a self-contained, truthful history (BLI-94).
--
-- Schema captured verbatim from prod on 2026-06-04 (information_schema.columns,
-- pg_constraint, pg_policies). Placed before the prod_baseline so dependency order holds.
--
-- NOTE: client grants on phone_otps are revoked later by 20260604140000 (BLI-97);
-- the RLS/policies here reflect prod as originally created (pre-revoke).

CREATE TABLE IF NOT EXISTS phone_otps (
  phone        TEXT PRIMARY KEY,
  code         TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  sent_at      TIMESTAMPTZ NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  send_count   INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE phone_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny all" ON phone_otps;
CREATE POLICY "deny all" ON phone_otps
  FOR ALL
  USING (false);

DROP POLICY IF EXISTS "otps_service_only" ON phone_otps;
CREATE POLICY "otps_service_only" ON phone_otps
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS support_agents (
  user_id    UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_agents_select" ON support_agents;
CREATE POLICY "support_agents_select" ON support_agents
  FOR SELECT
  USING (user_id = auth.uid());
