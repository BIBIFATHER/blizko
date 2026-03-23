# Supply-Side Nanny Research

_Prepared on March 17, 2026._

## 1. Executive Summary

Если смотреть на supply-side трезво, няни в первую очередь ищут не "красивый бренд", а:

- стабильный поток заказов
- понятные деньги
- безопасные семьи
- уважительное отношение
- прозрачные правила
- быструю и не унизительную верификацию

То есть supply-side в этой категории — это смесь job market и trust market.

Для Blizko это значит:

> няня приходит за доходом и предсказуемостью, а остаётся только если платформа даёт ей уважение, защиту и нормальный workflow.

## 2. Что хотят няни

### 2.1 Stable demand

Няне важно:

- не висеть без заказов
- не тратить время на пустые отклики
- понимать, что хорошие профили реально получают выходы

### 2.2 Clear economics

Няне важно:

- сколько комиссия
- когда деньги списываются
- кто платит комиссию
- есть ли скрытые платежи
- как платформа защищает от неоплаты / конфликтов

### 2.3 Family safety

Сupply-side trust — это не только проверка няни.

Няне тоже важно:

- кто семья
- безопасный ли это household
- есть ли support path при конфликте
- что делать, если семья нарушает договорённости

### 2.4 Flexible schedule with control

Няня не хочет "псевдо-гибкость", где:

- приходится отвечать всем
- график распадается
- условия меняются в последний момент

Она хочет:

- контролировать доступность
- понимать формат заказа заранее
- не ловить сюрпризы

### 2.5 Respect and reputation

Няня хочет, чтобы:

- опыт и специализация были видимы
- хорошие отзывы работали на неё
- платформа не ставила её в слабую позицию перед семьёй

## 3. Что обещают другие supply-side продукты

### Kidsout

Подаёт supply через:

- обучение
- проверку
- поддержку
- защищённую рабочую среду

Урок:

- няням нравится не только заработок, но и ощущение системы вокруг них

### Bubble

Сильны в:

- понятном mobile workflow
- проверке sitters
- ясной fee-коммуникации

Урок:

- fee transparency критична

### UrbanSitter

Сильны в:

- trust
- booking/payment loop
- repeat-friendly mechanics

Урок:

- если reputation and repeat work visible, supply side чувствует смысл оставаться

## 4. Что сейчас обещает Blizko

### 4.1 Хорошее

В [NannyLandingPage.tsx](/Users/anton/Desktop/blizko%203/src/components/NannyLandingPage.tsx) уже есть правильные мотиваторы:

- стабильный поток заказов
- честная комиссия
- гибкий график
- рейтинг и отзывы

### 4.2 Проблемное

Есть обещания, которые сейчас звучат сильнее, чем продукт доказал:

- "AI подбирает вам семьи, которые идеально совпадают"
- "Все семьи проходят проверку"
- "Поддержка 24/7"
- "Первый заказ — в течение 48 часов"

Это risky supply messaging, потому что:

- завышает ожидание
- может ударить по retention, если не выполняется
- делает платформу виноватой не только за UX, но и за обещанный outcome

### 4.3 Broken supply acquisition path

Сейчас dedicated supply landing имеет критический баг:

- обе главные CTA ведут на `/register?role=nanny`
- такого route нет в текущем приложении

То есть отдельный supply-entry path сейчас не просто слабый — он физически broken.

## 5. Current Supply Flow in Repo

### 5.1 Entry

- `/for-nannies` — отдельный landing page: [NannyLandingPage.tsx](/Users/anton/Desktop/blizko%203/src/components/NannyLandingPage.tsx)
- `/become-nanny` — форма регистрации/профиля: [App.tsx](/Users/anton/Desktop/blizko%203/App.tsx)

### 5.2 Form flow

Из [NannyFormProvider.tsx](/Users/anton/Desktop/blizko%203/src/components/forms/nanny/NannyFormProvider.tsx):

- 4 steps
- личные данные + локация
- опыт / о себе / ставка
- soft skills / trust layer
- документы / readiness

### 5.3 Friction points

1. Nominatim location lookup прямо в форме.  
   Для production это и policy risk, и fragile UX.

2. Contact field входит рано и хранится как raw contact.  
   Для supply это чувствительно.

3. Advanced settings стартуют с default values, а не с явно подтверждённых choices.  
   Это создаёт риск "форма уже решила за меня".

4. Верификация подаётся как protection, но supply-side process для семей пока не такой же сильный на уровне публичной упаковки.

5. Landing page обещает больше certainty, чем сам flow доказывает.

6. Экономическая история противоречива.  
   На landing page обещается `0 ₽`, отсутствие абонплаты и комиссия только после выхода, но дальше в profile flow появляется обязательный one-time payment `5 000 ₽` для начала работы. Это выглядит как bait-and-switch.

7. Verification messaging muddled.  
   В продукте одновременно живут:
   - обещания верификации через Госуслуги
   - временная недоступность этого шага
   - document verification как core readiness criterion

8. Post-submit state слишком optimistic.  
   После submit nanny видит не очень ясный moderation/review queue, а скорее success-style состояние, которое может создавать ложное ожидание немедленных заказов.

## 6. What Supply-Side Research Should Answer Next

Следующий правильный research block:

1. Где няни реально ищут заказы сейчас:
   - HH
   - Avito
   - Profi / Pomogatel / Kidsout / Telegram / рекомендации

2. Что для них red flags:
   - скрытые комиссии
   - конфликтные семьи
   - неоплата
   - плохая поддержка
   - слабая загрузка платформы

3. Что для них green flags:
   - понятная комиссия
   - реальные заказы
   - защита в конфликте
   - уважительное onboarding experience
   - честный rating/review system

4. Что важнее воронке supply:
   - speed to first response
   - time to verification
   - time to first job
   - repeat bookings

## 7. Decision for Blizko

### 7.1 What to keep

- говорить про честную комиссию
- говорить про reputation
- говорить про гибкость

### 7.2 What to tone down

- "идеально совпадают"
- "все семьи проверены"
- "24/7"
- "первый заказ за 48 часов" unless there is evidence
- любые обещания `0 ₽`, если дальше есть обязательный платёжный gate

### 7.3 Better supply-side framing

Вместо:

- "мы найдём идеальные семьи"

Лучше:

- "помогаем получать более понятные и подходящие заказы"
- "делаем условия и следующий шаг прозрачнее"
- "показываем trust-сигналы и помогаем в спорных ситуациях"

### 7.4 Tactical fixes before marketing spend

1. Починить CTA на `/for-nannies`
2. Привести supply pricing story к одной правде
3. Упростить post-submit explanation: review queue, SLA, first lead expectations
4. Ослабить hype и усилить operational honesty

## 8. Sources

- Kidsout babysitter page  
  <https://kidsout.ru/babysitter>
- Bubble fee structure  
  <https://intercom.help/bubble-childcare-app/en/articles/5863829-what-are-the-platform-fees>
- Bubble sitter verification  
  <https://intercom.help/bubble-childcare-app/en/articles/5863876-how-do-i-get-my-dbs-or-pvg-verified-by-bubble>
- UrbanSitter trust / caregiver environment  
  <https://www.urbansitter.com/trust/>
- Repo references:
  - [NannyLandingPage.tsx](/Users/anton/Desktop/blizko%203/src/components/NannyLandingPage.tsx)
  - [NannyFormProvider.tsx](/Users/anton/Desktop/blizko%203/src/components/forms/nanny/NannyFormProvider.tsx)
  - [App.tsx](/Users/anton/Desktop/blizko%203/App.tsx)
  - [ProfileTab.tsx](/Users/anton/Desktop/blizko%203/src/components/profile/ProfileTab.tsx)
  - [SuccessScreen.tsx](/Users/anton/Desktop/blizko%203/src/components/SuccessScreen.tsx)
  - [translations.ts](/Users/anton/Desktop/blizko%203/src/core/i18n/translations.ts)
