# Write Policy (Blizko)

## Зоны записи
- core/*, memory/* — пишет только orchestrator (agent: main / Big Claw)
- product/* — пишет blizko-product
- ops/* — пишет blizko-ops
- archive/recruiting/* — пишет blizko-recruiting
- archive/tech/* — пишет blizko-tech
- archive/analytics/* — пишет aura-analyst
- archive/design/* (если появится) — пишет joe

## Процесс сохранения
Любой агент сохраняет результат в своей зоне и заканчивает блоком:

## HANDOFF
[HANDOFF → main]
Что зафиксировать в memory/core:
- ...
Риски/заметки:
- ...

Orchestrator (main) переносит решения в memory/YYYY-MM-DD.md и при необходимости обновляет core/*.
