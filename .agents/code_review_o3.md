# GPT-4o / "o3" Deep Reasoner Review — Blizko
**16 марта 2026 · Углублённый системный проход**

---

## 🔬 Фокус: Concurrency, Race Conditions, Infra & Logic

Этот проход сфокусирован не на стиле кода или архитектурных паттернах, а на глубоких системных ошибках: блокировках БД, тайм-аутах инфраструктуры, состоянии гонки в оффлайне и изощрённых векторах атак.

Ключевые файлы: `api/data.ts`, `api/ai.ts`, `api/notify.ts`, `services/contactSharing.ts`, `services/booking.ts`.

---

## 🚨 Критические системные находки (o3-tier)

### 1. DB Lock Contention в `api/data.ts` (Crash при Cold Start)

**Проблема:** В `api/data.ts` метод `ensureAnalyticsTable()` вызывается при каждом запросе:
```typescript
let analyticsTableReady = false;
async function ensureAnalyticsTable() {
  if (analyticsTableReady) return;
  await pool.query('CREATE TABLE ...');
  await pool.query('CREATE INDEX IF NOT EXISTS ...');
  analyticsTableReady = true;
}
```
Флаг `analyticsTableReady` живёт в памяти Vercel Lambda. В serverless-среде при всплеске трафика (например, пуш-уведомление рассылается тысяче пользователей), Vercel мгновенно поднимает десятки новых инстансов функции (Cold Starts).
Каждый инстанс начинает выполнять `CREATE INDEX`. В PostgreSQL `CREATE INDEX` (без модификатора `CONCURRENTLY`) накладывает `ShareLock` на таблицу, полностью блокируя операции `INSERT`.
Сотни попыток записать аналитику столкнутся с заблокированной таблицей, исчерпают пул соединений (connection pool exhaustion), и база упадёт или начнёт возвращать `50x`.

**Решение:** Убрать создание индексов и таблиц из runtime-кода приложения. Миграции БД должны выполняться отдельным скриптом (CI/CD) ДО деплоя. Либо использовать `CREATE INDEX CONCURRENTLY`.

### 2. Vercel 504 Timeout Guarantee в `api/ai.ts`

**Проблема:** Логика AI fallbacks несовместима с лимитами Vercel:
```typescript
const REQUEST_TIMEOUT_MS = 20000;
// ...
for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
   // ... callGemini(..., REQUEST_TIMEOUT_MS)
   // catch Timeout -> sleep(300ms) -> continue loop
}
```
Vercel Hobby имеет лимит 10-15 секунд, Vercel Pro — 60 секунд.
Если модель зависает, внутренний `AbortController` срабатывает через 20 секунд. Скрипт ловит ошибку, ждёт, и пробует снова (до 3 раз на одну модель!). В сумме это `20 + 20 + 20 = 60 секунд` только на первой модели, до того как произойдёт fallback на следующую модель `Array`.
Реальность: Vercel принудительно обрывает процесс с кодом `504 Gateway Timeout` гораздо раньше (15s/60s). Клиент получает HTTP 504 (HTML страницу Vercel), fallback даже не успевает сработать.

**Решение:** `REQUEST_TIMEOUT_MS` должен быть максимум 5-8 секунд для Vercel. А количество ретраев (MAX_RETRIES) внутри одной функции в serverless нужно свести к 0-1.

### 3. ReDoS (Regex Denial of Service) в `services/contactSharing.ts`

**Проблема:** Экспоненциальное катастрофическое отслеживание возвратов в регулярном выражении.
```typescript
const CONTACT_PATTERNS = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
];
```
В части `[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` символ точки разрешён и в левом блоке, и экранирован в правом. 
Если загрузить в чат строку вида: `a@b.b.b.b.b.b.b.b.b.b.b.b.b.b...` (без финальных 2 букв домена), JS-движок начнёт перебирать все возможные комбинации точки (считать ли её частью первой группы или разделителем). Сложность возрастает как `O(2^N)`. Отправка длинного сообщения в SupportChat "подвесит" вкладку пользователя на 100% CPU.

**Решение:** Ограничить длину Email перед регуляркой (или брать готовую RFC-совместимую ReDoS-safe regex). Например: ограничить проход regex первыми 200 символами текста.

### 4. Spam / Spoofing Вектор в `api/notify.ts` (API Bypass)

**Проблема:** Произвольная отправка email от имени админа.
```typescript
if (!hasInternalToken) {
  if (!verifiedUser || !event.startsWith('admin.')) return 401; // Секьюрно?
}
// check Telegram whitelist... (только для channel === telegram)
let to = hasInternalToken ? body.to : '';
if (!to && event.startsWith('admin.')) {
  to = ADMIN_EMAIL; // Подставляем почту админа
}
const result = await sendResendEmail(to, subject, text);
```
Логика телеграма (whitelist `CLIENT_TELEGRAM_EVENTS`) **не применяется**, если в payload не передать `channel: 'telegram'`. 
Любой залогиненный юзер может отправлять POST запросы с payload:
`{ "event": "admin.hax", "subject": "Парсинг базы", "text": "Я выкачал базу" }`
Запрос проходит `event.startsWith('admin.')`. `to` устанавливается в емейл администратора. Затем происходит легитимная отправка через Resend. Злоумышленник может бесплатно спамить inbox основателя (и тратить квоту Resend, пока аккаунт не заблокируют).

**Решение:** Strict validation `event === 'admin.contact_sharing_detected'` должно применяться глобально для всех клиентских вызовов, независимого от `channel`.

### 5. Offline Sync Race Condition (Потеря данных в `booking.ts`)

**Проблема:** Логика мёрджа убивает локальные апдейты.
```typescript
function mergeRemoteWithPending(remoteItems, localItems, pendingIds) {
    const remoteIds = new Set(remoteItems.map(item => item.id));
    // pendingItem берётся только если его нет на сервере!
    const pendingItems = localItems.filter(item => 
        pendingIds.includes(item.id) && !remoteIds.has(item.id)
    );
    return sortBookings([...pendingItems, ...remoteItems]);
}
```
Сценарий:
1. Юзер оффлайн (например, в метро). Бронирование `id-123` уже есть и локально, и на сервере (создано вчера).
2. Юзер меняет статус (`updateBookingStatus`) на 'cancelled'. Бронирование попадает в `pendingIds`.
3. Появляется интернет. Происходит вызов `getBookingsForUser`, загружается серверная копия `id-123` со старым статусом 'confirmed'.
4. В функции `mergeRemoteWithPending`: так как `id-123` есть в `remoteIds`, фильтр `!remoteIds.has(item.id)` выкидывает локальную копию из `pendingItems`.
5. Итог: `id-123` возвращается в статус 'confirmed' (old remote state). Затем очищается `pendingIds`. **Status update lost.** 

**Решение:** Если запись есть в `pendingIds`, локальная копия *должна выигрывать* над удалённой, пока не пройдет успешный push-sync, а не игнорироваться.

---

## 🎯 Сводка (Вердикт Reasoner Model)

**Скрытые угрозы проекта кроются в пересечении инфраструктуры (Vercel + Postgres) и асинхронной природы JS:**
1. Индексы в runtime (в data.ts) убьют базу под нагрузкой.
2. AI-таймауты (в ai.ts) несовместимы со средой исполнения Vercel.
3. Офлайн-мёрдж (в booking.ts) стирает правки пользователя.
4. Открытый email endpoint (в notify.ts) позволяет спам-атаку на администратора.

Эти сценарии не выявляются при ручном тестировании одним пользователем, но мгновенно всплывают в production.
