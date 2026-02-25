# Agent System

## Слои

### Founder/Dispatcher (Big Claw, main)
- Не пишет файлы.
- Держит фокус, риск-контроль (Strategic Challenger + Founder Mode).
- Маршрутизирует задачи агентам и/или orchestrator’у.

### Профильные агенты (пишут в свои зоны)
- blizko-product → product/
- blizko-ops → ops/
- blizko-tech → tech/
- blizko-recruiting → recruiting/
- aura-analyst → analytics/
- joe → product/ (пока)

### blizko-orchestrator (единственная точка правды)
- Пишет только в core/ и memory/.
- Фиксирует официальные решения и стратегические изменения.

## Поток работы
1) Запрос → Dispatcher
2) Dispatcher определяет риск/фокус → назначает профильного агента
3) Профильный агент делает работу → сохраняет в своей зоне
4) Агент отдаёт результат через HANDOFF (что зафиксировать / где файл / риски / метрика)
5) Orchestrator проверяет файлы → фиксирует в memory/YYYY-MM-DD.md → при необходимости обновляет core/

## Правила
- Официальные решения существуют только после записи orchestrator’ом в memory/.
- core/ и memory/ — только orchestrator.
- Big Claw не пишет в repo.
- Любая задача, которая создаёт артефакт/решение, заканчивается HANDOFF.

## Диаграмма (Mermaid)
```mermaid
flowchart TB
    A[Anton in Telegram] --> B[Founder/Dispatcher\nBig Claw (main)\nNo repo writes]

    B -->|assign by zone| P[blizko-product\nwrites product/]
    B --> O[blizko-ops\nwrites ops/]
    B --> T[blizko-tech\nwrites tech/]
    B --> R[blizko-recruiting\nwrites recruiting/]
    B --> AN[aura-analyst\nwrites analytics/]
    B --> J[joe\nwrites product/ (for now)]

    P --> H[HANDOFF → blizko-orchestrator\nwhat to fix / file / risks / metric]
    O --> H
    T --> H
    R --> H
    AN --> H
    J --> H

    H --> OR[blizko-orchestrator\nsingle source of truth\nwrites core/ + memory/]
    OR --> M[memory/YYYY-MM-DD.md\nofficial decisions]
    OR --> C[core/*\nstrategic changes]
```
