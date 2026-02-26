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

## Baseline export (v0) — using current DB tables
If event table does not exist yet, compute baseline from:
- nanny_applications(status, created_at, source, city)
- nanny_invites(created_at)
(Adjust table/columns to actual schema.)

### SQL — daily counts by status (v0)
WITH base AS (
  SELECT
    date_trunc('day', created_at)::date AS day,
    count(*) AS apply_submit,
    count(*) FILTER (WHERE status='triage') AS triage,
    count(*) FILTER (WHERE status='approved') AS approved,
    count(*) FILTER (WHERE status='need_info') AS need_info,
    count(*) FILTER (WHERE status='rejected') AS rejected
  FROM nanny_applications
  GROUP BY 1
)
SELECT * FROM base ORDER BY day DESC;

### SQL — simple conversion (v0)
WITH d AS (
  SELECT
    date_trunc('day', created_at)::date AS day,
    count(*) AS apply_submit,
    count(*) FILTER (WHERE status IN ('triage','approved','need_info','rejected')) AS triaged_any,
    count(*) FILTER (WHERE status='approved') AS approved
  FROM nanny_applications
  GROUP BY 1
)
SELECT day, apply_submit, triaged_any, approved,
  CASE WHEN apply_submit>0 THEN round(approved::numeric/apply_submit, 4) END AS cr_apply_to_approved
FROM d ORDER BY day DESC;
