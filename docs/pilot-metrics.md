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

## Гэпы инструментации

- Нет явных событий **`shortlist_delivered`** (куратор выдал) и **`match_outcome_recorded`**
  (исход встречи) → acceptance и learning меряются косвенно. Заведено отдельной
  actionable-задачей в Linear.
- Канал post-meeting feedback не определён (см. curator-operating-script TODO).
