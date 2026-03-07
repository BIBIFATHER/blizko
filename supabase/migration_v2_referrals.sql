-- Blizko: Referral System Migration
-- Run in Supabase Dashboard → SQL Editor
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES auth.users(id),
    referrer_name TEXT,
    referred_email TEXT,
    referred_phone TEXT,
    code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'completed')),
    reward_given BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
-- Referrer can see own referrals
CREATE POLICY "referrals_owner" ON referrals FOR ALL USING (auth.uid() = referrer_id);