# Launch Metrics + Feedback Loop — v1 пилот

Что мерим в пилоте, чтобы учиться. Опирается на уже существующую телеметрию
(analytics events + `matching_outcomes` + cron-ы learning loop).

## Воронка (события уже трекаются)

| Этап | Событие |
|---|---|
| Заявка родителя | `form_submitted` (parent) |
| Shortlist показан | `matching_results_viewed` |
| Открыл кандидата | `match_profile_opened`, `nanny_card_clicked` |
| Контакт / чат | `chat_opened`, `share_clicked` |
| Бронь / договорённость | `booking_created` |

## Supply (предложение)

- Нянь: зарегистрировано / верифицировано / `nanny_ready_for_match`.
- % с загруженными документами (`document_uploaded`).

## Качество подбора

- **Match acceptance** — доля семей, выбравших кого-то из shortlist.
- **Time-to-shortlist** — заявка → выдача (SLA ≤ 24 ч).
- **Post-meeting feedback** — подошла / нет + причина (собирает куратор → `matching_outcomes`).

## Learning loop (инфра уже есть)

`matching_outcomes` + cron `update-matching-weights` (исходы → веса) + `ghosted-outcomes`.
Условие работы: куратор реально фиксирует исход после встречи — иначе loop пустой.

## Критерии успеха пилота (заполнить цифрами)

- N семей получили shortlist;
- M% дошли до первой встречи;
- качественная обратная связь по доверию (порог согласовать).

## Dashboard / source of truth

**Linear** (проект «Blizko v1 Public Pilot») — единый источник истины на первую неделю
пилота. Не плодим Notion/Sheets: воронка, исходы и решения живут в Linear.

- Feedback от семей/нянь → заводим в Linear **только если actionable** (баг, гэп, явная
  правка). Эмоции/контекст без действия — не тикеты.

## Weekly review (ритуал)

Раз в неделю (≈30 мин): смотрим воронку + `matching_outcomes`, отвечаем на 3 вопроса —
где отваливаются семьи, что улучшить в продукте, что в кураторском процессе. Итог —
1–3 actionable-тикета в Linear.

## Статус инструментации

- ✅ События **`shortlist_delivered`** и **`match_outcome_recorded`** добавлены и в проде
  (BLI-59) — acceptance и learning loop меряются напрямую.
- Канал post-meeting feedback — **Telegram** (резерв — почта); закреплено в
  `curator-operating-script.md`.
