-- BLI-124 / RISK-009: harden chat_participants and support_messages INSERT.
--
-- DO NOT APPLY before BLI-121 (close open signups) is done + owner approval.
-- Apply only via `supabase db push --linked` per .context/CODEX_DB_CHANGE_PROTOCOL.md.
-- Synthetic-only now (owner accounts only) → not actively exploited, but this
-- closes two real prod RLS gaps that must be shut before any real users.
--
-- ── Gap 1: chat_participants self-join escalation ────────────────────────────
-- Current policy `participants_insert_v2` WITH CHECK (auth.uid() = user_id) lets
-- ANY authenticated user insert themselves as a participant of ANY thread (given
-- a thread_id). chat_messages SELECT then trusts chat_participants membership
-- (see 20260609000000) → the attacker reads another family's/nanny's chat.
--
-- Correct rule: a user may add ONLY themselves, and only into a thread they
-- legitimately belong to:
--   * role 'family'  → they are chat_threads.family_id;
--   * role 'nanny'   → they are chat_threads.nanny_id;
--   * role 'support' → they are a support agent on a support thread.
--
-- RLS trap (same class as the support_agents/chat_messages fix): chat_threads
-- SELECT policy `threads_select_v2` USING (auth.uid() = family_id) HIDES the
-- thread row from the nanny, so a plain EXISTS subquery on chat_threads run as
-- the nanny would find nothing and wrongly deny a legitimate self-join. We
-- therefore check membership in a SECURITY DEFINER helper that bypasses
-- chat_threads RLS, takes the row's own thread_id + claimed role, and returns a
-- narrow boolean. Hardening: STABLE, SET search_path = '' (every name schema-
-- qualified), REVOKE PUBLIC, GRANT EXECUTE to authenticated only.
--
-- ── Gap 2: support_messages sender spoofing ──────────────────────────────────
-- Current policy `messages_insert` only checks ticket ownership, not the sender
-- fields, so the ticket owner can insert any sender_type/sender_id (impersonate
-- ai_concierge / human_agent). Tighten: an authenticated client INSERT must be a
-- user message authored by itself (sender_type='user' AND sender_id=auth.uid());
-- ai_concierge / human_agent messages are written server-side via service_role.
--
-- One transaction: a failure rolls back helper, grants, and both policies.

BEGIN;

-- ── Helper: may the current user join p_thread_id in role p_role? ────────────
CREATE OR REPLACE FUNCTION public.can_current_user_join_thread(
  p_thread_id uuid,
  p_role text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    -- The designated family or nanny on the thread may add themselves in that
    -- role (family_id is set on both match and support threads; nanny_id only on
    -- match threads). NULL nanny_id fails closed. The nanny branch is pinned to
    -- type='match' so a future support thread that ever carried a nanny_id could
    -- not let that nanny self-join a support thread (defense-in-depth; no current
    -- code creates support threads with nanny_id).
    EXISTS (
      SELECT 1
      FROM public.chat_threads t
      WHERE t.id = p_thread_id
        AND (
          (p_role = 'family' AND t.family_id = auth.uid())
          OR (p_role = 'nanny' AND t.type = 'match' AND t.nanny_id = auth.uid())
        )
    )
    -- A support agent may add themselves as 'support' on a support thread.
    OR (
      p_role = 'support'
      AND public.can_current_user_access_support_thread(p_thread_id)
    );
$$;

REVOKE ALL ON FUNCTION public.can_current_user_join_thread(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_current_user_join_thread(uuid, text) TO authenticated;

-- ── Gap 1 fix: replace the weak chat_participants INSERT policy ───────────────
DROP POLICY IF EXISTS "participants_insert_v2" ON public.chat_participants;
CREATE POLICY "participants_insert_v2"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'service_role'
  OR (
    auth.uid() = user_id
    AND public.can_current_user_join_thread(chat_participants.thread_id, chat_participants.role)
  )
);

-- ── Gap 2 fix: replace the spoofable support_messages INSERT policy ───────────
-- Preserve ticket-ownership AND pin sender fields for the authenticated path;
-- keep the service_role branch for AI/agent messages.
DROP POLICY IF EXISTS "messages_insert" ON public.support_messages;
CREATE POLICY "messages_insert"
ON public.support_messages
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  OR (
    sender_type = 'user'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.support_tickets st
      WHERE st.id = support_messages.ticket_id
        AND st.family_id = auth.uid()
    )
  )
);

-- ── Postconditions (exact, not IF NOT EXISTS) ────────────────────────────────
DO $$
BEGIN
  -- chat_participants INSERT must no longer be the bare self-check.
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chat_participants'
      AND policyname = 'participants_insert_v2' AND cmd = 'INSERT'
      AND with_check = '(auth.uid() = user_id)'
  ) THEN
    RAISE EXCEPTION 'participants_insert_v2 still has the weak bare self-check';
  END IF;

  -- support_messages INSERT must reference sender_type pinning.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'support_messages'
      AND policyname = 'messages_insert' AND cmd = 'INSERT'
      AND with_check LIKE '%sender_type%'
  ) THEN
    RAISE EXCEPTION 'messages_insert did not pin sender_type';
  END IF;

  -- Helper must exist and be SECURITY DEFINER.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'can_current_user_join_thread'
      AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'can_current_user_join_thread missing or not SECURITY DEFINER';
  END IF;
END $$;

COMMIT;
