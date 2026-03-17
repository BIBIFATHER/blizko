# Code Review Pass 5 — Claude 3.5 Sonnet
**17 марта 2026 · Новые файлы: confirmations, pushNotifications, AdminBookingsTab, NannyFormProvider, migration_v1.sql**

---

## 🎯 Фокус прохода

Этот проход — первое чтение файлов, которые ни разу не попадали в ревью. Сконцентрирован на правильности бизнес-логики, UX-рисках и типичных ловушках React/TypeScript.

---

## 🐛 Баги и Проблемы

### 1. Timezone Bug в `services/confirmations.ts` (Потеря выхода няни) — MEDIUM

Напоминание за 24 часа рассчитывается как:
```typescript
const dueAt = new Date(new Date(bookingDate).getTime() - 24 * 60 * 60 * 1000);
```
Проблема: `new Date(bookingDate)` — зависит от локали и часового пояса браузера пользователя. Если мама в Москве (UTC+3) создаёт бронирование на "2026-04-15" (без явного времени), JS в 9:00 воспринимает строку как `2026-04-15T00:00:00+03:00` (то есть `2026-04-14T21:00:00Z`).
После вычитания 24 часов `due_at = 2026-04-13T21:00:00Z` — напоминание придёт за 27 часов до начала, а не за 24.

**Решение:** При создании бронирования всегда формировать `bookingDate` как ISO 8601 строку с явным временем и timezone (например, `2026-04-15T09:00:00+03:00`). Либо хранить дату как UTC timestamp и вычитать из него.

### 2. Stale Closure в `applyResumeNormalized` (`NannyFormProvider.tsx`) — MEDIUM

```typescript
const applyResumeNormalized = (resume: NormalizedResume): number => {
    let appliedCount = 0;
    setFormData((prev) => { /* ... */ });

    // BUG: 'skills' здесь — это snapshot из moment создания функции,
    // НЕ актуальное значение на момент вызова
    if (Array.isArray(resume.skills) && resume.skills.length > 0) {
        const nextSkills = Array.from(new Set([...(skills || []), ...resume.skills]));
        if (nextSkills.length !== skills.length) { // <-- stale skills!
            appliedCount += 1;
            setSkills(nextSkills);
        }
    }

    return appliedCount;
```
`skills` в строке 167 — это стейлб-клоужур (устаревшее замыкание). Если пользователь добавил навыки после первого рендера, а потом загрузил резюме, функция будет сравнивать `nextSkills` с `skills` из момент монтирования компонента. Работает неправильно при последовательных вызовах.

**Решение:** Выполнять операцию объединения навыков внутри колбэка `setSkills(prev => ...)` чтобы всегда читать актуальное значение.

### 3. `alert()` в Production UI (`NannyFormProvider.tsx`) — LOW

```typescript
alert(lang === 'ru' ? 'Не удалось определить город...' : '...');
alert(result.error);
```
`alert()` — это системный диалог браузера, который блокирует всё. На iOS/Android PWA он выглядит как системное предупреждение от приложения (не стилизован). Это разрушает UX и доверие.

**Решение:** Заменить на in-app toast notification (у вас уже наверняка есть компонент).

### 4. Только Local Push Notifications (`pushNotifications.ts`) — LOW/DESIGN

Весь сервис работает ТОЛЬКО когда браузер/вкладка активна:
```typescript
// Это просто: registration.showNotification(...)
await registration.showNotification(title, notificationOptions);
```
Напоминание за 3 часа (`bookingReminder3h`) никогда не придёт, если пользователь не открыл приложение. Для production нужен Web Push (VAPID keys + push сервер). Без этого feature является декорацией.

**Рекомендация:** Либо удалить `BlizkoNotifications.bookingReminder3h` как нефункциональный, либо внедрить Web Push Protocol с сервером-отправщиком.

---

## ⚠️ Замечания и Архитектурные Риски

### 5. Nominatim — GDPR Danger (`NannyFormProvider.tsx`) — MEDIUM

```typescript
const nr = await fetch(`https://nominatim.openstreetmap.org/search?...&q=${encodeURIComponent(q)}`);
```
`nominatim.openstreetmap.org` — это публичный сервис. Согласно его [usage policy](https://operations.osmfoundation.org/policies/nominatim/), он запрещён для коммерческих продуктов с более чем 1 запросом/секунду. При 100 DAU (ежедневных пользователях) заполняющих форму — вы превысите лимит и получите 403.
Кроме того: вы отправляете частичные имена российских городов/улиц на серверы Германии. Это нерешённый GDPR-риск (пользовательские данные уходят third-party).

**Решение:** Перейти на DaData API (ru-specific, есть шифрование) или Yandex Geocoder (или просто забайндить DropDown с фиксированным списком городов Москвы/МО для MVP).

### 6. Несоответствие в Схеме БД (`migration_v1.sql`) — LOW

В таблице `chat_threads`:
```sql
match_id TEXT REFERENCES parents(id)
```
Внешний ключ на таблицу `parents(id)` типа `TEXT`, но в таблице `parents` первичный ключ определён как:
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
Тип UUID ≠ TEXT в строгих СУБД. В Postgres это будет работать (неявная конвертация), но может вызывать проблемы при использовании ORM-ов или при переносе данных. Является архитектурной ошибкой.

**Решение:** Привести `match_id` к типу `UUID`: `match_id UUID REFERENCES parents(id)`.

---

## ✅ Хорошо написанные части

- `AdminBookingsTab.tsx` — чистая реализация с `useMemo` для фильтрации/подсчёта. Нет лишних ре-рендеров. Кнопки управления статусом правильно рендерятся по текущему статусу.
- `confirmations.ts` — последовательный local-first паттерн (идентичный `booking.ts`). Тихие фоллбэки при потере соединения. Корректное использование `supabase.from().update()` с `.eq('id', ...)`.
- `pushNotifications.ts` — корректное запрашивание разрешения только в момент использования (не при загрузке), корректная проверка `Notification.permission` перед `requestPermission()`.

---

## 📊 Итог по Пасу 5

| Проблема | Файл | Приоритет |
|---|---|---|
| Timezone bug в due_at | `confirmations.ts` | 🟡 MEDIUM |
| Stale closure в applyResumeNormalized | `NannyFormProvider.tsx` | 🟡 MEDIUM |
| Nominatim GDPR + usage policy | `NannyFormProvider.tsx` | 🟡 MEDIUM |
| alert() в production UI | `NannyFormProvider.tsx` | 🟢 LOW |
| Push уведомления только в браузере | `pushNotifications.ts` | 🟢 LOW/DESIGN |
| UUID/TEXT мисматч в FK | `migration_v1.sql` | 🟢 LOW |
