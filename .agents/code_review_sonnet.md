# Claude Sonnet Code Review — Blizko
**16 марта 2026 · Независимый проход**

---

## Что читал в этом проходе

`_auth.ts`, `_tma.ts`, `pricing.ts`, `NannyLandingPage.tsx`, `AdminParentsTab.tsx`, `matchingFeedback.ts`, `qualityScore.ts`, `storage.ts` (внутренности), `services/telegram.ts`, `services/supportEngine.ts`, `services/analytics.ts`

---

## ✅ Подтверждаю из предыдущего ревью

- **PaymentModal — симуляция платежа** ← критичный блокер, подтверждён
- **`temperature` не доходит до Gemini** ← подтверждён
- **SupportChat message dedup** ← подтверждён (разные ID)
- **VITE_ fallback** ← подтверждён

---

## 🆕 Новые находки (не было в предыдущем проходе)

### 1. Роли хранятся только в клиентском state — нет server enforcement

**Файл:** `_auth.ts:31-66`, `useAuthSession.ts:15-20`

`verifyBearerUser` возвращает только `{ id, email }`. Роль (`parent` | `nanny`) нигде не верифицируется сервером — она берётся из `user.user_metadata` или из локального React state.

```typescript
// useAuthSession.ts
role: previous?.role,  // ← берёт из предыдущего state
```

Если `previous` null (первый рендер) → `role = undefined`. Бизнес-логика, которая зависит от роли (`RequireRole` компонент, разные UI) — всё на клиенте. **Вектор:** пользователь может манипулировать localStorage и получить доступ к nanny-only UI. Серверные эндпоинты не проверяют роль, только email для admin.

### 2. `qualityScore.ts` — `bookingStats` через `as any`

**Файл:** `qualityScore.ts:57`

```typescript
const stats = (nanny as any).bookingStats;
```

Поле `bookingStats` отсутствует в типе `NannyProfile`. Берётся через `as any`. Если `NannyProfile` когда-либо изменится — этот код молча сломается: `stats = undefined`, компилятор не предупредит. **Нужно** добавить `bookingStats?: { total: number; completed: number }` в тип.

### 3. `matchingFeedback.ts` — ghosted outcome теряет сигнал типа

**Файл:** `matchingFeedback.ts:13-23`

```typescript
function buildFeedbackText(
  signalType: 'interest_signal' | 'final_outcome',
  feedbackText?: string,
): string | null {
  if (!feedbackText && signalType === 'final_outcome') return null;
  // ...
}
```

Когда `outcome = 'ghosted'` и `feedbackText = undefined` → `buildFeedbackText` возвращает `null` → в Supabase пишется `feedback_text: null`. Из БД **невозможно** отличить "ghosted без комментария" от "записи без обратной связи вообще". Весь RLHF-pipeline теряет половину сигналов.

**Фикс:** всегда писать тип сигнала, даже без текста:
```typescript
if (!feedbackText && signalType === 'final_outcome') {
  return JSON.stringify({ type: signalType, note: null, recordedAt: Date.now() });
}
```

### 4. `storage.ts` — `getCurrentUserId()` делает Supabase round-trip при каждом вызове

**Файл:** `storage.ts:110-114`

```typescript
async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser(); // ← network call
  return data.user?.id || null;
}
```

`supabase.auth.getUser()` — это HTTP запрос к Supabase Auth. Вызывается в `remoteGetOwnNanny()`, `remoteGetOwnParents()`, `getCurrentUserIdentity()` — каждый раз отдельно. При открытии профиля: 3 параллельных Supabase auth запроса.

**Фикс:** использовать `supabase.auth.getSession()` (local, из памяти) вместо `getUser()` (remote). Или кешировать `userId` в модуле.

### 5. `_auth.ts` — `fs.readFileSync` в production Vercel functions

**Файл:** `_auth.ts:9-16`

```typescript
const envPath = path.join(process.cwd(), '.env.local');
const raw = fs.readFileSync(envPath, 'utf8');
```

На Vercel в production `.env.local` не существует — env vars инжектируются через `process.env`. Этот код бросит исключение, которое молча проглатывается в `catch => undefined`. Это fine для production, но **создаёт ложное ощущение что local fallback работает** во всех средах. Если env var случайно не задана в Vercel dashboard — ошибка будет неочевидной (`undefined` вместо понятного error).

### 6. Telegram callback_data не обрабатывается

**Файл:** `telegram.ts:118-124`

```typescript
reply_markup: {
  inline_keyboard: [[
    { text: '✅ Подтверждаю выход', callback_data: 'confirm_t24h' },
    { text: '❌ Не смогу прийти', callback_data: 'cancel_t24h' },
  ]]
}
```

Используется `callback_data`, который требует Telegram Webhook на `/bot{TOKEN}/` для `answerCallbackQuery`. Без webhook — кнопки появляются в Telegram, пользователь нажимает, ничего не происходит, Telegram показывает вечный "часики". Нет ни webhook handler, ни polling. **Кнопки нефункциональны.**

### 7. `NannyLandingPage` — роут `/register?role=nanny` не задекларирован в роутере

**Файл:** `NannyLandingPage.tsx:74`, `App.tsx`

```typescript
onClick={() => navigate('/register?role=nanny')}
```

В `App.tsx` нет Route для `/register`. Likely redirect идёт на `NannyForm` через другой механизм. Но если пользователь напрямую введёт `blizko.app/register` — получит 404 или react-router fallback, а не форму.

### 8. `AdminParentsTab` — поиск не покрывает имя/телефон

**Файл:** `AdminParentsTab.tsx:39-43`

```typescript
const byQuery =
  !q ||
  p.city.toLowerCase().includes(q) ||
  p.comment.toLowerCase().includes(q) ||
  p.requirements.join(' ').toLowerCase().includes(q);
```

Поиск по city, comment, requirements — но **не по имени parent и не по телефону/email**. Администратор, ищущий конкретного юзера по имени "Анна Иванова", ничего не найдёт.

---

## 🟢 Что Соnnet видит как сильные стороны

| Компонент | Почему хорошо |
|-----------|---------------|
| `_tma.ts` | Textbook HMAC-SHA256, constant-time compare, anti-replay — production-ready |
| `pricing.ts` | 4 строки, единственный source of truth, правильно импортируется отовсюду |
| `storage.ts` `nannies_public` view | PII stripped для анонимных пользователей, `remoteGetOwnNanny` для полного профиля |
| `matchingFeedback.ts` | Upsert на `(parent_id, nanny_id)` — prevents duplicate outcomes cleanly |
| `AdminParentsTab` | Rejection reason codes + changeLog audit trail — enterprise-grade workflow |
| `analytics.ts` | Typed event names (`ANALYTICS_EVENTS as const`), 500-event buffer, `keepalive: true` на flush |
| `qualityScore.ts` | Документированные веса (30%/25%/20%/15%/10%), прозрачная формула, badge tier labels |

---

## Сводка: что Sonnet нашёл нового

| # | Файл | Проблема | Severity |
|---|------|----------|----------|
| 1 | `useAuthSession.ts` | Роли только в client state | 🟡 Medium |
| 2 | `qualityScore.ts:57` | `bookingStats` через `as any` | 🟡 Medium |
| 3 | `matchingFeedback.ts:17` | Ghosted теряет signal type | 🟡 Medium |
| 4 | `storage.ts:112` | `getUser()` вместо `getSession()` × N | 🟡 Medium |
| 5 | `_auth.ts:9-16` | `fs.readFileSync` в Vercel | 🟢 Low |
| 6 | `telegram.ts:118` | callback_data без webhook | 🟡 Medium |
| 7 | `NannyLandingPage.tsx:74` | `/register` route не задекларирован | 🟡 Medium |
| 8 | `AdminParentsTab.tsx:39` | Search не по имени/контакту | 🟢 Low |
