-- Rollback for 20260609000000_fix_chat_messages_support_agent_definer.sql.
--
-- Restores the chat_messages policies to their pre-fix definition (inline
-- support_agents reference, from 20260602153000) and drops the helper function.
--
-- NOTE: this intentionally returns prod to the BROKEN state (authenticated chat
-- access fails with permission denied on support_agents) — it is a clean revert to
-- the prior known migration state, not a fix. Use only if the new migration causes a
-- worse regression. The real remedy is to keep the fix.

BEGIN;

DROP POLICY IF EXISTS "chat_messages_select_participant" ON public.chat_messages;
CREATE POLICY "chat_messages_select_participant"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1 FROM public.chat_participants p
    WHERE p.thread_id = chat_messages.thread_id AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.support_agents sa
    JOIN public.chat_threads t ON t.id = chat_messages.thread_id
    WHERE sa.user_id = auth.uid() AND t.type = 'support'
  )
);

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
        SELECT 1 FROM public.chat_participants p
        WHERE p.thread_id = chat_messages.thread_id AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.support_agents sa
        JOIN public.chat_threads t ON t.id = chat_messages.thread_id
        WHERE sa.user_id = auth.uid() AND t.type = 'support'
      )
    )
  )
);

DROP FUNCTION IF EXISTS public.can_current_user_access_support_thread(uuid);

COMMIT;
