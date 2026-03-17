# Code Review Pass 6 — Ранее непроверенные файлы
**17 марта 2026 · matchChat, payments, referral, ShareModal, dashboardMetrics, currentNannyProfile**

---

## 🚨 Критические

### 1. Нет аутентификации на `api/payments/create.ts` — CRITICAL 🔴

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(req.headers.origin, res);
    // ...
    const { amount, parentRequestId, description, userEmail, userPhone } = req.body;
    // Нет вызова verifyBearerUser(req) или verifyBearerAdmin(req)!
```
Любой человек с cURL может вызвать `POST /api/payments/create` с произвольной суммой (1 рубль) и получить ссылку на оплату через YooKassa от вашего магазина. Это open endpoint для создания платежей.

**Воздействие:** Злоумышленник может генерировать сотни ссылок на микроплатежи (1 RUB), тратить комиссию YooKassa, или наоборот — создать фальшивую страницу оплаты на сумму 1 000 000 RUB и переслать жертве.

**Решение:** Добавить `verifyBearerUser(req)` и привязать `parentRequestId` к проверенному `userId` перед созданием платежа.

### 2. TOCTOU Race Condition в `matchChat.ts` — Дубликаты чатов — MEDIUM 🟡

```typescript
// 1. Проверить, есть ли тред
const { data: existing } = await supabase
    .from('chat_threads')
    .select('...')
    .eq('match_id', matchId)
    .maybeSingle();

if (existing) { /* вернуть существующий */ }

// 2. Создать новый тред
const { data: created } = await supabase
    .from('chat_threads')
    .insert({ type: 'match', ... })
    .select('...')
    .single();
```
Классический Time-of-Check-Time-of-Use. Если родитель и няня одновременно открывают чат — оба увидят `existing = null`, оба создадут новый тред. Результат: два чата для одного матча.

**Решение:** Добавить `UNIQUE INDEX` на `(type, match_id)` в PostgreSQL, и использовать `upsert` вместо `insert`. Либо `INSERT ON CONFLICT DO NOTHING ... RETURNING id`.

---

## ⚠️ Средние

### 3. Webhook 500 → YooKassa Retry Storm (`payments/webhook.ts`) — MEDIUM 🟡

```typescript
} catch (err: any) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'Internal server error processing webhook' });
}
```
YooKassa повторяет вебхуки, пока не получит `200`. Если ваша база временно недоступна — каждый webhook будет давать `500`, YooKassa будет ретраить (до 10 раз с экспоненциальной задержкой). При 100 оплатах в день это может привести к 1000 запросов/час сверх нагрузки.

**Решение:** Всегда отдавать `200` в catch-блоке, а ошибку логировать отдельно. Либо использовать dead letter queue.

### 4. Referral Code Collision Risk (`referral.ts`) — MEDIUM 🟡

```typescript
const code = `BLZ-${userId.slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
```
4 символа userId + 4 случайных = ~1.7 млн комбинаций. При 10K пользователей вероятность коллизии ~3%. Код хранится в `localStorage` и никогда не проверяется на уникальность в БД.

**Решение:** Генерировать код на сервере с проверкой уникальности (`INSERT ON CONFLICT ... RETRY`).

### 5. localStorage Bloat (`matchFollowUp.ts`) — MEDIUM 🟡

```typescript
writeState({
    matchResult, // <-- Полный объект MatchResult с candidates[], aiAdvice, scores
    viewedAt: Date.now(),
    stage: 'fresh',
});
```
`MatchResult` содержит 5-10 кандидатов с фото, скорами, рисковыми профайлами и AI-обоснованиями. Это может быть 50-200 KB JSON. `localStorage` имеет лимит ~5 MB на домен. Серия подборов забьёт хранилище, и остальные сервисы (booking, confirmations, referrals — все используют localStorage) упадут с `QuotaExceededError`.

**Решение:** Хранить только `requestId` и `candidateIds`, загружать детали по запросу.

### 6. Clipboard Error Handling (`ShareModal.tsx`) — LOW 🟢

```typescript
navigator.clipboard.writeText(url); // Промис игнорируется!
setCopied(true);
```
На iOS Safari и в HTTP-контексте `navigator.clipboard.writeText()` может fail молча (или выбросить ошибку). `setCopied(true)` выполнится всегда, даже если текст НЕ скопирован. Пользователь вставит старый текст.

**Решение:** `await navigator.clipboard.writeText(url).catch(() => { /* fallback */ })`.

---

## 🔍 Архитектурные замечания

### 7. Impersonation через Name Matching (`currentNannyProfile.ts`) — LOW 🟢

```typescript
const nameMatches = profiles.filter((profile) => normalizeText(profile.name) === normalizedName);
return nameMatches.length === 1 ? nameMatches[0] : undefined;
```
Если у пользователя нет `userId` и контактов (edge case при сломанной авторизации), профиль выбирается **только по имени**. При регистрации двух нянь с одинаковым именем "Мария" — система вернёт `undefined`, но если одна удалится, оставшаяся может быть ассоциирована с чужим аккаунтом.

### 8. N+1 Readiness Computation (`dashboardMetrics.ts`) — LOW 🟢

```typescript
const readiness = params.nannies.map((nanny) => getNannyReadinessSnapshot(nanny));
```
`getNannyReadinessSnapshot` вызывается для каждой няни. Если в системе 500 нянь и функция дорогая — рендер дашборда зависнет. Сейчас это O(N), но при добавлении AI-вызовов в readiness check, это станет O(N*RTT).

---

## ✅ Хорошо

- **`payments/webhook.ts`:** Verification через GET к YooKassa API (anti-spoofing) — отличная секьюрити-практика, редко встречается в MVP.
- **`matchChat.ts`:** Contact sharing detection интегрирован прямо в `sendMatchMessage` — сообщения с попытками обхода платформы ловятся на лету.
- **`dashboardMetrics.ts`:** Чистая функция без побочных эффектов. Хорошо протестируется.
- **`currentNannyProfile.ts`:** Многоуровневый fallback (userId → contact → name) для связи профиля.

---

## 📊 Сводка Pass 6

| # | Проблема | Файл | Приоритет |
|---|----------|------|-----------|
| 1 | Нет auth на payment create | `payments/create.ts` | 🔴 CRITICAL |
| 2 | TOCTOU → duplicate chat threads | `matchChat.ts` | 🟡 MEDIUM |
| 3 | Webhook 500 → retry storm | `payments/webhook.ts` | 🟡 MEDIUM |
| 4 | Referral code collisions | `referral.ts` | 🟡 MEDIUM |
| 5 | localStorage bloat from match results | `matchFollowUp.ts` | 🟡 MEDIUM |
| 6 | Clipboard error not handled | `ShareModal.tsx` | 🟢 LOW |
| 7 | Name-based profile impersonation | `currentNannyProfile.ts` | 🟢 LOW |
| 8 | N+1 readiness computation | `dashboardMetrics.ts` | 🟢 LOW |
