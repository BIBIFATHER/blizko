# CHANGE CONTROL — Stage 0

## Rule
Любое изменение, влияющее на стратегию/экономику/канон/юридический риск → обязательно логируется в memory/DECISIONS/ и проходит через Orchestrator.

## Format (Decision)
- Problem
- Hypothesis
- Success Metric
- Risk
- Change Scope (file/area)
- Owner

## No-Go
- Изменение Stage без условий
- Активация frozen блоков до 10 deal_done
## Pre-commit requirement (Clean Git)
После любого governance/system change репозиторий должен быть в состоянии:
- git status --short → пусто (clean)

Если не clean:
1) Классифицировать изменения: Safe / Cache / Needs review
2) Сделать selective commit или git stash (с понятным названием), либо discard
3) Вернуться к clean status
