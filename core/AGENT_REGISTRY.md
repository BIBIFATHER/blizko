# AGENT REGISTRY (Canonical)

## Canon Path
- AGENT_PROFILES/agents/ — единственный источник профилей
- agents/*.prompt.md — legacy mirror (read-only)

## Agents (Stage 0)
- main — Founder/Dispatcher (no write)
- blizko-orchestrator — task routing + core/memory writes
- blizko-product — product/UX/roadmap
- blizko-ops — ops/SLA/deals
- blizko-tech — architecture/API/security
- blizko-recruiting — nanny quality/verification
- aura-analyst — metrics/KPI
- joe — design architect + tool proposals (no tool enable)
- blizko_growth_director — growth/marketing (Stage 0 only)

## Write Scope
- core/ + memory/ — only orchestrator
- domain folders — профильные агенты
- main — no repo writes
