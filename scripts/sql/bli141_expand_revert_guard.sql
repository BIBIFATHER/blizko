DO $$
BEGIN
  ASSERT (SELECT count(*) FROM information_schema.tables
          WHERE table_schema='public' AND table_name='account_deletions') = 0,
         'account_deletions still present after rollback';
  ASSERT (SELECT count(*) FROM information_schema.columns
          WHERE table_schema='public' AND table_name='bookings'
            AND column_name IN ('idempotency_key','idempotency_fingerprint',
                                 'nanny_profile_id','parent_erased_at','nanny_erased_at')) = 0,
         'bookings expand columns still present after rollback';
  ASSERT (SELECT count(*) FROM information_schema.columns
          WHERE table_schema='public' AND table_name='booking_confirmations'
            AND column_name IN ('recipient_role','recipient_user_id')) = 0,
         'confirmations recipient columns still present after rollback';
  RAISE NOTICE 'Revert guards passed';
END $$;
