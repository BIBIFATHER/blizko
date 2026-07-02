-- Local/incident rollback for 20260702210000_bli139_deletion_write_barrier.sql.
-- Production rollback requires its own explicit owner-approved DDL gate.

BEGIN;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'parents','nannies','bookings','booking_confirmations',
    'chat_threads','chat_messages','chat_participants',
    'support_tickets','support_messages','matching_outcomes'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      table_name || '_deletion_barrier', table_name
    );
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.account_in_deletion();

DO $$
DECLARE
  expected_policies text[] := ARRAY[
    'parents_deletion_barrier','nannies_deletion_barrier','bookings_deletion_barrier',
    'booking_confirmations_deletion_barrier','chat_threads_deletion_barrier',
    'chat_messages_deletion_barrier','chat_participants_deletion_barrier',
    'support_tickets_deletion_barrier','support_messages_deletion_barrier',
    'matching_outcomes_deletion_barrier'
  ];
BEGIN
  IF to_regprocedure('public.account_in_deletion()') IS NOT NULL
     OR EXISTS (SELECT 1 FROM pg_policy WHERE polname = ANY(expected_policies))
  THEN
    RAISE EXCEPTION 'deletion barrier rollback incomplete';
  END IF;
END $$;

COMMIT;
