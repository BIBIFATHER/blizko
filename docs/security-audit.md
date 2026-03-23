# Security Audit — Blizko

**Дата:** 2026-03-07
**Аудитор:** AI Security Review

---

## ✅ Пройдено

| Проверка | Статус | Детали |
|---|---|---|
| **XSS** | ✅ Безопасно | Нет `dangerouslySetInnerHTML` или `eval()` в кодовой базе |
| **Секреты в коде** | ✅ Безопасно | Все через `import.meta.env` / `process.env` |
| **.gitignore** | ✅ Безопасно | `.env`, `.env.local`, `.env.*.local` — все в gitignore |
| **Supabase RLS** | ✅ Включено | Все 9 таблиц с RLS policies |
| **Admin auth** | ✅ Защищено | API endpoints проверяют JWT + email allowlist |
| **CORS handler** | ✅ Есть | `api/_cors.ts` используется во всех API |
| **Service Worker** | ✅ Безопасно | Отключён в dev, активен только в prod |

---

## ⚠️ Требует внимания

### 1. 🔴 Telegram BOT_TOKEN на клиенте

**Файл:** `src/services/telegram.ts`
**Проблема:** `VITE_TELEGRAM_BOT_TOKEN` — переменные с `VITE_` попадают в клиентский бандл.
**Риск:** Любой может извлечь токен из JS и отправлять сообщения от имени бота.
**Решение:** Перенести отправку в Edge Function / API route.

```diff
- const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '';
+ // Вызывать через серверный API: POST /api/telegram/send
```

### 2. 🟡 CORS: Access-Control-Allow-Origin: *

**Файл:** `api/data/parents.ts`, `api/data/nannies.ts`
**Проблема:** `res.setHeader('Access-Control-Allow-Origin', '*')` разрешает запросы с любого домена.
**Решение:** Ограничить до `https://blizko.app` в production.

### 3. 🟡 Service Role Key в API

**Файл:** `api/data/parents.ts`
**Проблема:** API использует `SUPABASE_SERVICE_ROLE_KEY` (полные права) для всех операций.
**Риск:** Если API скомпрометирован, атакующий получает полный доступ к БД.
**Решение:** Использовать service role только для admin операций, anon key для read.

### 4. 🟢 .env.example содержит примеры, не реальные ключи

**Статус:** OK — все значения placeholder. Но проверьте, что `.env` (реальный) точно не закоммичен:

```bash
git log --all --full-history -- .env
```

---

## Рекомендации на будущее

1. **CSP Headers** — добавить Content-Security-Policy в `vercel.json`
2. **Rate Limiting** — на API endpoints (особенно auth)
3. **Input Validation** — серверная валидация в API (сейчас доверяем клиенту)
4. **HTTPS only** — Vercel обеспечит, но добавить `Strict-Transport-Security`
5. **Dependency audit** — `npm audit` перед каждым деплоем
