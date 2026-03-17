# Мультимодельный Ревью — Blizko Codebase
**16 марта 2026 · ~45 файлов · ~6000+ строк**

---

## 🏗️ Модель 1: Архитектор (System Design)

**Фокус:** паттерны, связность, масштабируемость, separation of concerns.

### Вердикт: 7.5/10 — Продуманная архитектура с точечными проблемами

**✅ Сильные стороны:**
- **Local-first с pending sync** — единый паттерн в `storage.ts`, `booking.ts`, `referral.ts`. Правильный: работает офлайн → sync при подключении → очистка pending queue. Грамотно.
- **Layered AI pipeline** — `aiConfig → aiGateway → /api/ai → Gemini REST`. Ключи не выходят из сервера. Clean separation.
- **Service extraction** — `currentNannyProfile.ts`, `nannyReadiness.ts`, `qualityScore.ts` — бизнес-логика вынесена из компонентов в сервисы. Правильно.
- **Custom Event Bus** — `blizko:open-support-chat`, `blizko:open-auth-modal` — components communicate через DOM events, не через prop drilling.
- **Hooks** — `useAuthSession`, `useParentSubmit`, `useNannySubmit`, `usePwaInstall`, `useShareActions` — чисто вынесенная логика.

**⚠️ Проблемы:**
- **storage.ts = 513 строк God Service.** Хранит parents, nannies, admin operations, sync, reviews. Разбить на `parentStorage`, `nannyStorage`, `adminStorage`.
- **Два analytics pipeline параллельно.** PostHog (`window.posthog`) + свой бэкенд (`/api/data?resource=analytics`). Дублирование. Определиться: если PostHog — убрать custom. Если custom — убрать PostHog.
- **Circular concern:** `SupportChat → supportEngine → /api/ai-support`. Но `ai-support.ts` тоже вызывает Supabase напрямую (REST) для ticket management, минуя клиентский Supabase SDK. Два пути к одним данным.
- **Нет shared API client.** Каждый сервис делает `fetch('/api/...')` вручную с headers. Нужен `apiClient.ts` с interceptors для auth/retry.

---

## 🔒 Модель 2: Security Engineer

**Фокус:** auth, data exposure, injection, secrets management.

### Вердикт: 7/10 — Основа хорошая, есть дыры

**✅ Сильные стороны:**
- **API keys server-only.** `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `RESEND_API_KEY` — только в `process.env`, не `VITE_`.
- **Rate limiting** на всех публичных endpoints: `ai-support` (10/min), `notify` (20/min), `data:analytics` (180/min POST, 20 GET).
- **Auth verification** на `/api/notify` — JWT + token, admin guards. `/api/ai-support` — JWT + ticket ownership check.
- **Event whitelist** в analytics — только ~20 разрешённых событий, size limit на properties (8KB).
- **XSS-safe:** нет `dangerouslySetInnerHTML`, все данные проходят через React rendering.

**⚠️ Проблемы:**
- **`VITE_GEMINI_API_KEY` fallback** в `ai-support.ts:228`. Dangerous convention даже если сейчас не используется.
- **PaymentModal хранит card data в React state.** Пока оплата фейковая — ок. Но если кто-то попытается «подключить» реальный шлюз не удалив этот код — PCI DSS disaster.
- **`/api/data` DELETE endpoint** — `testOnly=1` удаляет `id LIKE 'test-%'`, но без `testOnly` фильтр `id != '__none__'` = удалит ВСЁ. Admin-only, но один ошибочный вызов без `testOnly=1` → потеря данных.
- **Rate limiter in-memory** — сбрасывается при cold start Vercel. Не защищает от burst attacks. Для production нужен Redis/Upstash.
- **Telegram inline keyboards** — `callback_data: 'confirm_t24h'` — но нет обработчика webhook для callback queries. Кнопки нажимаются, ответ никогда не обработается.
- **analytics flush** — `fetch` без auth header (строка 136-143). Любой может POST фейковые события.

---

## ⚡ Модель 3: Performance Engineer

**Фокус:** bundle size, rendering, API calls, memory.

### Вердикт: 7/10 — Solid foundation, но есть оптимизации

**✅ Сильные стороны:**
- **Lazy loading** — все крупные компоненты через `React.lazy()` в `App.tsx`. Хорошо для initial bundle.
- **City autocomplete debounce** — 350ms в `ParentForm` перед вызовом Nominatim. Правильно.
- **Analytics buffering** — events буферизуются локально (limit 500), flush асинхронный с `keepalive: true`.
- **Supabase Realtime** — один канал на тикет для чата, не polling.
- **AI matching cache** — `matchingWeights.ts` и `insightsLoader.ts` кешируют на 10 минут.

**⚠️ Проблемы:**
- **AI Support = 2 Gemini вызова per message.** Sentiment analysis отдельным вызовом → +300-500ms latency и двойная стоимость. Объединить в один prompt.
- **Nominatim autocomplete** — direct fetch к `nominatim.openstreetmap.org` из клиента. Нарушает ToS Nominatim (no heavy use без договора). Лучше проксировать через свой API.
- **`import { Type } from "@google/genai"`** в `documentAi.ts` — тянет весь `@google/genai` SDK в клиентский бундл, хотя используется только для type constant.
- **storage.ts** — `getLocalParents()` и `getLocalNannies()` вызывают `JSON.parse` при каждом вызове. При 100+ записях — заметный overhead. Нужна in-memory cache.
- **ParentForm** — 10 Likert + 3 scenarios + risk profile + calendar + advanced options = ~563 строк в одном компоненте. React re-renders entire tree при каждом нажатии chip/select.

---

## 🎨 Модель 4: UX / Frontend Engineer

**Фокус:** accessibility, i18n, mobile readiness, user flows.

### Вердикт: 7.5/10 — Визуально отлично, но i18n и a11y подсели

**✅ Сильные стороны:**
- **Design system** — `UI.tsx` (16KB) с Button, Input, Textarea, ChipGroup, ProgressBar, Badge, Card, EmptyState. Consistent.
- **Endowed Progress Effect** — прогресс-бар стартует с 10%, а не 0%. Psychological trick (Cialdini: Commitment) — грамотно.
- **Trust blocks** — Home page с 3 expandable trust sections, deep dive modals. Builds confidence.
- **Error states** — `ErrorBoundary` wrapping SupportChat, fallback message с email для поддержки.
- **Micro-animations** — `animate-slide-up`, `animate-fade-in`, `animate-pop-in`, `animate-pulse` на зелёном dot чата.
- **PWA** — `usePwaInstall` hook + `InstallPwaModal` + service worker.

**⚠️ Проблемы:**
- **i18n incomplete.** `ParentForm` — ~15 строк на русском при наличии `lang` prop: секции календаря, бюджета, доп параметров, select options. English пользователь видит mixed language.
- **No `aria-label`** на многих interactive elements: chip groups, select dropdowns в ParentForm, trust block buttons.
- **SupportChat z-index война** — `z-[70]` на чате, что может перекрывать `z-[70]` на PaymentModal. Нет z-index system.
- **Mobile keyboard** — SupportChat input `fixed bottom-4` → на мобильных клавиатура перекроет input. Нужен `visual viewport` listener.
- **Share fallback** — `navigator.clipboard.writeText` в MatchResults. На HTTP (не HTTPS) или в некоторых in-app browsers — fallback сломается. Нет catch на SecurityError.

---

## 🤖 Модель 5: AI/ML Engineer

**Фокус:** модели, промпты, data pipeline, evaluation, quality.

### Вердикт: 8/10 — Продвинутая архитектура для стартапа

**✅ Сильные стороны:**
- **ε-greedy exploration** — `shadowScoring.ts` вводит разнообразие в матчинг (10% exploration). Логирует для RLHF без блокировки основного flow.
- **Risk Engine** — `riskEngine.ts` структурировано флагирует несовместимости (discipline mismatch, infant inexperience, schedule conflict). Не чёрный ящик.
- **Dynamic weights** — `matchingWeights.ts` загружает weights из Supabase с дефолтами. Позволяет AB-test без деплоя.
- **RAG-lite** — `insightsLoader.ts` загружает human insights из БД и инжектит в system prompt. Эволюция без изменения кода.
- **Document AI** — structured JSON schema через `responseSchema` + `responseMimeType`. Gemini возвращает typed response → парсинг надёжный.
- **Multi-model fallback** — если primary модель 404/429 → automatic fallback на следующую.

**⚠️ Проблемы:**
- **Temperature не доходит** — `matchingAi.ts` просит 0.4, `/api/ai.ts` игнорирует. AI-ответы нестабильны.
- **assessment.ts фейк** — `setTimeout(2500)` для имитации AI. Rule-based scoring маскируется под AI. Нужен рефакторинг в честный `rule_based_v1`.
- **Нет evaluation pipeline.** `shadowScoring` логирует, но нигде нет кода для анализа корреляции shadow_score → outcome. Данные собираются, но не используются.
- **System prompt в коде.** `ai-support.ts` SYSTEM_PROMPT = 358 слов hardcoded. Изменение требует деплоя. Лучше в Supabase → hot-reload.
- **Sentiment = отдельный API call.** Можно объединить sentiment + reply в один вызов с structured output.
- **Model mismatch.** Support чат = `gemini-1.5-flash` (старая). Matching = `gemini-2.5-flash` (новая). Inconsistent quality.

---

## 📊 Сводная Таблица

| Перспектива | Оценка | Top Issue |
|-------------|--------|-----------|
| 🏗️ Архитектура | 7.5/10 | `storage.ts` God Service |
| 🔒 Безопасность | 7/10 | DELETE без safety, analytics без auth |
| ⚡ Performance | 7/10 | 2x Gemini per support message |
| 🎨 UX/Frontend | 7.5/10 | i18n incomplete |
| 🤖 AI/ML | 8/10 | Temperature не доходит |
| **СРЕДНЕЕ** | **7.4/10** | |

---

## 🎯 Top-7 Действий (united across all perspectives)

| # | Что | Перспектива | Effort | Impact |
|---|-----|------------|--------|--------|
| 1 | Интеграция реального платёжного шлюза | 🔒+🏗️ | High | **Blocker** |
| 2 | `temperature` + params passthrough в `/api/ai.ts` | 🤖 | Low | High |
| 3 | Merge sentiment+reply в один Gemini call | ⚡+🤖 | Medium | High |
| 4 | Analytics flush: добавить auth header | 🔒 | Low | Medium |
| 5 | i18n: вынести хардкод русского из ParentForm | 🎨 | Medium | Medium |
| 6 | SupportChat AI message dedup fix | 🏗️+🎨 | Low | Medium |
| 7 | `assessment.ts` → honest `rule_based_v1` | 🤖 | Low | Medium |
