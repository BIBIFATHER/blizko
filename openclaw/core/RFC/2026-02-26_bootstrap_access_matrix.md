# core/RFC/2026-02-26_bootstrap_access_matrix.md
# RFC: Bootstrap Access Matrix and Agent Zone Architecture

## Context
The system currently defines roles in documentation but lacks enforceable structural boundaries. Missing elements:
- No explicit zone folders
- No access matrix
- No executable agent profiles
- No write-conflict enforcement
- No RFC discipline for core changes

This creates drift risk and undefined write behavior.

---

## Decision
Implement:
1. Zone folders: agents/ product/ tech/ ops/ recruiting/ design/ trust/ growth/ core/RFC/
2. ACCESS_MATRIX.md as single source of truth
3. Agent profiles in agents/*.md
4. WRITE_CONFLICT_PROTOCOL
5. CORE_CHANGE_PROTOCOL (RFC discipline)
6. METRICS_BASELINE template

---

## Options Considered
Option A: Allow orchestrator to modify core directly. Rejected: high architecture drift risk.
Option B: RFC-only core modification + Founder approval + tech implementation. Chosen: maximizes control and prevents chaos.

---

## Risks
1. Initial setup overhead. Mitigation: one-time cost.
2. Agents ignoring boundaries. Mitigation: orchestrator enforcement + incident logging.
3. Slower iteration. Mitigation: fast-track RFC path for P0 items.

---

## Acceptance Criteria
System is considered structured when:
- All zone folders exist.
- ACCESS_MATRIX.md exists.
- Each agent has defined allowed/forbidden paths.
- WRITE_CONFLICT_PROTOCOL exists.
- CORE_CHANGE_PROTOCOL exists.
- METRICS_BASELINE exists.
- Snapshot updated after bootstrap.

---

## Implementation Plan
1. Create zone folders.
2. Create ACCESS_MATRIX.
3. Create agent profiles.
4. Create protocols.
5. Create RFC bootstrap file.
6. Update snapshot.
7. Add daily log entry.

---

## Files Touched
- core/ACCESS_MATRIX.md
- core/CORE_CHANGE_PROTOCOL.md
- core/WRITE_CONFLICT_PROTOCOL.md
- core/METRICS_BASELINE.md
- agents/*.md
- core/RFC/2026-02-26_bootstrap_access_matrix.md

---

## Rollback Plan
If bootstrap causes instability:
1. Restore previous snapshot.
2. Remove new folders.
3. Revert to documentation-only mode.
