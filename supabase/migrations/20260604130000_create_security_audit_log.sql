-- Create missing security_audit_log table in prod (BLI-94).
--
-- Prod reality (verified via MCP 2026-06-04): table does not exist
-- (to_regclass = null), yet it is actively written and read in prod:
--   - api/_audit.ts        -> POST /rest/v1/security_audit_log (auth/security events)
--   - api/data.ts          -> POST + SELECT (product analytics source, event_type product_*)
-- The writer is fire-and-forget with a silent .catch(), so every audit event in
-- prod was silently dropped (404), and the analytics path that reads from it was
-- partially broken. Defined only in migrations_legacy/20260313_security_audit_log.sql,
-- which was never applied to the prod migration history.
--
-- Schema copied verbatim from the legacy definition. Service-role only (the API
-- writes/reads with the service key); no client access — audit data is sensitive.

CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,       -- 'otp_sent', 'otp_verified', 'login', 'product_*', ...
    ip_address TEXT,
    phone TEXT,                     -- masked: +7***1234
    user_id TEXT,
    tma_user_id BIGINT,             -- Telegram user ID if from TMA
    details JSONB DEFAULT '{}',     -- extra context / analytics payload
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_service_only" ON security_audit_log;
CREATE POLICY "audit_service_only" ON security_audit_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_audit_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON security_audit_log(ip_address);

-- Sensitive data (IP, phone, user_id). The API writes/reads with the service key
-- (bypasses grants + RLS), so client roles need zero access. Revoke the default
-- public-schema grants so the table is not exposed in the anon/authenticated API
-- schema at all — defense in depth on top of the service_only RLS policy.
REVOKE ALL ON security_audit_log FROM anon, authenticated;
