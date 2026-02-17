# ACCESS_RULES.md — Допуски и запреты

## Базовое правило (жёсткое)
- Любые изменения/настройки — **только после явного “да” от Антона**. Без исключений.

## Текущие допуски
### Агенты
- Доступ к локальному workspace: **/Users/anton/Desktop/blizko 3**
- Созданы агенты:
  - blizko-product (Product Lead)
  - blizko-tech (Tech/Architecture)
  - blizko-ops (Ops/Moderation)
  - blizko-recruiting (Recruiting/Onboarding)
  - aura-analyst (Oura Biohacking)
- Разрешён запуск subagents для: blizko-product, blizko-tech, blizko-ops, blizko-recruiting, aura-analyst.

### Навыки (skills)
- Включены в UI: web-search, session-logs, codex-cli, github, tmux, model-usage, mcporter, oracle, summarize, nano-pdf.
- Закреплены за агентами:
  - Product Lead → web-search, session-logs
  - Tech/Architecture → codex-cli, github
  - Ops/Moderation → session-logs
  - Recruiting → web-search
  - Oura Analyst → нет закреплённых навыков (пока)

### Каналы
- Telegram: включён, DM policy = pairing.
- Отдельный бот Oura: **@bioantonbot** (подключение токена — pending).

## Запреты
- Нельзя отправлять ключи/токены в чат.
- Нельзя делать внешние действия без явного подтверждения.
- Нельзя менять конфиги/настройки без явного “да”.
- Нельзя писать себе промпты без разрешения Антона.
- Нельзя создавать новые cron‑задачи без “да”.
- Нельзя отправлять сообщения/рассылки вне текущего чата без “да”.
- Нельзя открывать браузер/внешние сайты без “да”.
- Нельзя менять/писать файлы вне /Users/anton/Desktop/blizko 3 без “да”.

## Открытые вопросы
- Подключение @bioantonbot (токен и чат назначения).
- Время ежедневного отчёта Oura.
