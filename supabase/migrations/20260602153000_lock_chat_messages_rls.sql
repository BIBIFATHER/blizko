-- Lock chat_messages RLS to actual thread participants.
--
-- Live Supabase audit on 2026-06-02 found that authenticated users could read
-- every row in public.chat_messages because the remote policy
-- messages_select_v2 used `USING (true)`.
--
-- This migration restores the intended trust boundary:
-- - a user can read/write a message only when they are a chat participant;
-- - support agents can read/write support-thread messages;
-- - service_role remains available for backend/admin jobs.

BEGIN;

ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_v2" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "support_messages_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_participant" ON public.chat_messages;

CREATE POLICY "chat_messages_select_participant"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1
    FROM public.chat_participants p
    WHERE p.thread_id = chat_messages.thread_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.support_agents sa
    JOIN public.chat_threads t ON t.id = chat_messages.thread_id
    WHERE sa.user_id = auth.uid()
      AND t.type = 'support'
  )
);

DROP POLICY IF EXISTS "messages_insert_v2" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "support_messages_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert_participant" ON public.chat_messages;

CREATE POLICY "chat_messages_insert_participant"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'service_role'
  OR (
    sender_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.chat_participants p
        WHERE p.thread_id = chat_messages.thread_id
          AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.support_agents sa
        JOIN public.chat_threads t ON t.id = chat_messages.thread_id
        WHERE sa.user_id = auth.uid()
          AND t.type = 'support'
      )
    )
  )
);

COMMIT;
