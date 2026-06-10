-- Shadow scoring columns (BLI-98): restore the four columns shadowScoring.ts
-- upserts but that are missing from the authoritative baseline.
--
-- src/core/ai/shadowScoring.ts (_logShadowScoresAsync) upserts into
-- public.matching_outcomes with heuristic_score, factors, weight_snapshot and
-- explore_flag. None of these exist in the BLI-94 baseline
-- (00000000000000_remote_schema.sql), so the fire-and-forget upsert fails the
-- PostgREST schema-cache check in prod and is silently swallowed — shadow-scoring
-- telemetry never persists and the self-evolving matching loop (Этап 0) is dead.
--
-- This migration adds only those four columns. It does NOT touch
-- matching_outcome_type (the 'interested' enum gap is tracked separately in
-- BLI-100; the product decision is to keep interest as outcome = NULL with a
-- feedback_text interest_signal marker, not a new enum value).
--
-- All columns are nullable / defaulted, so the change is additive and safe:
--   * heuristic_score  — the raw heuristic score at impression time
--   * factors          — per-factor score breakdown (jsonb), read by the
--                        update-matching-weights cron
--   * weight_snapshot  — weights in effect at match time, filled in later by the
--                        weight-update cron (left NULL on insert)
--   * explore_flag     — true when the row is an ε-greedy wildcard impression
--
-- Apply to prod only via the deploy-gate (approve-gated) after release-gate.sh PASS.

ALTER TABLE public.matching_outcomes
  ADD COLUMN IF NOT EXISTS heuristic_score double precision,
  ADD COLUMN IF NOT EXISTS factors jsonb,
  ADD COLUMN IF NOT EXISTS weight_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS explore_flag boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.matching_outcomes.heuristic_score IS 'Raw heuristic score at impression time (shadow scoring, BLI-98).';
COMMENT ON COLUMN public.matching_outcomes.factors IS 'Per-factor score breakdown (jsonb) consumed by update-matching-weights cron (BLI-98).';
COMMENT ON COLUMN public.matching_outcomes.weight_snapshot IS 'Matching weights in effect at match time; filled by weight-update cron (BLI-98).';
COMMENT ON COLUMN public.matching_outcomes.explore_flag IS 'True when this impression was an ε-greedy wildcard (BLI-98).';
