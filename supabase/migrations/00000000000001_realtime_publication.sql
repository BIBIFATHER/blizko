-- Realtime publication membership (not captured by `supabase db dump --schema public`).
-- Re-adds the tables the client subscribes to via supabase_realtime, so a clean
-- `supabase db reset` reproduces prod realtime behaviour. Idempotent per table.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chat_messages', 'support_tickets', 'support_messages']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
