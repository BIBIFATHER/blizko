# Claude/Codex SHA-bound workflow

`.context/AGENT_STATE.json` is the machine-readable source of truth for the
single active maker/reviewer loop. Git remains implementation truth; Linear is
the owner-facing mirror.

## State machine

`maker_active → review_requested → changes_requested | owner_gate`

- `maker_active`: only `maker` changes plans/product files.
- `review_requested`: artifact is frozen at `artifact_sha`; only `reviewer`
  reviews that SHA-bound diff.
- `changes_requested`: only `maker` folds the recorded verdict.
- `owner_gate`: no further implementation without explicit owner approval.

`review_round` may not exceed `max_review_rounds` (default 2). After two failed
rounds, stop and escalate the unresolved decision; do not start a polishing
loop.

## Required handoff

1. Maker commits the artifact.
2. Maker updates `AGENT_STATE.json` in a separate checkpoint:
   `phase=review_requested`, `next_actor=reviewer`, `artifact_sha=<artifact commit>`.
3. Reviewer runs only the review command. The command rejects stale branch,
   wrong actor, wrong phase, dirty tree, or non-context commits after the
   artifact SHA.
4. Reviewer writes a SHA-bound verdict to `.context/reviews/`, updates
   `AGENT_STATE.json`, `ACTIVE_TASK.md`, commits, pushes, and mirrors to Linear.
5. Rejected → `changes_requested/next_actor=maker`; Confirmed →
   `owner_gate/next_actor=owner`.

Never infer current work from chat summaries. Before acting run:

```bash
npm run agent:state
```

Reviewers may commit only `.context/ACTIVE_TASK.md`, `.context/AGENT_STATE.json`,
and `.context/reviews/**`. The Git hook enforces this when the previous committed
state names the reviewer as `next_actor`.
