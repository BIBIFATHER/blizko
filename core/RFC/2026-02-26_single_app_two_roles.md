# RFC: Single App — Role-Based Architecture (Family / Nanny)

## Context
Требуется закрепить архитектурное решение: единый продукт с двумя ролями (Family/Nanny) без отдельного приложения для нянь до валидации PMF. Нужно добавить блок решения, roadmap по Nanny Mode (MVP), а также KPI контроль.

## Decision
Внести в core/BLIZKO_MASTER_PLAN.md:
1) Architecture Decision — Single App, Two Roles
2) Roadmap блок Phase PMF — Nanny Role Mode
3) KPI контроль (Primary/Secondary) для Nanny Mode

## Options Considered
A) Separate nanny app now — отклонено (рост техдолга и сложность трекинга).
B) Single app, two roles — выбрано.

## Risks
- Рост сложности routing/flags → митигация: guard + feature flags.
- Перекос фокуса от сделок → митигация: KPI контроль и P0‑метрики.

## Acceptance Criteria
- В BLIZKO_MASTER_PLAN.md есть новый Architecture Decision.
- В Roadmap есть Phase PMF — Nanny Role Mode с deliverables.
- KPI блок добавлен.

## Implementation Plan
1) Добавить секции в BLIZKO_MASTER_PLAN.md согласно Approved content.
2) Обновить snapshot после применения.

## Files Touched
- core/BLIZKO_MASTER_PLAN.md

## Approved content

### core/BLIZKO_MASTER_PLAN.md (insert after North Star)
## Architecture Decision — Single App, Two Roles
Decision:
- Один backend
- Один frontend
- Role-based routing
- Feature flags
- Guarded routes
- No second nanny app until PMF validated

Justification:
- Снижение tech debt
- Централизованный tracking
- Упрощение growth
- Быстрее итерации

### core/BLIZKO_MASTER_PLAN.md (append in Roadmap section)
### Phase PMF — Nanny Role Mode
Deliverables:
**Product:**
- Nanny funnel mapping
- Nanny dashboard logic
- Status states (applied → verified → matched)

**Tech:**
- Role-based routing
- Route guards
- Feature flags system
- Event tracking:
  - nanny_registered
  - nanny_verified
  - nanny_profile_completed
  - nanny_matched
  - deal_done

**Design:**
- Nanny onboarding screens
- Nanny dashboard
- Status states
- Error states

**Trust:**
- Verification state logic
- Abuse risk modelling
- Escalation triggers

**Ops:**
- Manual review process
- SLA for nanny verification

**Growth:**
- Funnel metrics per stage
- Drop-off tracking

### core/BLIZKO_MASTER_PLAN.md (KPI control block)
**KPI control (Nanny Mode):**
Primary:
- nanny onboarding completion %
- verified nanny %
- matched %
- deal_done %

Secondary:
- time to verification
- drop-off per screen

## Rollback Plan
Удалить добавленные секции из BLIZKO_MASTER_PLAN.md.
