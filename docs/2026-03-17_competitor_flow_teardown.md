# Competitor Flow Teardown for Blizko

_Prepared on March 17, 2026._

## 1. Executive Summary

У конкурентов и соседних продуктов повторяются три удачных flow-patterns:

1. **сразу показать, что именно получит пользователь**
2. **раньше показать trust и цену**
3. **не заставлять пользователя самому строить shortlist из десятков профилей**

Для Blizko это означает:

- Home должен продавать calmer workflow
- ParentForm должен раньше объяснять value + payment
- NannyPublicProfile должен быть proof-first, а не просто карточкой

## 2. Flow Patterns Worth Stealing

### 2.1 Kinside

Что работает:

- availability и operational clarity показываются рано
- продукт ощущается не "магическим", а очень конкретным
- trust идёт через process clarity, а не через hype

Что украсть:

- структура hero + process + trust rail
- concrete service facts ранним слоем
- calm premium визуальный язык

### 2.2 Care.com

Что работает:

- category familiarity
- мощная profile anatomy
- отдельные trust tools и decision-support surfaces

Что украсть:

- профиль как страница доказательств
- не только bio, но reviews / experience / context / trust signals

Что не красть:

- directory-first ощущение
- marketplace overload

### 2.3 UrbanSitter / Bambino / Bubble

Что работает:

- быстрый путь к действию
- social proof / network trust
- в-app booking and payment feel

Что украсть:

- скорость next step
- понятность fee path
- ясный мобильный CTA

### 2.4 Kidsout / YouHelp

Что работает:

- локальная trust-упаковка
- более конкретная подача проверок и operational support

Что украсть:

- local trust tone
- human support framing
- protection language без перегруза

## 3. Current Blizko Flow

### 3.1 Home

Сейчас:

- хороший спокойный hero
- уже нет жёсткого AI-hype
- есть trust chips и quick actions

Но:

- экран пока выглядит больше как app home, чем как search-intent landing
- value promise не полностью объясняет, что произойдёт после CTA
- trust-блоки ещё можно сильнее собрать в одну proof rail

Код:

- [Home.tsx](/Users/anton/Desktop/blizko%203/components/Home.tsx)

### 3.2 Parent form

Сейчас:

- форма содержит много полезных полей
- payment flow уже сделан аккуратнее

Но:

- value exchange показывается поздно
- форма всё ещё ощущается длинной и "всё в одном месте"
- пользователь заранее не чувствует структуру: что сейчас, что дальше, где shortlist, где payment, где auth

Код:

- [ParentForm.tsx](/Users/anton/Desktop/blizko%203/components/ParentForm.tsx)

### 3.2.1 Критический parent-flow разрыв

Сейчас у parent-side есть системный UX gap:

- новый acquisition path идёт через payment-first
- но сильный shortlist experience живёт в legacy `match-results` path

Итог:

- после оплаты пользователь попадает в generic success/home loop
- вместо ощущения "вот мои кандидаты"

Это один из самых важных UX-узлов на завтра.

### 3.3 Public nanny profile

Сейчас:

- profile уже вычищен после trust-fixes
- raw public contact убран

Но:

- нужен ещё более proof-first порядок секций
- trust markers должны быть суперпонятными
- "почему этот профиль в Blizko" должно читаться без усилия

Код:

- [NannyPublicProfile.tsx](/Users/anton/Desktop/blizko%203/components/nanny/NannyPublicProfile.tsx)

### 3.3.1 CTA mismatch

Сейчас momentum ломается дважды:

- в results CTA "Написать" по факту ведёт в public profile
- на самом profile главный CTA ведёт обратно в поиск похожей няни

То есть пользователь не движется по одному ясному action path.

## 4. Biggest Competitor-Inspired Improvements

### 4.1 Home

Сделать:

- один hero
- одну proof rail
- один короткий process section
- один trust section

Убрать:

- всё, что похоже на app dashboard language
- повторяющиеся micro-trust blocks

### 4.2 ParentForm

Сделать:

- 3-актную структуру
- earlier price/process explanation
- visible "what happens next"
- calmer checkout feel
- прямой paid-to-shortlist flow без возвращения в generic success/home

### 4.3 NannyPublicProfile

Сделать:

- hero -> trust markers -> fit summary -> reviews -> next step

Поднять выше:

- опыт
- сигналы поведения
- отзывы
- один явный следующий шаг вместо петли назад в поиск

### 4.4 For-nannies landing

Сейчас эта страница обещает слишком много:

- "AI подбирает вам семьи, которые идеально совпадают"
- "все семьи проходят проверку"
- "оператор всегда на связи 24/7"
- "первый заказ в течение 48 часов"

Это сильнее, чем текущая доказательная база продукта.

И ещё хуже: её основной CTA сейчас сломан, потому что ведёт на `/register?role=nanny`, которого нет в router.

Код:

- [NannyLandingPage.tsx](/Users/anton/Desktop/blizko%203/components/NannyLandingPage.tsx)

### 4.5 Support as concierge

Поддержка сейчас есть, но продуктово спрятана слишком глубоко:

- на home она скрыта за deep-dive path
- на form/results/profile нет сильного contextual assist CTA

У конкурентов и лучших reference products помощь пользователя не висит в background. Она появляется в момент сомнения.

## 5. Decision Implications

Если делать редизайн правильно:

- Home должен брать структуру у Kinside / One Medical
- ParentForm должен брать guided-flow ясность у Headway / Bubble-like checkout thinking
- NannyPublicProfile должен брать proof anatomy у Care.com / Kinside
- supply page нужно переписать с меньшим hype и большим operational honesty

## 6. Sources

- Kinside parents / flow references  
  <https://www.kinside.com/parents>  
  <https://kinsideconcierge.zendesk.com/hc/en-us/articles/38275936002331-How-to-search-for-child-care-on-Kinside>
- Care.com category / trust references  
  <https://www.care.com/>  
  <https://www.care.com/about/safety/background-checks/>
- UrbanSitter trust references  
  <https://www.urbansitter.com/trust/>
- Bubble app + fee / verification references  
  <https://apps.apple.com/us/app/bubble-find-childcare-now/id1089980698>  
  <https://intercom.help/bubble-childcare-app/en/articles/5863829-what-are-the-platform-fees>  
  <https://intercom.help/bubble-childcare-app/en/articles/5863876-how-do-i-get-my-dbs-or-pvg-verified-by-bubble>
- Kidsout references  
  <https://kidsout.ru/>  
  <https://kidsout.ru/babysitter>
- Repo references:
  - [Home.tsx](/Users/anton/Desktop/blizko%203/components/Home.tsx)
  - [ParentForm.tsx](/Users/anton/Desktop/blizko%203/components/ParentForm.tsx)
  - [NannyPublicProfile.tsx](/Users/anton/Desktop/blizko%203/components/nanny/NannyPublicProfile.tsx)
  - [NannyLandingPage.tsx](/Users/anton/Desktop/blizko%203/components/NannyLandingPage.tsx)
