# Russia SEO Intent Map — Nanny Search

_Prepared on March 17, 2026._

## 1. Executive Summary

Русский поисковый интент по теме нянь смешивает сразу четыре слоя:

1. **коммерческий поиск**  
   "найти няню", "няня москва", "подбор няни"
2. **доверие / проверка**  
   "как выбрать няню", "как проверить няню", "что спросить у няни"
3. **локальный поиск**  
   "няня ЦАО", "няня у метро", "няня рядом"
4. **формат услуги**  
   "няня на час", "няня с проживанием", "няня для грудничка", "срочно нужна няня"

Из этого следует:

- Blizko не может выиграть одной главной страницей
- нужен набор page templates под разные intent-кластеры
- сейчас главный SEO-блокер не отсутствие статей, а слишком тонкая архитектура public pages

## 2. Что видно по SERP-паттерну

По поисковым интентам на русском повторяются такие типы результатов:

### 2.1 Transactional

Примеры запросов:

- найти няню
- няня москва
- подбор няни
- няня для ребенка москва

Что обычно выигрывает в выдаче:

- маркетплейсы и каталоги
- агентства
- category pages крупных сервисов

### 2.2 Trust / research

Примеры запросов:

- как выбрать няню
- как проверить няню
- что спросить у няни

Что обычно выигрывает:

- editorial/how-to материалы
- родительские медиа
- trust explainers

### 2.3 Local long-tail

Примеры запросов:

- няня ЦАО
- няня у метро
- няня в районе

Что обычно выигрывает:

- локальные category pages
- агрегаторы с фильтрами
- страница услуги + город/район

### 2.4 Format-specific

Примеры запросов:

- няня на час
- няня на выходные
- няня с проживанием
- няня для грудничка
- срочно нужна няня

Что обычно выигрывает:

- отдельные service landings
- нишевые листинги
- агентства с конкретным оффером

## 3. Где Blizko сейчас

### 3.1 Что уже есть

Публичные acquisition-facing surfaces:

- `/` — главная: [Home.tsx](/Users/anton/Desktop/blizko%203/src/components/Home.tsx)
- `/how-we-verify` — trust explainer: [SeoPages.tsx](/Users/anton/Desktop/blizko%203/src/components/seo/SeoPages.tsx)
- `/humanity-plus` — AI/compatibility explainer: [SeoPages.tsx](/Users/anton/Desktop/blizko%203/src/components/seo/SeoPages.tsx)
- `/nanny/:slug` — public profile: [NannyPublicProfile.tsx](/Users/anton/Desktop/blizko%203/src/components/nanny/NannyPublicProfile.tsx)
- `/about`, `/safe-deal`, `/privacy`, `/oferta` — legal/public trust pages: [LegalPages.tsx](/Users/anton/Desktop/blizko%203/src/components/legal/LegalPages.tsx)

### 3.2 Главные проблемы

1. `/find-nanny` коммерчески важен, но `noindex`, при этом попадает в sitemap.  
   Смотри [App.tsx](/Users/anton/Desktop/blizko%203/App.tsx) и [sitemap.xml](/Users/anton/Desktop/blizko%203/public/sitemap.xml).

2. Главная не бьёт в search intent достаточно прямо.  
   H1 и hero сильнее как app/brand, чем как search landing: [Home.tsx](/Users/anton/Desktop/blizko%203/src/components/Home.tsx).

3. SEO-архитектура слишком узкая.  
   Сейчас есть только 2 explainer-style SEO pages, но нет city/use-case/locality/comparison templates.

4. Sitemap и legal routing несогласованы.  
   Есть смесь SPA routes и static pages: [AppFooter.tsx](/Users/anton/Desktop/blizko%203/src/components/app/AppFooter.tsx), [offer.html](/Users/anton/Desktop/blizko%203/public/offer.html), [privacy/index.html](/Users/anton/Desktop/blizko%203/public/privacy/index.html).

5. Meta/OG plumbing не доведён.  
   `og-image` по умолчанию бьётся в `/og-image.png`, которого нет: [SeoHead.tsx](/Users/anton/Desktop/blizko%203/src/components/seo/SeoHead.tsx), [index.html](/Users/anton/Desktop/blizko%203/index.html).

## 4. Какие page templates нужны

### Priority 1

**1. City-commercial landing**

Шаблон для:

- `няня в {городе}`
- `подбор няни в {городе}`

### Priority 2

**2. Service-intent landing**

Шаблон для:

- няня на час
- няня на выходные
- няня для грудничка
- няня с проживанием
- срочно нужна няня

### Priority 3

**3. Locality landing**

Шаблон для:

- районы
- метро
- городские long-tail запросы

### Priority 4

**4. Trust / pricing decision page**

Нужна одна сильная публичная страница, которая отвечает:

- как работает процесс
- что включено
- как устроена оплата
- что проверяется
- чего Blizko не обещает

### Priority 5

**5. Editorial guide template**

Для:

- как выбрать няню
- как проверить няню
- что спросить у няни
- как понять, что няня подходит семье

### Priority 6

**6. Public category / collection template**

Между landing page и individual profile нужна curated collection surface:

- "няни для грудничков"
- "няни с опытом от 5 лет"
- "няни в Москве"

## 5. What to Build First

Если резать по эффекту, а не по красоте:

1. одна сильная коммерческая главная
2. один trust/pricing page
3. один editorial template
4. один city landing template
5. один service landing template

## 6. Decision for Tomorrow

Редизайн не должен жить отдельно от SEO architecture.

Завтра в дизайне нужно заранее думать:

- как hero будет работать не только как бренд, но и как intent landing
- как trust rail станет reusable page section
- как из Home можно будет собрать city/service templates без полного редизайна каждой страницы

## 7. Sources

- Current repo SEO/routing audit via:
  - [App.tsx](/Users/anton/Desktop/blizko%203/App.tsx)
  - [Home.tsx](/Users/anton/Desktop/blizko%203/src/components/Home.tsx)
  - [SeoPages.tsx](/Users/anton/Desktop/blizko%203/src/components/seo/SeoPages.tsx)
  - [SeoHead.tsx](/Users/anton/Desktop/blizko%203/src/components/seo/SeoHead.tsx)
  - [LegalPages.tsx](/Users/anton/Desktop/blizko%203/src/components/legal/LegalPages.tsx)
  - [sitemap.xml](/Users/anton/Desktop/blizko%203/public/sitemap.xml)
  - [index.html](/Users/anton/Desktop/blizko%203/index.html)
- Earlier keyword direction in old internal strategy doc: [marketing-strategy.md](/Users/anton/Desktop/blizko%203/docs/marketing-strategy.md)

