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
-- Fix: move the support-agent membership check into a SECURITY DEFINER helper that
-- runs as its owner (which retains access to support_agents). The policies call the
-- helper instead of touching support_agents directly, so `authenticated` needs only
-- EXECUTE on the function — the BLI-97 REVOKE stays in place and clients still cannot
-- read support_agents directly.
--
-- Hardening: SET search_path = '' (no mutable search_path; every object is
-- schema-qualified), no arguments (always the current user — cannot probe arbitrary
-- UUIDs), STABLE, EXECUTE granted only to authenticated.

CREATE OR REPLACE FUNCTION public.is_current_user_support_agent()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.support_agents
    WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_support_agent() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_support_agent() TO authenticated;

BEGIN;

-- SELECT: thread participant, or a support agent inside a support thread.
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
  OR (
    public.is_current_user_support_agent()
    AND EXISTS (
      SELECT 1
      FROM public.chat_threads t
      WHERE t.id = chat_messages.thread_id
        AND t.type = 'support'
    )
  )
);

-- INSERT: sender must be the user, and either a participant or a support agent in a
-- support thread.
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
      OR (
        public.is_current_user_support_agent()
        AND EXISTS (
          SELECT 1
          FROM public.chat_threads t
          WHERE t.id = chat_messages.thread_id
            AND t.type = 'support'
        )
      )
    )
  )
);

COMMIT;
