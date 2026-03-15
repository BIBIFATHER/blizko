-- ЮKassa Payments Table

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_request_id UUID NULL, -- FK to parent_requests if they exist in DB
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'RUB' NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- pending, waiting_for_capture, succeeded, canceled
    yk_payment_id VARCHAR(255) NULL UNIQUE, -- YooKassa Payment ID
    metadata JSONB DEFAULT '{}'::jsonb, -- Store extra info (email, phone, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Optional, can be skipped if you manage auth via API keys in Vercel)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Only service_role can access payments (API uses pg pool with service credentials)
CREATE POLICY "payments_service_only" ON public.payments
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Index for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_payments_yk_id ON public.payments(yk_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_parent_req ON public.payments(parent_request_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
