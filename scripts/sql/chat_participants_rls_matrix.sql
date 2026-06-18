-- Positive/negative RLS matrix for BLI-124 / RISK-009
-- (chat_participants self-join hardening + support_messages anti-spoofing).
--
-- Self-contained: applies the fix (helper + both policies, identical to migration
-- 20260618090000), seeds fixtures, exercises every identity/role, then ROLLBACK —
-- nothing is persisted, so it is safe to run against prod or any linked database.
-- Each scenario RAISE EXCEPTION on mismatch; the trailing `matrix-ok` row is only
-- reached if all assertions pass.
--
-- chat_participants INSERT scenarios:
--   p1 family self-join own match thread              => allowed
--   p2 nanny  self-join own match thread (RLS-hidden) => allowed (DEFINER bypass)
--   p3 outsider self-join as 'family'                 => blocked
--   p4 outsider self-join as 'nanny'                  => blocked
--   p5 wrong role: family claims 'nanny'              => blocked
--   p6 nanny self-join thread with NULL nanny_id      => blocked (fail-closed)
--   p7 family inserts a row for another user_id       => blocked (auth.uid()<>user_id)
--   p8 support agent self-join support thread         => allowed
--   p9 non-agent self-join support thread as support  => blocked
-- support_messages INSERT scenarios:
--   m1 ticket owner posts sender_type='user' self     => allowed
--   m2 ticket owner spoofs sender_type='ai_concierge' => blocked
--   m3 ticket owner posts sender_id<>auth.uid()       => blocked
--   m4 outsider posts on a ticket it does not own      => blocked
--   m5 service_role posts ai_concierge (server path)   => allowed (bypass)

BEGIN;

-- ── Apply the fix inline (must mirror the migration) ─────────────────────────
CREATE OR REPLACE FUNCTION public.can_current_user_join_thread(p_thread_id uuid, p_role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT
    EXISTS (
      SELECT 1 FROM public.chat_threads t
      WHERE t.id = p_thread_id
        AND (
          (p_role = 'family' AND t.family_id = auth.uid())
          OR (p_role = 'nanny' AND t.type = 'match' AND t.nanny_id = auth.uid())
        )
    )
    OR (p_role = 'support' AND public.can_current_user_access_support_thread(p_thread_id));
$fn$;
REVOKE ALL ON FUNCTION public.can_current_user_join_thread(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_current_user_join_thread(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "participants_insert_v2" ON public.chat_participants;
CREATE POLICY "participants_insert_v2" ON public.chat_participants FOR INSERT TO authenticated
WITH CHECK (
  auth.role() = 'service_role'
  OR (auth.uid() = user_id AND public.can_current_user_join_thread(chat_participants.thread_id, chat_participants.role))
);

DROP POLICY IF EXISTS "messages_insert" ON public.support_messages;
CREATE POLICY "messages_insert" ON public.support_messages FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  OR (
    sender_type = 'user'
    AND sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = support_messages.ticket_id AND st.family_id = auth.uid())
  )
);

-- The support-agent helper must already exist (migration 20260609000000).
-- Seed fixtures as the migration role (bypasses RLS).
-- a=family, n=nanny, b=outsider, c=support agent.
INSERT INTO public.chat_threads(id, type, family_id, nanny_id) VALUES
  ('44444444-4444-4444-8444-444444444444', 'match',   '11111111-1111-4111-8111-111111111111', '77777777-7777-4777-8777-777777777777'),
  ('66666666-6666-4666-8666-666666666666', 'match',   '11111111-1111-4111-8111-111111111111', NULL),
  ('55555555-5555-4555-8555-555555555555', 'support', '11111111-1111-4111-8111-111111111111', NULL);
INSERT INTO public.support_agents(user_id) VALUES ('33333333-3333-4333-8333-333333333333');
INSERT INTO public.support_tickets(id, family_id) VALUES
  ('88888888-8888-4888-8888-888888888888', '11111111-1111-4111-8111-111111111111');

SET LOCAL ROLE authenticated;

-- p1 family self-join own match thread => allowed
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
DO $$ BEGIN
  INSERT INTO public.chat_participants(thread_id, user_id, role)
  VALUES ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','family');
EXCEPTION WHEN others THEN RAISE EXCEPTION 'p1 family self-join blocked: %', SQLERRM; END $$;

-- p5 wrong role: family claims 'nanny' => blocked
DO $$ BEGIN
  INSERT INTO public.chat_participants(thread_id, user_id, role)
  VALUES ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','nanny');
  RAISE EXCEPTION 'p5 family claiming nanny role succeeded — should be blocked';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- p7 family inserts a row for another user_id => blocked
DO $$ BEGIN
  INSERT INTO public.chat_participants(thread_id, user_id, role)
  VALUES ('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','nanny');
  RAISE EXCEPTION 'p7 inserting participant for another user succeeded — should be blocked';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- p2 nanny self-join own match thread (thread hidden from nanny by threads_select_v2) => allowed
SELECT set_config('request.jwt.claims', '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}', true);
DO $$ BEGIN
  INSERT INTO public.chat_participants(thread_id, user_id, role)
  VALUES ('44444444-4444-4444-8444-444444444444','77777777-7777-4777-8777-777777777777','nanny');
EXCEPTION WHEN others THEN RAISE EXCEPTION 'p2 nanny self-join blocked (DEFINER bypass failed): %', SQLERRM; END $$;

-- p6 nanny self-join thread with NULL nanny_id => blocked
DO $$ BEGIN
  INSERT INTO public.chat_participants(thread_id, user_id, role)
  VALUES ('66666666-6666-4666-8666-666666666666','77777777-7777-4777-8777-777777777777','nanny');
  RAISE EXCEPTION 'p6 nanny self-join into NULL-nanny thread succeeded — should be blocked';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- p3 + p4 outsider self-join match thread => blocked
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
DO $$ BEGIN
  INSERT INTO public.chat_participants(thread_id, user_id, role)
  VALUES ('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','family');
  RAISE EXCEPTION 'p3 outsider self-join as family succeeded — should be blocked';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
DO $$ BEGIN
  INSERT INTO public.chat_participants(thread_id, user_id, role)
  VALUES ('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','nanny');
  RAISE EXCEPTION 'p4 outsider self-join as nanny succeeded — should be blocked';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- p9 non-agent self-join support thread as 'support' => blocked
DO $$ BEGIN
  INSERT INTO public.chat_participants(thread_id, user_id, role)
  VALUES ('55555555-5555-4555-8555-555555555555','22222222-2222-4222-8222-222222222222','support');
  RAISE EXCEPTION 'p9 non-agent support self-join succeeded — should be blocked';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- p8 support agent self-join support thread => allowed
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}', true);
DO $$ BEGIN
  INSERT INTO public.chat_participants(thread_id, user_id, role)
  VALUES ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','support');
EXCEPTION WHEN others THEN RAISE EXCEPTION 'p8 support agent self-join blocked: %', SQLERRM; END $$;

-- m1 ticket owner posts a user message as self => allowed
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
DO $$ BEGIN
  INSERT INTO public.support_messages(ticket_id, sender_type, sender_id, text)
  VALUES ('88888888-8888-4888-8888-888888888888','user','11111111-1111-4111-8111-111111111111','hi');
EXCEPTION WHEN others THEN RAISE EXCEPTION 'm1 owner user-message blocked: %', SQLERRM; END $$;

-- m2 ticket owner spoofs ai_concierge => blocked
DO $$ BEGIN
  INSERT INTO public.support_messages(ticket_id, sender_type, sender_id, text)
  VALUES ('88888888-8888-4888-8888-888888888888','ai_concierge','11111111-1111-4111-8111-111111111111','fake-ai');
  RAISE EXCEPTION 'm2 owner spoofing ai_concierge succeeded — should be blocked';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- m3 ticket owner posts sender_id <> auth.uid() => blocked
DO $$ BEGIN
  INSERT INTO public.support_messages(ticket_id, sender_type, sender_id, text)
  VALUES ('88888888-8888-4888-8888-888888888888','user','22222222-2222-4222-8222-222222222222','spoof-sender');
  RAISE EXCEPTION 'm3 owner posting as another sender_id succeeded — should be blocked';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- m4 outsider posts on a ticket it does not own => blocked
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
DO $$ BEGIN
  INSERT INTO public.support_messages(ticket_id, sender_type, sender_id, text)
  VALUES ('88888888-8888-4888-8888-888888888888','user','22222222-2222-4222-8222-222222222222','intrude');
  RAISE EXCEPTION 'm4 outsider posting on a foreign ticket succeeded — should be blocked';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

RESET ROLE;

-- m5 service_role posts an ai_concierge message (server AI path) => allowed
SET LOCAL ROLE service_role;
DO $$ BEGIN
  INSERT INTO public.support_messages(ticket_id, sender_type, sender_id, text)
  VALUES ('88888888-8888-4888-8888-888888888888','ai_concierge',NULL,'ai-reply');
EXCEPTION WHEN others THEN RAISE EXCEPTION 'm5 service_role ai_concierge message blocked: %', SQLERRM; END $$;
RESET ROLE;

SELECT 'matrix-ok' AS result;

ROLLBACK;
