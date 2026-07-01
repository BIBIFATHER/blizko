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
