# Parent Interview Kit — Blizko

_Prepared on March 17, 2026._

## 1. Цель интервью

Понять:

- как родители реально ищут няню сейчас
- где поиск превращается в хаос
- какие trust-сигналы для них реально работают
- когда они готовы платить сервису
- какой следующий шаг после shortlist для них естественный

## 2. Кого рекрутить

### Primary

- мама или dual-income семья
- Москва / крупный город
- искали няню в последние 12 месяцев
- не через одного знакомого человека, а через реальный поиск

### Best-fit сегменты для Blizko

1. впервые ищут няню
2. срочно заменяют текущую няню
3. уже пробовали классифайды / рекомендации / агентства и остались недовольны

### Не брать в первую волну

- семьи, которые всегда нанимают только по родственникам и не пойдут в digital flow
- семьи без реального недавнего search experience
- проф. recruiters / агентства вместо конечных родителей

## 3. Чего не делать на интервью

- не продавать Blizko
- не спрашивать "вам нравится идея?"
- не рассказывать заранее про AI
- не подталкивать к ответу про верификацию или оплату
- не превращать интервью в feature wishlist session

## 4. Основные вопросы

1. Расскажите про последний реальный поиск няни. С чего вы начали?
2. Где именно вы искали: рекомендации, чаты, Авито, агентства, сервисы?
3. Сколько разных вкладок, чатов или источников у вас было одновременно?
4. В какой момент поиска вы чувствовали наибольшую тревогу?
5. Что для вас первый сигнал "этому человеку можно доверять"?
6. Что для вас первый red flag в анкете или профиле?
7. Что для вас должно стоять за словами "проверена" или "верифицирована", чтобы вы реально поверили?
8. Как вы сейчас понимаете, что няня подходит именно вашей семье, а не просто "в целом нормальная"?
9. Если сервис покажет только 2-3 кандидата, что должно объяснить, почему выбрали именно их?
10. Сколько кандидатов вам комфортно видеть за один раз?
11. Что вы хотите увидеть до первого контакта: отзывы, опыт, цену, документы, стиль общения, доступность, что-то ещё?
12. В какой момент вам психологически нормально платить сервису?
13. Какие опасения у вас возникают вокруг оплаты?
14. Если няня отменит выход или пропадёт, что должен сделать сервис, чтобы вы не потеряли доверие?
15. Какой следующий шаг после хорошего профиля для вас самый естественный: написать, созвониться, получить мнение менеджера, увидеть сравнение, пробный выход?

## 5. Быстрые probing questions

Используй по ситуации:

- "Почему именно это вас напрягло?"
- "А как вы это проверяли?"
- "Что было самым неудобным?"
- "Что помогло бы принять решение быстрее?"
- "За что вы бы были готовы заплатить, а за что точно нет?"

## 6. Tagging Schema

- `entry_point`: `referral | classifieds | agency | marketplace | social | repeat_nanny`
- `search_friction`: `too_many_profiles | fragmented_channels | low_response | schedule_mismatch | unclear_next_step | weak_filters`
- `trust_blocker`: `stranger_at_home | unclear_verification | fake_profile_risk | no_show_risk | weak_reviews | no_platform_accountability`
- `proof_needed`: `reviews | manual_moderation | docs_check | references | repeat_bookings | response_speed | availability | fit_explanation | support_path`
- `shortlist_preference`: `catalog | 4_5_options | 2_3_curated | 1_best_pick`
- `payment_readiness`: `before_shortlist | after_shortlist | after_contact | after_trial | no_prepay`
- `decision_driver`: `trust | fit | availability | price | location | experience | platform_support`
- `support_need`: `none | optional | wanted_at_decision | wanted_on_failure`

## 7. Post-Interview Scorecard

Оцени по шкале `1-5`:

- `trust_pain`
- `search_chaos`
- `curated_shortlist_pull`
- `proof_sensitivity`
- `payment_trust_readiness`
- `human_support_need`
- `urgency`

Итоговые поля:

- `best_fit_for_blizko_now`: `strong | medium | weak`
- `must_show_before_payment`: свободный текст
- `single_biggest_blocker`: свободный текст

## 8. Hypotheses to Test

1. Родителю нужен shortlist, а не каталог.
2. "Верифицирована" без расшифровки не создаёт достаточного доверия.
3. Родитель хочет понять не только кто хорош, но и почему этот человек подходит именно его семье.
4. Оплата до shortlist психологически тяжёлая для многих.
5. Human support нужен в момент сомнения, а не только "если что-то сломалось".
6. Профиль работает лучше, если это страница доказательств, а не биография.
7. Next step после профиля должен быть один и понятный.
8. Родителю важнее не максимум выбора, а уменьшение хаоса.

## 9. What Answers Should Change Product Decisions

Если большинство родителей:

- хотят `2-3` кандидата, а не каталог  
  -> усиливать curated shortlist narrative

- не готовы платить до shortlist  
  -> усиливать proof-before-pay или менять payment timing/messaging

- не верят в generic verification  
  -> делать granular trust stack

- хотят help choosing  
  -> support/concierge должен стать частью main flow

- не понимают difference between good nanny and fit  
  -> усиливать explainability layer на results/profile

## 10. Related Product Surfaces

- [Home.tsx](/Users/anton/Desktop/blizko%203/components/Home.tsx)
- [ParentForm.tsx](/Users/anton/Desktop/blizko%203/components/ParentForm.tsx)
- [MatchResultsScreen.tsx](/Users/anton/Desktop/blizko%203/components/MatchResultsScreen.tsx)
- [NannyPublicProfile.tsx](/Users/anton/Desktop/blizko%203/components/nanny/NannyPublicProfile.tsx)
- [create.ts](/Users/anton/Desktop/blizko%203/api/payments/create.ts)
- [SuccessScreen.tsx](/Users/anton/Desktop/blizko%203/components/SuccessScreen.tsx)

