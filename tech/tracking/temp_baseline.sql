-- TEMP baseline from existing tables (no tracking_events, no match_events)
-- Source table: public.nannies (payload JSON)

-- apply_submit today / 7d
SELECT
  COUNT(*) FILTER (WHERE created_at::date = current_date) AS apply_today,
  COUNT(*) FILTER (WHERE created_at >= current_date - interval '7 days') AS apply_7d
FROM nannies;

-- verified today / 7d (payload.isVerified)
SELECT
  COUNT(*) FILTER (WHERE (payload->>'isVerified')::boolean = true AND created_at::date = current_date) AS verified_today,
  COUNT(*) FILTER (WHERE (payload->>'isVerified')::boolean = true AND created_at >= current_date - interval '7 days') AS verified_7d
FROM nannies;

-- profile_complete proxy (documents + contact)
SELECT
  COUNT(*) FILTER (WHERE payload ? 'documents' AND payload ? 'contact' AND created_at::date = current_date) AS profile_complete_today,
  COUNT(*) FILTER (WHERE payload ? 'documents' AND payload ? 'contact' AND created_at >= current_date - interval '7 days') AS profile_complete_7d
FROM nannies;
