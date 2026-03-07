-- =============================================
-- Blizko: Schema Migration v1
-- Run in Supabase Dashboard → SQL Editor
-- =============================================
-- 1. Parents (заявки родителей)
CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 2. Nannies (профили нянь)
CREATE TABLE IF NOT EXISTS nannies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 3. Bookings (бронирования)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES auth.users(id),
    nanny_id UUID REFERENCES auth.users(id),
    request_id TEXT REFERENCES parents(id),
    date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'confirmed',
            'active',
            'completed',
            'cancelled'
        )
    ),
    amount TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 4. Booking Confirmations (T-24h подтверждения)
CREATE TABLE IF NOT EXISTS booking_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 't_24h',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'missed')),
    due_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 5. Chat Threads
CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'support' CHECK (type IN ('support', 'match')),
    family_id UUID REFERENCES auth.users(id),
    nanny_id UUID REFERENCES auth.users(id),
    match_id TEXT REFERENCES parents(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 6. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 7. Chat Participants
CREATE TABLE IF NOT EXISTS chat_participants (
    thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'family' CHECK (role IN ('family', 'nanny', 'admin')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (thread_id, user_id)
);
-- 8. Admin Actions (лог модерации)
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_parents_user ON parents(user_id);
CREATE INDEX IF NOT EXISTS idx_parents_status ON parents((payload->>'status'));
CREATE INDEX IF NOT EXISTS idx_nannies_user ON nannies(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_parent ON bookings(parent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_nanny ON bookings(nanny_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_booking_confirmations_booking ON booking_confirmations(booking_id);
-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE nannies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
-- Parents: owner can CRUD
CREATE POLICY "parents_owner" ON parents FOR ALL USING (auth.uid() = user_id);
-- Nannies: owner can CRUD
CREATE POLICY "nannies_owner" ON nannies FOR ALL USING (auth.uid() = user_id);
-- Nannies: everyone can read (for matching)
CREATE POLICY "nannies_public_read" ON nannies FOR
SELECT USING (true);
-- Bookings: parent or nanny can see their bookings
CREATE POLICY "bookings_participant" ON bookings FOR ALL USING (auth.uid() IN (parent_id, nanny_id));
-- Chat: participants can see threads
CREATE POLICY "chat_threads_participant" ON chat_threads FOR ALL USING (auth.uid() IN (family_id, nanny_id));
-- Chat messages: thread participants
CREATE POLICY "chat_messages_participant" ON chat_messages FOR ALL USING (
    thread_id IN (
        SELECT id
        FROM chat_threads
        WHERE auth.uid() IN (family_id, nanny_id)
    )
);
-- Chat participants: can see own
CREATE POLICY "chat_participants_self" ON chat_participants FOR ALL USING (auth.uid() = user_id);
-- Booking confirmations: booking participants
CREATE POLICY "confirmations_participant" ON booking_confirmations FOR ALL USING (
    booking_id IN (
        SELECT id
        FROM bookings
        WHERE auth.uid() IN (parent_id, nanny_id)
    )
);
-- Admin actions: admins only (via service role or custom claim)
CREATE POLICY "admin_actions_admin" ON admin_actions FOR ALL USING (
    (auth.jwt()->'user_metadata'->>'role') = 'admin'
);
-- =============================================
-- Updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER parents_updated_at BEFORE
UPDATE ON parents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER nannies_updated_at BEFORE
UPDATE ON nannies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- =============================================
-- Enable Realtime for chat
-- =============================================
ALTER PUBLICATION supabase_realtime
ADD TABLE chat_messages;