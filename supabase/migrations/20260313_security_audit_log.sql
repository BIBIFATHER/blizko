-- ============================================
-- Security Audit Log — tracks auth events
-- ============================================
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,       -- 'otp_sent', 'otp_verified', 'otp_failed', 'login', 'tma_validated', 'rate_limited'
    ip_address TEXT,
    phone TEXT,                     -- masked: +7***1234
    user_id TEXT,
    tma_user_id BIGINT,            -- Telegram user ID if from TMA
    details JSONB DEFAULT '{}',    -- extra context
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Only service_role can access (API writes via service key)
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_service_only" ON security_audit_log;
CREATE POLICY "audit_service_only" ON security_audit_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON security_audit_log(ip_address);
