# Blizko Operating Metrics

> Главный принцип: для Blizko недостаточно "набрать больше нянь". Рынок сломан потому, что родитель не может быстро отобрать действительно надежную и подходящую няню. Поэтому главная метрика supply — не объем, а **quality-approved supply**.

## 1. North Star

**North Star Metric:** `trusted_matches_started_per_week`

Определение:
- родитель создал заявку;
- система показала кандидатов;
- родитель открыл хотя бы один контактный флоу;
- кандидат относится к `quality-approved supply`.

Почему не MAU:
- MAU не отражает, решаем ли мы реальную боль рынка;
- клики без надежных нянь создают ложное ощущение роста;
- для Blizko важнее количество реальных доверительных стартов, чем трафик.

## 2. Три управляющих блока

### A. Supply Quality Acquisition

Вопрос:
можем ли мы стабильно приводить и отбирать **надежных** нянь, которых не страшно показывать семьям?

Ключевой тезис:
рынок страдает не от отсутствия анкет как таковых, а от отсутствия быстро проверяемого качества. Поэтому supply надо делить на:

- `raw_supply` — все пришедшие анкеты
- `reviewed_supply` — дошедшие до проверки
- `approved_supply` — прошедшие модерацию
- `quality_approved_supply` — прошедшие проверку и набравшие минимальный quality floor
- `active_quality_supply` — quality-approved няни, доступные к показу прямо сейчас

### B. Parent Conversion

Вопрос:
умеем ли мы превращать входящий спрос родителей в реальные заявки и просмотры сильных кандидатов?

Ключевой тезис:
форма родителя должна конвертировать не в "много заполнений", а в **качественные заявки**, по которым реально можно сделать match.

### C. Retention After First Match

Вопрос:
создаем ли мы ценность после первого мэтча, или всё разваливается на первом касании?

Ключевой тезис:
первый match — это не победа. Победа — когда после первого мэтча начинается повторяемое доверительное поведение: чат, бронь, повтор, возврат.

## 3. Dashboard: что смотреть каждую неделю

### A. Supply Quality Dashboard

#### Объем и конверсия

- `nanny_landing_views`
- `nanny_cta_clicks`
- `nanny_profile_started`
- `nanny_profile_submitted`
- `nanny_docs_uploaded`
- `nanny_review_started`
- `nanny_approved`
- `nanny_quality_approved`
- `nanny_active_quality_supply`

#### Качество

- `approval_rate = nanny_approved / nanny_profile_submitted`
- `quality_approval_rate = nanny_quality_approved / nanny_profile_submitted`
- `doc_completion_rate = nanny_docs_uploaded / nanny_profile_submitted`
- `quality_floor_pass_rate = nanny_quality_approved / nanny_approved`
- `median_quality_score`
- `share_of_supply_with_verified_docs`
- `share_of_supply_with_video`
- `share_of_supply_with_reviews_or_references`

#### Скорость

- `time_to_first_contact`
- `time_to_review`
- `time_to_approval`
- `time_to_quality_approval`

#### Реальный health-check

- `active_quality_supply_by_district`
- `active_quality_supply_by_child_age`
- `active_quality_supply_by_schedule_type`

Это критично, потому что "в базе 300 нянь" ничего не значит, если:
- в Хамовниках доступно 2;
- на младенцев доступна 1;
- на full-time нет никого.

### B. Parent Conversion Dashboard

- `landing_views`
- `find_nanny_clicks`
- `parent_form_started`
- `parent_form_progress_25`
- `parent_form_progress_50`
- `parent_form_progress_75`
- `parent_offer_opened`
- `parent_offer_accepted`
- `parent_form_submitted`
- `match_results_viewed`
- `nanny_card_clicked`
- `chat_opened_after_match`

Главные коэффициенты:

- `cta_to_form_start = parent_form_started / find_nanny_clicks`
- `form_completion_rate = parent_form_submitted / parent_form_started`
- `offer_accept_rate = parent_offer_accepted / parent_offer_opened`
- `match_view_rate = match_results_viewed / parent_form_submitted`
- `candidate_engagement_rate = nanny_card_clicked / match_results_viewed`
- `chat_open_rate = chat_opened_after_match / match_results_viewed`

Отдельно резать по срезам:

- mobile / desktop
- organic / direct / community / referral
- district
- first-time / returning

### C. Retention After First Match Dashboard

- `first_match_started`
- `first_chat_opened`
- `first_booking_created`
- `first_booking_completed`
- `repeat_booking_created_30d`
- `parent_returned_7d`
- `parent_returned_30d`
- `nanny_received_second_request_30d`
- `support_chat_opened_post_match`
- `complaint_or_rejection_after_match`

Главные коэффициенты:

- `match_to_chat = first_chat_opened / first_match_started`
- `chat_to_booking = first_booking_created / first_chat_opened`
- `booking_completion_rate = first_booking_completed / first_booking_created`
- `repeat_rate_30d = repeat_booking_created_30d / first_booking_completed`
- `parent_retention_30d = parent_returned_30d / first_match_started`
- `nanny_repeat_demand_30d = nanny_received_second_request_30d / quality_approved_supply`

## 4. Что считать "нормой" на вашей стадии

Это не market benchmark. Это pragmatic target range для раннего trust marketplace.

### Supply

- `nanny_profile_submitted / nanny_profile_started`: `35-55%`
- `doc_completion_rate`: `50-70%`
- `approval_rate`: `25-40%`
- `quality_approval_rate`: `10-25%`

Важно:
низкий `quality_approval_rate` сам по себе не плохо.
Для Blizko это может быть знаком дисциплины отбора.

Плохо другое:
- если `quality_approval_rate` низкий и при этом нет притока новых анкет;
- если approval высокий, но потом много жалоб и плохие повторы.

### Parent conversion

- `cta_to_form_start`: `40-65%`
- `form_completion_rate`: `20-40%`
- `offer_accept_rate`: `55-80%`
- `match_view_rate`: зависит от ликвидности supply, целиться хотя бы в `60%+`
- `chat_open_rate`: `25-45%`

### Retention

- `match_to_chat`: `30-50%`
- `chat_to_booking`: `15-30%`
- `repeat_rate_30d`: `20-35%`
- `parent_retention_30d`: `15-30%`

## 5. Reliability Scorecard для няни

Это самый важный слой для Blizko.

Каждую няню надо оценивать не только по "анкета заполнена", а по scorecard надежности:

- документы подтверждены
- контакт верифицирован
- видео/личная самопрезентация есть
- профиль заполнен без красных флагов
- прошла ручную модерацию
- релевантный опыт по возрасту ребенка
- адекватность коммуникации на этапе контакта
- скорость ответа
- отсутствие отказов по safety/trust причинам

Статусы:

- `raw`
- `screened`
- `approved`
- `quality_approved`
- `priority_supply`

`priority_supply` — это те, кого можно показывать в первую очередь, потому что они:
- надежны,
- быстро отвечают,
- не ломают ожидания семьи,
- дают лучший шанс на повтор.

## 6. Главные weekly questions

Каждую неделю Blizko должен отвечать на эти вопросы цифрами:

1. Стало ли у нас больше **quality-approved** нянь, а не просто больше анкет?
2. В каких районах и сценариях у нас пустота supply?
3. На каком шаге родители чаще всего выпадают из формы?
4. Какой процент заявок реально заканчивается выдачей хороших кандидатов?
5. Что происходит после первого мэтча: чат, бронь, повтор или тишина?
6. Какие няни дают лучший repeat outcome, и что у них общего?

## 7. Приоритет внедрения событий

### Сначала

- nanny supply funnel
- parent form funnel
- match result engagement
- chat open
- booking create / complete

### Потом

- quality score explanations
- moderation reasons taxonomy
- supply heatmap by district
- complaint tagging
- repeat outcome attribution by nanny segment

## 8. Главное управленческое правило

Для Blizko нельзя оптимизировать только рост supply или только рост parent leads.

Правильный порядок:

1. увеличить `quality-approved supply`
2. повысить конверсию родителя в заявку
3. повысить шанс, что первый match станет повторным поведением

Если этот порядок перевернуть, система начнет масштабировать недоверие.
