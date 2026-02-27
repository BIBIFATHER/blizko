# core/ACCESS_MATRIX.md
# ACCESS MATRIX — single source of truth

## Global principles
- main (Founder/Dispatcher) is the ONLY entry point for external requests. main is read-only and NEVER writes to the repo.
- blizko-orchestrator coordinates work, enforces boundaries, and maintains STATUS/memory. Orchestrator does NOT implement code/product docs directly.
- All sub-agents are executors. Each executor writes ONLY inside its own zone folder.
- Any change to core/* happens via RFC (proposal) -> Anton approval -> implementation by blizko-tech (or designated executor).

## Roles & write permissions
### main
- Read: all
- Write: NONE (no repo writes)

### blizko-orchestrator
- Read: all
- Write:
  - memory/STATUS/
  - memory/YYYY-MM-DD.md (daily log, by request)
  - core/RFC/ (proposals only)
- Forbidden:
  - direct edits to core/
  - writes into product/ tech/ ops/ recruiting/ design/ trust/

### blizko-product
- Write: product/
- Forbidden: core/, tech/, ops/, recruiting/, design/, trust/, memory/

### blizko-tech
- Write: tech/
- Forbidden: core/ (except applying approved RFC content when instructed), product/, ops/, recruiting/, design/, trust/, memory/

### blizko-ops
- Write: ops/
- Forbidden: core/, product/, tech/, recruiting/, design/, trust/, memory/

### blizko-recruiting
- Write: recruiting/
- Forbidden: core/, product/, tech/, ops/, design/, trust/, memory/

### blizko-design
- Write: design/
- Forbidden: core/, product/, tech/, ops/, recruiting/, trust/, memory/

### blizko-trust
- Write: trust/
- Forbidden: core/, product/, tech/, ops/, recruiting/, design/, memory/**

## Core change protocol (mandatory)
- Any proposal affecting core/* must be written as: core/RFC/YYYY-MM-DD_topic.md
- Each RFC includes: Context, Decision, Options, Risks, Acceptance Criteria, Implementation Plan, Files touched.
- Only Anton (via main) can approve an RFC.
- Only blizko-tech (or designated executor) applies approved changes.
- Every approved change must update memory/STATUS/current_wip.md and create a snapshot.

## Memory protocol
- Daily log: memory/YYYY-MM-DD.md (orchestrator writes; others propose updates via requests)
- Status: memory/STATUS/current_wip.md (orchestrator owns)
- Snapshots: memory/STATUS/system_snapshot_YYYY-MM-DD.md (orchestrator owns)
