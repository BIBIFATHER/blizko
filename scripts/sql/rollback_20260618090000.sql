-- Rollback / forward-fix runbook for
-- 20260618090000_bli124_harden_participant_and_support_insert.sql (BLI-124 / RISK-009).
--
-- Restores chat_participants + support_messages INSERT policies to their exact
-- pre-migration baseline definitions (00000000000000_remote_schema.sql l.751, l.669)
-- and drops the can_current_user_join_thread helper.
--
-- ⚠️ NOTE: this intentionally returns prod to the VULNERABLE pre-fix state
-- (chat_participants self-join into any thread; support_messages sender spoofing).
-- It is a clean revert to the prior known migration state, NOT a fix. Use only if
-- the new migration causes a worse regression that cannot be hot-fixed forward.
-- The real remedy is to keep the fix and forward-patch.
--
-- Forward-fix preference: if a defect is found in the helper or either policy
-- after apply, prefer a new dated migration that CREATE OR REPLACE / DROP+CREATE
-- the affected object rather than running this full revert, so the two closed
-- exploit paths are not reopened.
--
-- Postcondition checks below assert the revert actually landed.

BEGIN;

-- chat_participants: restore the bare self-check baseline policy.
DROP POLICY IF EXISTS "participants_insert_v2" ON public.chat_participants;
CREATE POLICY "participants_insert_v2"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- support_messages: restore the baseline ticket-ownership-only policy (PUBLIC target).
DROP POLICY IF EXISTS "messages_insert" ON public.support_messages;
CREATE POLICY "messages_insert"
ON public.support_messages
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = support_messages.ticket_id AND st.family_id = auth.uid()
  ))
  OR (auth.role() = 'service_role'::text)
);

-- Drop the join helper introduced by the migration.
DROP FUNCTION IF EXISTS public.can_current_user_join_thread(uuid, text);

-- ── Postconditions (exact) ───────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='chat_participants'
      AND policyname='participants_insert_v2' AND cmd='INSERT'
      AND with_check='(auth.uid() = user_id)'
  ) THEN
    RAISE EXCEPTION 'rollback: participants_insert_v2 not restored to baseline';
  END IF;

  -- support_messages must be back to the baseline PUBLIC-target, no sender pin.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='support_messages'
      AND policyname='messages_insert' AND cmd='INSERT'
      AND roles='{public}'
      AND with_check LIKE '%support_tickets%'
      AND with_check NOT LIKE '%sender_type%'
  ) THEN
    RAISE EXCEPTION 'rollback: messages_insert not restored to baseline PUBLIC target';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='can_current_user_join_thread'
  ) THEN
    RAISE EXCEPTION 'rollback: can_current_user_join_thread still present';
  END IF;
END $$;

COMMIT;
