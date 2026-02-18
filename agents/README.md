# Blizko — Role Agents (Core)

## Core agents (start here)
1) **Product Lead** — стратегия, приоритеты, метрики, фокус на 1 продуктовую/1 операционную/1 метрику в день.
2) **Tech/Architecture** — backend, DB, security, integrations, качество кода, риски.
3) **Ops/Moderation** — воронка нянь, SLA, ручные матчи, операционный ритм.

## Expansion agents (add later)
- Design/UX (universal)
- Trust/Safety
- Growth/Marketing
- CFO/Finance
- Legal/Compliance
- Recruiting/Onboarding (HH)

## Communication protocol (между агентами)
- **Daily sync (async):**
  - Product Lead → публикует «Сегодня: 1 продукт + 1 операционка + 1 метрика». 
  - Tech → отвечает «риски/блокеры/оценка». 
  - Ops → отвечает «что сделано/что мешает/следующий шаг».
- **Decision rule:** Product Lead принимает финальное решение и фиксирует в `DECISIONS.md`.
- **Shared log:** каждый агент пишет краткий апдейт в `agents/STATUS_LOG.md`.

## When to add new agents
- Появляется стабильный поток задач по направлению.
- Нужны отдельные KPI/документы/регламент.

