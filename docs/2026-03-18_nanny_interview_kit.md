# Nanny Interview Kit — Blizko

_Prepared on March 18, 2026._

## 1. Цель интервью

Понять:

- как няни реально ищут семьи и заказы
- что для них red flags у платформ
- когда onboarding feels worth it
- как они воспринимают verification, commission и platform support
- что заставляет их оставаться или уходить

## 2. Кого рекрутить

### Primary

- активные няни или ситтеры с реальным опытом
- искали заказы в последние 6-12 месяцев
- использовали 2+ канала поиска

### Best-fit сегменты

1. няни с повторяющимся спросом, которые могут сравнить платформы
2. няни, недавно начавшие искать заказы
3. няни, уходившие с платформ из-за плохого опыта

### Не брать в первую волну

- только офлайн-няни без digital search experience
- агентства вместо самих нянь
- кандидаты без реального опыта работы с семьями

## 3. Основные вопросы

1. Расскажите, как вы обычно ищете семьи или заказы сейчас.
2. Через какие каналы вы реально получаете лучшие заказы?
3. Что вас больше всего раздражает в поиске новых семей?
4. Что заставляет вас доверять платформе или сервису?
5. Что для вас red flag в семье ещё до первого выхода?
6. Какую информацию о семье вы обязательно хотите видеть заранее?
7. Что вы думаете об анкетах, где нужно сразу загружать фото, документы, длинное описание и проходить тесты?
8. В какой момент верификация кажется вам оправданной, а в какой — лишней?
9. Как вы относитесь к комиссиям платформ: что для вас честно, а что нет?
10. Как вы реагируете на upfront fee / платёж до первого заказа?
11. Что для вас важнее: много лидов или меньше, но более подходящие семьи?
12. Что должно произойти после регистрации, чтобы вы не бросили сервис через 1-2 дня?
13. Если возникает конфликт с семьёй, какую роль должен играть сервис?
14. Что помогает вам понять, что платформа действительно приведёт к работе, а не просто соберёт анкету?
15. Из-за чего вы бы ушли с платформы, даже если сначала всё выглядело красиво?

## 4. Быстрые probing questions

- "Почему это для вас критично?"
- "А что было в прошлый раз?"
- "Что вы посчитали бы честным сценарием?"
- "Что должно случиться в первые 48 часов, чтобы вы поверили сервису?"
- "Что для вас важнее: безопасность, уважение, деньги, качество семей?"

## 5. Tagging Schema

- `acquisition_source`: `hh | avito | profi | kidsout | referral | telegram | repeat_families | agency`
- `core_motivation`: `income | stability | flexibility | safety | reputation | repeat_work`
- `economic_blocker`: `hidden_fee | upfront_fee | unclear_commission | low_order_volume | payout_risk`
- `trust_blocker`: `unsafe_family | no_platform_support | weak_family_info | fake_leads | no_protection_in_conflict`
- `onboarding_friction`: `too_long | too_invasive | too_early_docs | unclear_value | broken_route | weak_follow_up`
- `job_quality_preference`: `many_leads | curated_matches | repeat_families | local_only`
- `support_need`: `none | light | wanted_on_conflict | wanted_pre_booking`
- `verification_attitude`: `welcomes_it | okay_if_later | okay_if_explained | rejects_if_early`

## 6. Post-Interview Scorecard

Оцени по `1-5`:

- `income_pressure`
- `trust_sensitivity`
- `onboarding_tolerance`
- `need_for_platform_support`
- `desire_for_curated_matches`
- `willingness_to_verify`
- `fee_sensitivity`

Итоговые поля:

- `best_fit_for_blizko_supply_now`: `strong | medium | weak`
- `must_fix_before_scale`: свободный текст
- `single_biggest_reason_to_churn`: свободный текст

## 7. Hypotheses to Test

1. Няням важнее стабильность и нормальные семьи, чем "умный matching".
2. Upfront fee разрушает доверие раньше, чем успевает появиться ценность.
3. Curated demand ценнее, чем большой, но шумный поток лидов.
4. Ранний запрос документов и длинный onboarding допустим только если быстро объяснена ценность.
5. Няне нужен platform support в конфликте, а не только "чат помощи".
6. Supply-side лучше реагирует на honest economics, чем на hype about perfect matches.

## 8. What Answers Should Change Product Decisions

Если большинство нянь:

- резко против upfront fee  
  -> pricing story и activation gate надо пересматривать

- хотят видеть больше информации о семьях до отклика  
  -> усиливать family-side trust packaging

- готовы к verification, но не в самом начале  
  -> переносить часть friction позже по воронке

- предпочитают меньше, но качественнее заказы  
  -> усиливать curated demand story вместо quantity story

## 9. Related Product Surfaces

- [NannyLandingPage.tsx](/Users/anton/Desktop/blizko%203/src/components/NannyLandingPage.tsx)
- [NannyFormProvider.tsx](/Users/anton/Desktop/blizko%203/src/components/forms/nanny/NannyFormProvider.tsx)
- [ProfileTab.tsx](/Users/anton/Desktop/blizko%203/src/components/profile/ProfileTab.tsx)
- [SuccessScreen.tsx](/Users/anton/Desktop/blizko%203/src/components/SuccessScreen.tsx)
- [Supply Research](/Users/anton/Desktop/blizko%203/docs/2026-03-17_supply_side_nanny_research.md)

