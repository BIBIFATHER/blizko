-- BLI-141 expand-фаза: аддитивный фундамент целостности booking.
-- ОБРАТИМО. Без NOT NULL/CHECK-активности booking-инвариантов (это План E contract).
-- account_deletions — service-only, поэтому RLS+REVOKE делаются здесь же.

-- 1. Durable deletion workflow (дизайн §3.1). user_id БЕЗ FK к auth.users —
--    строка переживает удаление identity (для reconciler/аудита).
CREATE TABLE IF NOT EXISTS public.account_deletions (
  user_id     uuid PRIMARY KEY,
  state       text NOT NULL DEFAULT 'deleting'
              CHECK (state IN ('deleting','db_done','deleted','failed')),
  attempts    int  NOT NULL DEFAULT 0,
  lease_until timestamptz,
  last_error  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_deletions OWNER TO postgres;

-- Service-only lockdown (как phone_otps): RLS + снять клиентские grants.
-- service_role сохраняет свои дефолтные grants и обходит ТОЛЬКО RLS (не grants);
-- сервер пишет через него. anon/authenticated: без grants и без policy → полный
-- deny на привилегийном уровне (не только политикой).
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletions FROM anon, authenticated;

-- 2. bookings — новые nullable-колонки (дизайн §2). Без NOT NULL (План E).
--    bookings — client-read под RLS (оставлена как есть в 20260604140000), новые
--    nullable-колонки не меняют её grant-модель; REVOKE тут не нужен.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS idempotency_key         text,
  ADD COLUMN IF NOT EXISTS idempotency_fingerprint text,
  ADD COLUMN IF NOT EXISTS nanny_profile_id        text,
  ADD COLUMN IF NOT EXISTS parent_erased_at        timestamptz,
  ADD COLUMN IF NOT EXISTS nanny_erased_at         timestamptz;

-- Named UNIQUE constraint (НЕ просто индекс) — имя bookings_idempotency_key_key
-- совпадает с §4 дизайна, на которое Plan B ветвится по SQLSTATE 23505 constraint_name.
-- NULL допускается множественно (глобальный ключ по non-null значениям).
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_idempotency_key_key UNIQUE (idempotency_key);

-- Провенанс выбора няни → nannies(id) ON DELETE SET NULL (не RESTRICT).
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_nanny_profile_id_fkey
  FOREIGN KEY (nanny_profile_id) REFERENCES public.nannies(id) ON DELETE SET NULL;

-- 3. booking_confirmations — явный адресат (дизайн §8). Nullable в expand;
--    CHECK(recipient_role IN ('family','nanny')) и backfill — План D/E.
ALTER TABLE public.booking_confirmations
  ADD COLUMN IF NOT EXISTS recipient_role    text,
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid;
