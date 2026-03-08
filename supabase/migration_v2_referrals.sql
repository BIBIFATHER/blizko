-- Blizko: Referral System Migration (Optimized)
-- Run in Supabase Dashboard → SQL Editor
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referrer_name TEXT NOT NULL,
    referred_email TEXT,
    referred_phone TEXT,
    code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'completed')),
    reward_given BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT has_contact_info CHECK (
        referred_email IS NOT NULL
        OR referred_phone IS NOT NULL
    )
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
-- UNIQUE constraint on code creates a B-tree index automatically, no need for separate idx_referrals_code
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
-- Referrer can see & manage own referrals
CREATE POLICY "referrals_owner" ON referrals FOR ALL USING (auth.uid() = referrer_id);