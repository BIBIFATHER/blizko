-- URGENT prod fix: authenticated could not read/write chat_messages.
--
-- BLI-97 (20260604140000) ran `REVOKE ALL ON public.support_agents FROM
-- anon, authenticated` (defense-in-depth; clients never read the table directly).
-- But the chat_messages SELECT/INSERT policies (20260602153000) reference
-- public.support_agents inline via `EXISTS (SELECT 1 FROM public.support_agents ...)`.
-- Postgres checks table privileges for relations named in an RLS policy at PLAN
-- time, before any row is evaluated — so every `authenticated` read/write of
-- chat_messages failed with `42501: permission denied for table support_agents`
-- regardless of row count. Chat was broken in prod since BLI-97 (~2026-06-04).
--
-- Fix: move the whole support-agent branch into a SECURITY DEFINER helper that runs
-- as its owner. It must bypass RLS for TWO relations:
--   1. public.support_agents — to check membership (revoked from clients by BLI-97);
--   2. public.chat_threads    — a support agent is NOT a thread participant, so the
--      agent's own RLS on chat_threads would otherwise hide the support thread and
--      the membership check alone would never grant access.
-- The helper takes the row's own thread_id (a thread reference, never a user id) and
-- returns a narrow boolean. `authenticated` needs only EXECUTE on it — the BLI-97
-- REVOKE stays in place and clients still cannot read support_agents directly.
--
-- Hardening: SECURITY DEFINER, STABLE, SET search_path = '' (every object schema-
-- qualified), EXECUTE granted only to authenticated.
--
-- Whole migration is one transaction: if a policy fails, the function and grants
-- roll back too (no half-applied state).
BEGIN;

CREATE OR REPLACE FUNCTION public.can_current_user_access_support_thread(p_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_agents WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.chat_threads WHERE id = p_thread_id AND type = 'support'
  );
$$;

REVOKE ALL ON FUNCTION public.can_current_user_access_support_thread(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_current_user_access_support_thread(uuid) TO authenticated;

-- SELECT: thread participant, or a support agent on a support thread (via helper).
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
  OR public.can_current_user_access_support_thread(chat_messages.thread_id)
);

-- INSERT: sender must be the user, and either a participant or a support agent on a
-- support thread (via helper).
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
      OR public.can_current_user_access_support_thread(chat_messages.thread_id)
    )
  )
);

COMMIT;
