-- Реверс BLI-141 expand-миграции 20260630193000. Только что добавленное снимается.
-- ВНИМАНИЕ: безопасно ТОЛЬКО до adoption (Планы B-D ещё не писали данные).
ALTER TABLE public.booking_confirmations
  DROP COLUMN IF EXISTS recipient_role,
  DROP COLUMN IF EXISTS recipient_user_id;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_nanny_profile_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_idempotency_key_key;
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS idempotency_key,
  DROP COLUMN IF EXISTS idempotency_fingerprint,
  DROP COLUMN IF EXISTS nanny_profile_id,
  DROP COLUMN IF EXISTS parent_erased_at,
  DROP COLUMN IF EXISTS nanny_erased_at;

DROP TABLE IF EXISTS public.account_deletions;
