# core/WRITE_CONFLICT_PROTOCOL.md
# WRITE CONFLICT PROTOCOL

## Purpose
Guarantee “one zone — one writer” and avoid collisions.

## Hard rules
- Every executor writes only in its zone folder.
- No cross-zone edits.
- If a task requires touching another zone: create a REQUEST in memory/STATUS/current_wip.md.

## REQUEST format (in current_wip.md)
- Request ID: REQ-YYYYMMDD-###
- From agent:
- To agent:
- Target files:
- Reason:
- Proposed change summary:
- Priority: P0/P1/P2
- Deadline:
- Status: OPEN / IN_PROGRESS / DONE / BLOCKED

## Orchestrator duties
- Maintains the queue
- Assigns ownership
- Verifies no overlaps
- Triggers snapshots before risky changes

## Emergency stop
If any agent writes outside its zone:
- Orchestrator stops execution
- Creates incident note in memory/YYYY-MM-DD.md
- Requests Anton decision
