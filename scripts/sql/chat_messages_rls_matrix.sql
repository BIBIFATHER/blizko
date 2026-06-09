-- Positive/negative RLS matrix for chat_messages (BLI-97 × support-agent fix).
--
-- Self-contained: applies the fix (function + policies), seeds fixtures, exercises
-- every identity, then ROLLBACK — nothing is persisted, so it is safe to run against
-- prod or any linked database. Each scenario RAISE EXCEPTION on mismatch; the trailing
-- `matrix-ok` row is only reached if all assertions pass.
--
-- Scenarios:
--   s1 participant reads own (match) thread        => 1
--   s2 outsider reads that match thread            => 0
--   s3 support agent reads a support thread        => 1
--   s4 support agent reads a match thread          => 0
--   s5 anon reads chat_messages                    => 0
--   s6a outsider INSERT into match thread          => blocked
--   s6c support agent INSERT into support thread   => allowed
--   s7 authenticated direct SELECT support_agents  => permission denied (BLI-97 holds)

BEGIN;

CREATE OR REPLACE FUNCTION public.can_current_user_access_support_thread(p_thread_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.support_agents WHERE user_id = auth.uid())
     AND EXISTS (SELECT 1 FROM public.chat_threads WHERE id = p_thread_id AND type = 'support');
$fn$;
REVOKE ALL ON FUNCTION public.can_current_user_access_support_thread(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_current_user_access_support_thread(uuid) TO authenticated;

DROP POLICY IF EXISTS "chat_messages_select_participant" ON public.chat_messages;
CREATE POLICY "chat_messages_select_participant" ON public.chat_messages FOR SELECT TO authenticated
USING (
  auth.role() = 'service_role'
  OR EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.thread_id = chat_messages.thread_id AND p.user_id = auth.uid())
  OR public.can_current_user_access_support_thread(chat_messages.thread_id)
);
DROP POLICY IF EXISTS "chat_messages_insert_participant" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_participant" ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.role() = 'service_role'
  OR (sender_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.chat_participants p WHERE p.thread_id = chat_messages.thread_id AND p.user_id = auth.uid())
    OR public.can_current_user_access_support_thread(chat_messages.thread_id)
  ))
);

-- Fixtures (seeded as the migration role, which bypasses RLS).
INSERT INTO public.chat_threads(id, type, family_id) VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'match',   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'support', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.chat_participants(thread_id, user_id, role) VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'family');
INSERT INTO public.support_agents(user_id) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
INSERT INTO public.chat_messages(thread_id, sender_id, text) VALUES
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'hi-match'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'hi-support');

SET LOCAL ROLE authenticated;

-- s1 participant
SELECT set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);
DO $$ DECLARE c int; BEGIN SELECT count(*) INTO c FROM public.chat_messages WHERE thread_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'; IF c<>1 THEN RAISE EXCEPTION 's1 participant read own thread: expected 1 got %', c; END IF; END $$;

-- s2 outsider
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
DO $$ DECLARE c int; BEGIN SELECT count(*) INTO c FROM public.chat_messages WHERE thread_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'; IF c<>0 THEN RAISE EXCEPTION 's2 outsider read match thread: expected 0 got %', c; END IF; END $$;

-- s3 + s4 support agent
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true);
DO $$ DECLARE c int; BEGIN
  SELECT count(*) INTO c FROM public.chat_messages WHERE thread_id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'; IF c<>1 THEN RAISE EXCEPTION 's3 agent read support thread: expected 1 got %', c; END IF;
  SELECT count(*) INTO c FROM public.chat_messages WHERE thread_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'; IF c<>0 THEN RAISE EXCEPTION 's4 agent read match thread: expected 0 got %', c; END IF;
END $$;

-- s6a outsider INSERT must be blocked
SELECT set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
DO $$ BEGIN
  INSERT INTO public.chat_messages(thread_id, sender_id, text) VALUES('dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','x');
  RAISE EXCEPTION 's6a outsider INSERT into match thread succeeded — should be blocked';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

-- s6c support agent INSERT into support thread must be allowed
SELECT set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true);
DO $$ BEGIN
  INSERT INTO public.chat_messages(thread_id, sender_id, text) VALUES('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','cccccccc-cccc-4ccc-8ccc-cccccccccccc','agent-reply');
EXCEPTION WHEN others THEN RAISE EXCEPTION 's6c agent INSERT into support thread blocked: %', SQLERRM; END $$;

-- s7 direct support_agents read must stay denied (BLI-97)
DO $$ BEGIN
  PERFORM 1 FROM public.support_agents;
  RAISE EXCEPTION 's7 authenticated can read support_agents directly — BLI-97 regressed';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;

RESET ROLE;

-- s5 anon
SET LOCAL ROLE anon;
DO $$ DECLARE c int; BEGIN SELECT count(*) INTO c FROM public.chat_messages; IF c<>0 THEN RAISE EXCEPTION 's5 anon sees % chat_messages rows', c; END IF; END $$;
RESET ROLE;

SELECT 'matrix-ok' AS result;

ROLLBACK;
