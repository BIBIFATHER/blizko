# WAR MODE DASHBOARD — Nanny Funnel (TEMP baseline)

Last updated: 2026-02-26
SQL: tech/tracking/temp_baseline.sql

Baseline (TEMP from nannies payload):
- apply_submit today / 7d: 0 / 0
- triage_any today / 7d: 0 / 0 (no status field in nannies)
- approved today / 7d: 0 / 0 (no status field in nannies)
- profile_complete today / 7d: 0 / 0
- verified today / 7d: 0 / 0
- matched today / 7d: 0 / 0 (match_events table отсутствует)
- deal_done today / 7d: 0 / 0 (match_events table отсутствует)
- avg time-to-verification: 0 (insufficient data)

Biggest drop-off: apply → profile_complete (нет заявок)
Friction hypothesis: отсутствует входящий поток нянь (0 apply за 7д)
