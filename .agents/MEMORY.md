# Blizko — Контекст проекта (MEMORY)

Этот файл — долгосрочная память. Агент читает его в начале каждой сессии.

---

## Антон (основатель)
- Один фаундер, делает всё сам + AI-агенты
- Технический уровень: продвинутый пользователь, не разработчик
- Предпочитает работать в одном окне (не параллельные агенты)
- Основной рынок: Москва, Россия

## 🎯 Стратегический курс (обновлено 2026-03-13)
- **Primary Goal: Web Service & App Store / Google Play readiness**
- **Telegram: Вторичный маркетинговый канал** (уведомления, share-ссылки, бот)
- Пивот от TMA-first к Web-first: responsive layout, persistent nanny URLs, SSR

## Текущий статус продукта
- MVP запущен на blizko.app (Vercel)
- 22 тестовых профиля нянь в Supabase (seed)
- **150 реальных откликов от нянь на hh.ru — НЕ РАЗОБРАНЫ!**
- Matching Engine работает (Gemini AI)
- AI Concierge работает (Gemini 1.5-flash, sentiment tracking, Telegram эскалация) ✅
- Оплата НЕ подключена (ЮKassa — нет API key)
- **[STRATEGIC AI ROADMAP] Self-Evolving Matching Matrix:** Запланирован переход от статических Rules-based эвристик к Bayesian Weight Updating + RLHF (Multi-Armed Bandit, Vectors). Подробная архитектура сохранена в: `.agents/AI_MATCHING_ROADMAP.md`

## Аналитика
- Яндекс.Метрика: счётчик 107260431 ✅
- Яндекс.Вебмастер: верифицирован ✅
- PostHog: скрипт в index.html, но ключ placeholder (phc_REPLACE_ME) — пока не нужен

## Критические факты
- **НЕ рассылать маркетинг пока нет реальных нянь в базе!**
- 150 откликов hh.ru — главный приоритет для наполнения
- Нужно: разобрать отклики → онбордить лучших → только потом маркетинг родителям
- ОКВЭД коды добавлены ✅

## Технический стек
- React SPA (Vite), TypeScript
- Supabase (auth, DB, RLS)
- Vercel (хостинг)
- Gemini AI (matching + AI Concierge)
- Node 25.6.1, macOS
- **Важно:** Vercel API Functions — ESM, все импорты ОБЯЗАТЕЛЬНО с `.js` расширением!

## Товарный знак взаимодействия (AI Support Golden Rules)
Главный принцип AI-поддержки Blizko: «Эмпатичный консьерж». Бот не робот, а заботливый эксперт.
1. **Никаких номеров тикетов и канцеляризмов**: Забудьте фразы "Уважаемый клиент", "Ваш тикет закрыт", "Оператор ответит через 5 минут". 
2. **Проактивная забота о контексте**: Бот ДОЛЖЕН автоматически подтягивать из БД (`nannies`, `matches`) имя няни, с которой общается родитель. (Пример: "Вижу, что сегодня первый день работы с Анной. Как всё прошло?")
3. **Sentiment Tracking (Измерение настроения)**: Анализируйте эмоциональный окрас каждого сообщения (-1.0 до 1.0).
4. **Немедленная эскалация (Human Handover)**: Если `sentiment_score` падает ниже -0.5 (раздражение, стресс), либо если звучит просьба "позвать человека", бот мгновенно прекращает попытки решить проблему самостоятельно, меняет статус тикета на `human_escalated` и отправляет пуш Антону в Telegram.
5. **Тон**: Теплый, понимающий, решающий проблему, но не заискивающий. "Я здесь, чтобы помочь", "Антон уже в курсе, он сейчас подключится".

## 100% Ready Checklist (Stability Sprint)
- [x] Error Boundaries — `ErrorBoundary.tsx` с тёплым fallback
- [x] Support Chat — bubble не перекрывает контент (bottom-20)
- [x] Support Chat — responsive height для мобилок
- [x] Support Chat — skeleton loading при загрузке
- [x] Safe area padding — Home.tsx, NannyLandingPage.tsx (pb-24)
- [x] Health endpoint — `/api/health` (Supabase, Telegram, Gemini, env vars)
- [x] ESM imports — все API routes используют `.js` расширение
- [x] AI Concierge — работает с Gemini 1.5-flash + fallback models
- [x] Fat-thumb audit — кнопки ≥ 44px в App.tsx + UI.tsx

## 🔒 Security Integrity Status: VERIFIED (2026-03-13)

### Triple-Shield System
- **SHIELD 1 (TMA):** HMAC-SHA256 валидация через `_tma.ts` + `tma-validate.ts`
- **SHIELD 2 (Unified Auth):** Phone OTP → Supabase user → JWT session (backward compatible)
- **SHIELD 3 (RLS):** SQL migration готова: `supabase/migrations/20260313_rls_shield3.sql`

### Rate Limiting (per-IP)
- AI Concierge: 10 req/min
- Admin data endpoints: 30 req/min
- OTP send: 5 req/min
- OTP verify: 10 req/min

### CORS Hardening
- `nannies.ts`, `parents.ts`: `Access-Control: *` → `setCors()` (allowlisted origins)

### ⚠️ Нужно сделать
- [ ] Запустить RLS migration в Supabase SQL Editor
- [ ] Настроить `CORS_ALLOW_ORIGINS` в Vercel env (пример: `https://blizko.app,https://www.blizko.app`)
- [ ] Тестирование TMA HMAC в реальном Telegram Mini App

### Vercel Functions Limit
- Hobby план: 12 serverless functions MAX
- Текущий статус: **12/12** (health, ai-support, ai, geocode, notify, 2×auth, 2×data, 2×payments, telegram/send)
- Утилиты (`_cors.ts`, `_db.ts`, `_rate-limit.ts`, `_tma.ts`) НЕ считаются — начинаются с `_`
