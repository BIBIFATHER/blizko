-- Creating the AI-Native Support Engine Tables

-- 1. Support Tickets (Context & Sentiment Tracking)
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL, -- Reference to the parent
    nanny_id UUID, -- Contextual nanny (if the conversation is about a specific match)
    match_id UUID, -- Reference to the specific match outcome
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'human_escalated')),
    sentiment_score FLOAT DEFAULT 0.0, -- Tracks emotional state (-1.0 to 1.0)
    summary TEXT, -- AI-generated summary of the problem
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Support Messages (The actual dialogue)
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'ai_concierge', 'human_agent')),
    sender_id UUID, -- For user or human agent
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Turn on Row Level Security
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Policies for support_tickets
CREATE POLICY "tickets_insert" ON support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = family_id);
CREATE POLICY "tickets_select" ON support_tickets FOR SELECT TO authenticated USING (auth.uid() = family_id);

-- Policies for support_messages
CREATE POLICY "msg_insert" ON support_messages FOR INSERT TO authenticated WITH CHECK (true); -- User can insert
CREATE POLICY "msg_select" ON support_messages FOR SELECT TO authenticated USING (true); -- In a real app, join with support_tickets

-- Turn on realtime for admin panel
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
