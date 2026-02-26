# RFC: Enforce Approved Content blocks for core changes

## Context
We had a core drift incident where core files were edited without an approved RFC. We fixed it by requiring the RFC to include exact “Approved content”. This should become a permanent rule to prevent ambiguity and repeated drift.

## Decision
Update core/CORE_CHANGE_PROTOCOL.md with a mandatory requirement:
- If an RFC changes any file under core/, the RFC MUST include an "Approved content" section with exact final text (or an exact canonical block reference).
- No core file edits are allowed without such an approved content definition.

## Options Considered
A) Keep RFC generic (“confirm text later”). Rejected: leads to ambiguity and uncontrolled edits.
B) Require exact Approved content. Chosen: prevents drift and makes approvals executable.

## Risks
- Slight overhead in RFC writing. Mitigation: templates + copy/paste.

## Acceptance Criteria
- core/CORE_CHANGE_PROTOCOL.md explicitly requires Approved content for core/ changes.
- Orchestrator enforces this rule and blocks execution otherwise.

## Implementation Plan
1) Create this RFC.
2) After APPROVED: blizko-tech applies the change to core/CORE_CHANGE_PROTOCOL.md.
3) Orchestrator updates current_wip and snapshot.

## Files Touched
- core/CORE_CHANGE_PROTOCOL.md

## Rollback Plan
Revert protocol change via git revert if needed.
