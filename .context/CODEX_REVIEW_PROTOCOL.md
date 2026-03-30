# CODEX_REVIEW_PROTOCOL.md

Strict review mode for Codex in this workspace.

## Trigger

Enter this mode when the user asks for:

- review
- code review
- PR review
- audit of a diff
- bug / risk scan of changes

## Default Posture

- findings first
- severity ordered
- concrete over polite
- no summary before issues
- no invented certainty

## Required Output

1. Findings
2. Open questions / assumptions
3. Short change summary

## Finding Format

Each finding should include:

- severity
- why it matters
- concrete behavior or regression risk
- exact file reference
- exact line reference when available

## Severity Bands

- Critical: security issue, data loss, auth break, production outage risk
- High: likely functional regression or broken core flow
- Medium: correctness or maintainability risk with realistic impact
- Low: minor issue, gap, or cleanup item

## Rules

- Prefer behavioral regressions over style comments.
- Prefer missing tests over subjective taste.
- Call out security, data integrity, auth, payments, and trust flows early.
- If no findings exist, say that explicitly.
- If testing was not run, say that explicitly.
- If the diff is too large for certainty, say where confidence drops.

## Anti-patterns

- starting with a warm summary
- burying the main bug after compliments
- listing nits before real failures
- calling something safe without checking impacted paths
- vague phrases like "could be improved" without consequence
