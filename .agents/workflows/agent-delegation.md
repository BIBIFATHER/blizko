---
description: Orchestrate Blizko work through specialized agents instead of solving every non-trivial task in one stream.
---

# Agent Delegation Workflow

## Rule

Если задача нетривиальна, сначала разбей её по ролям и отдай работу агентам.

## Non-trivial task criteria

Делегация обязательна, если есть хотя бы одно:

- больше одного файла
- нужен и product, и code взгляд
- есть release / data / trust риск
- нужно одновременно спроектировать и реализовать
- нужна проверка после реализации

## Default execution pattern

1. `antigravity-orchestrator` определяет план
2. `product-lead` фиксирует scope и metric
3. `tech-arch` определяет technical path
4. `frontend-vibe-engineer` или `joe` делает UI/design slice
5. `trust-safety` проверяет риск, если задача чувствительная
6. `qa-release` валидирует
7. orchestrator собирает единый итог

## Fast lanes

- UI only -> `joe` + `frontend-vibe-engineer`
- backend/data only -> `tech-arch` + `qa-release`
- research only -> `research-analyst`
- growth only -> `blizko-growth-director`

## Output contract

Каждый агент должен вернуть:

- objective
- decision / result
- file or scope impact
- risk / blocker

Итог пользователю возвращает orchestrator.
