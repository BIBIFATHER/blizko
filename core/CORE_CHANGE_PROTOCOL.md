# core/CORE_CHANGE_PROTOCOL.md
# CORE CHANGE PROTOCOL (RFC)

## Goal
Prevent accidental drift of architecture, metrics, and operating rules.

## Rules
- No one edits core/* directly except blizko-tech applying an approved RFC.
- Any RFC that changes core/* MUST include an explicit Approved content block with exact final text (or canonical reference). Without it, no core edits are allowed.
- Orchestrator writes proposals ONLY in core/RFC/*.
- main (Anton) is the approver.

## RFC format
File: core/RFC/YYYY-MM-DD_topic.md
Must include:
1) Context (what problem we solve)
2) Decision (what we choose)
3) Options considered (at least 2)
4) Risks / mitigations
5) Acceptance criteria (how we verify)
6) Implementation plan (steps)
7) Files touched (exact paths)
8) Rollback plan
9) Approved content (required when RFC changes core/*): exact final text or canonical link to it

## Approval
- main replies: APPROVED / REJECTED / NEEDS CHANGES
- If approved: blizko-tech implements in its zone and applies changes.

## Logging
- Orchestrator updates:
  - memory/STATUS/current_wip.md
  - memory/STATUS/system_snapshot_YYYY-MM-DD.md
