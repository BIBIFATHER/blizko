-- Create chat_threads table
CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create chat_participants table
CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Turn on Row Level Security
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_threads
CREATE POLICY "Users can create threads" ON chat_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = family_id);
CREATE POLICY "Users can view their threads" ON chat_threads FOR SELECT TO authenticated USING (auth.uid() = family_id);

-- Policies for chat_participants
CREATE POLICY "Users can insert participants" ON chat_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view participants" ON chat_participants FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Policies for chat_messages
-- Check if user is participant or family_id of the thread
CREATE POLICY "Users can insert messages" ON chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can view messages" ON chat_messages FOR SELECT TO authenticated USING (
    thread_id IN (
        SELECT id FROM chat_threads WHERE family_id = auth.uid()
    )
);

-- Realtime publication for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
