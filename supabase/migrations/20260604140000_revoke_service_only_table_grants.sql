-- Security hardening (BLI-97): revoke client grants on service-only tables.
--
-- All public.* tables carry the default Supabase grants for anon/authenticated
-- and rely on RLS alone. These five tables are NEVER read by the browser client
-- (verified: zero supabase.from/.rpc/.channel references in src/), they are
-- written/read only server-side with the service key (which bypasses grants and
-- RLS). Removing the client grants is pure defense-in-depth — no app impact —
-- and removes them from the anon/authenticated API (GraphQL/REST) schema entirely.
--
-- Especially important for phone_otps (OTP codes): it should never be reachable
-- by a client role at the privilege layer, not just by policy.
--
-- Tables the client legitimately reads (parents/nannies own-row, bookings, chat_*,
-- matching_*) are intentionally left as-is, gated by RLS.

REVOKE ALL ON public.phone_otps        FROM anon, authenticated;
REVOKE ALL ON public.admin_actions     FROM anon, authenticated;
REVOKE ALL ON public.support_agents    FROM anon, authenticated;
REVOKE ALL ON public.analytics_events  FROM anon, authenticated;
REVOKE ALL ON public.referrals         FROM anon, authenticated;
