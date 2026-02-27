# Nanny Funnel Event Tracking — Stage 0 (Baseline)

## Goal
Define canonical events for nanny intake funnel + baseline export SQL.

## Funnel steps (v0)
1) apply_submit — application created
2) triage_started — ops touched application / status moved to triage
3) approved — approved for invite
4) invited — invite token created
5) profile_complete — required fields done (invite-only)
6) verified — trust checks passed
7) ready_now — availability active (optional)

## Canonical event names
- nanny_apply_submit
- nanny_triage_started
- nanny_status_changed
- nanny_approved
- nanny_invite_created
- nanny_profile_complete
- nanny_verified

## Event table schema (required)
Create table + RLS in: `tech/tracking/tracking_events.sql`.

## Baseline export (v1) — tracking_events
If `tracking_events` exists and has rows, use this canonical query:

```sql
WITH f AS (
  SELECT
    nanny_id,
    MIN(CASE WHEN event_name='nanny_apply_submit' THEN event_at END) AS apply_at,
    MIN(CASE WHEN event_name='nanny_triage_started' THEN event_at END) AS triage_at,
    MIN(CASE WHEN event_name='nanny_approved' THEN event_at END) AS approved_at,
    MIN(CASE WHEN event_name='nanny_profile_complete' THEN event_at END) AS profile_complete_at,
    MIN(CASE WHEN event_name='nanny_verified' THEN event_at END) AS verified_at,
    MIN(CASE WHEN event_name='nanny_matched' THEN event_at END) AS matched_at,
    MIN(CASE WHEN event_name='deal_done' THEN event_at END) AS deal_done_at
  FROM tracking_events
  GROUP BY 1
)
SELECT
  COUNT(*) FILTER (WHERE apply_at::date = current_date) AS apply_today,
  COUNT(*) FILTER (WHERE apply_at >= current_date - interval '7 days') AS apply_7d,
  COUNT(*) FILTER (WHERE triage_at IS NOT NULL AND triage_at::date = current_date) AS triage_today,
  COUNT(*) FILTER (WHERE triage_at IS NOT NULL AND triage_at >= current_date - interval '7 days') AS triage_7d,
  COUNT(*) FILTER (WHERE approved_at IS NOT NULL AND approved_at::date = current_date) AS approved_today,
  COUNT(*) FILTER (WHERE approved_at IS NOT NULL AND approved_at >= current_date - interval '7 days') AS approved_7d,
  COUNT(*) FILTER (WHERE profile_complete_at IS NOT NULL AND profile_complete_at::date = current_date) AS profile_complete_today,
  COUNT(*) FILTER (WHERE profile_complete_at IS NOT NULL AND profile_complete_at >= current_date - interval '7 days') AS profile_complete_7d,
  COUNT(*) FILTER (WHERE verified_at IS NOT NULL AND verified_at::date = current_date) AS verified_today,
  COUNT(*) FILTER (WHERE verified_at IS NOT NULL AND verified_at >= current_date - interval '7 days') AS verified_7d,
  COUNT(*) FILTER (WHERE matched_at IS NOT NULL AND matched_at::date = current_date) AS matched_today,
  COUNT(*) FILTER (WHERE matched_at IS NOT NULL AND matched_at >= current_date - interval '7 days') AS matched_7d,
  COUNT(*) FILTER (WHERE deal_done_at IS NOT NULL AND deal_done_at::date = current_date) AS deal_done_today,
  COUNT(*) FILTER (WHERE deal_done_at IS NOT NULL AND deal_done_at >= current_date - interval '7 days') AS deal_done_7d,
  AVG(verified_at - apply_at) FILTER (WHERE verified_at IS NOT NULL) AS avg_time_to_verification
FROM f;
```

## TEMP baseline (if tracking_events missing)
Use `tech/tracking/temp_baseline.sql` (from `nannies` payload + proxy fields).
