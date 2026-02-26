# War Mode Dashboard — Nanny Funnel

Last updated: 2026-02-26

Baseline (SQL from nannies payload):
- apply_submit today / 7d: 0 / 0
- triage_any today / 7d: 0 / 0
- approved today / 7d: 0 / 0
- profile_complete today / 7d: 0 / 0
- verified today / 7d: 0 / 0
- matched today / 7d: 0 / 0 (match_events table отсутствует)
- deal_done today / 7d: 0 / 0 (match_events table отсутствует)
- avg time-to-verification: 0

Biggest drop-off: apply → profile_complete (нет заявок)
Bottleneck: отсутствует входящий поток нянь (0 apply за 7д)

Next 24h actions:
1) Запустить минимум 5–10 входящих заявок (ручной онбординг/формы)
2) Проверить запись ключевых полей в payload (contact/documents/isVerified)
3) Определить источник match/deal_done (таблица/события) и создать хранение
