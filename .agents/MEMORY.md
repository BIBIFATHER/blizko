# Blizko — Контекст проекта (MEMORY)

Этот файл — долгосрочная память. Агент читает его в начале каждой сессии.

## 🚨 ОБЯЗАТЕЛЬНО ПЕРЕД КАЖДОЙ ЗАДАЧЕЙ

**НЕ НАЧИНАЙ РАБОТУ** пока не сделаешь два шага:

1. **💬 Мнение** — свой анализ задачи: подход, риски, альтернативы, подводные камни
2. **💡 Модель** — рекомендация из матрицы `/model-orchestrator` с обоснованием

Формат:
```
💬 Мнение: [анализ задачи, 2-3 предложения]

💡 Модель: [название] — [почему]
Экономия: ~Xx vs [альтернатива]
```

**Это НЕ опционально. Антон явно потребовал это правило. Нарушение = потеря доверия.**

---

## Антон (основатель)
- Один фаундер, делает всё сам + AI-агенты
- Технический уровень: продвинутый пользователь, не разработчик
- Предпочитает работать в одном окне (не параллельные агенты)
- Основной рынок: Москва, Россия

## Текущий статус продукта (Launch-Ready Phase)
- MVP запущен на blizko.app (Vercel)
- 22 тестовых профиля нянь в Supabase (seed)
- **150 реальных откликов от нянь на hh.ru — НЕ РАЗОБРАНЫ!**
- Matching Engine работает (Gemini AI)
- AI Concierge работает (Gemini 1.5-flash, sentiment tracking, Telegram эскалация) ✅
- Оплата НЕ подключена (ЮKassa — нет API key)

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
- UI Style: "Premium Bento Grid" (Tailwind CSS)

## 🌐 Доменная архитектура (Cloudflare + Vercel)
- **blizko.app** → Cloudflare DNS (A: 76.76.21.21, серое облако) → Vercel Frontend
- **www.blizko.app** → Cloudflare DNS (CNAME: cname.vercel-dns.com, серое облако) → Vercel Frontend
- **api.blizko.app** → Cloudflare DNS (CNAME: geomyyfjvemdphaeimkz.supabase.co, 🟠 оранжевое облако) → Supabase (bypass VPN)
- Cloudflare SSL: Full (strict)
- CSP: `api.blizko.app` добавлен в connect-src
- Vercel env (prod): `SUPABASE_URL` + `VITE_SUPABASE_URL` → `https://api.blizko.app`

## Товарный знак взаимодействия (AI Support Golden Rules)
Главный принцип AI-поддержки Blizko: «Эмпатичный консьерж». Бот не робот, а заботливый эксперт.
1. **Никаких номеров тикетов и канцеляризмов**: Забудьте фразы "Уважаемый клиент", "Ваш тикет закрыт", "Оператор ответит через 5 минут". 
2. **Проактивная забота о контексте**: Бот ДОЛЖЕН автоматически подтягивать из БД (`nannies`, `matches`) имя няни, с которой общается родитель.
3. **Sentiment Tracking (Измерение настроения)**: Анализируйте эмоциональный окрас (-1.0 до 1.0).
4. **Немедленная эскалация (Human Handover)**: Если `sentiment_score` < -0.5, статус = `human_escalated` и Telegram пуш Антону.
5. **Тон**: Теплый, понимающий, решающий проблему. "Антон уже в курсе, он сейчас подключится".

## 🔒 Security Integrity Status: VERIFIED
### Triple-Shield System
- **SHIELD 1 (TMA):** HMAC-SHA256 валидация через `_tma.ts` + `tma-validate.ts`
- **SHIELD 2 (Unified Auth):** Phone OTP → Supabase user → JWT session (backward compatible)
- **SHIELD 3 (RLS):** SQL migration active (`20260313_rls_shield3.sql`)

### Rate Limiting (per-IP)
- AI Concierge: 10 req/min
- Admin data endpoints: 30 req/min
- OTP send & verify: 5-10 req/min

### Vercel Functions Health
- Dead code purged (geocode, notify, payments API deleted).
- Capacitor and react-qr-code dependencies removed globally.
- Hobby Limit (12 MAX) is safe. Current usage is optimal (health, ai-support, ai, auth, data, telegram/send).

## 🚀 Strategic Roadmap (Next 7 Days)
1. **Complete the 150-Nanny Pipeline:** Adapt the database schema and onboarding flow to process the incoming 150 candidates from hh.ru efficiently.
2. **Infrastructure Stress-Test:** Conduct end-to-end tests of the "No-VPN" proxy flow on mobile devices to ensure 100% stable reachability in Russia.
3. **Final Polish:** Minor Launch-Ready UI adjustments and copy reviews before scaling.
