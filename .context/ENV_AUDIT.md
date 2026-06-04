# Vercel Env Vars Audit (BLI-23)

Реальное состояние проверено через `vercel env ls production`.

---

## ✅ Уже стоят (Production)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `CORS_ALLOW_ORIGINS`, `CRON_SECRET`, `ADMIN_EMAILS`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`,
`NOTIFY_TOKEN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `VITE_SENTRY_DSN`,
`POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, `POSTGRES_HOST`,
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `SMSAERO_*`, `VITE_ENABLE_PHONE_AUTH`

---

## 🔴 Отсутствуют — надо добавить

| Переменная | Значение | Окружение |
|---|---|---|
| `VITE_SUPABASE_DOCS_BUCKET` | `nanny-documents` | Production, Preview |
| `VITE_SUPABASE_PHOTOS_BUCKET` | `nanny-photos` | Production, Preview |
| `VITE_SUPABASE_VIDEO_BUCKET` | `nanny-videos` | Production, Preview |
| `APP_URL` / `PUBLIC_APP_URL` | `https://blizko.app` | Production |

---

## ⚠️ Проблемы

| Проблема | Что делать |
|---|---|
| `VITE_SENTRY_DSN` — только Production | Добавить в Preview тоже (ошибки в PR не пишутся) |
| `VITE_NOTIFY_TOKEN` — в Vercel есть, в коде нет | Удалить из Vercel (мусор) |
| `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY/PUBLISHABLE_KEY` — Next.js мусор | Удалить из Vercel |
| `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET` — нестандартные имена | Проверить нужны ли, удалить если нет |

---

## ⚪ Опциональные (отсутствуют, но есть дефолты в коде)

| Переменная | Примечание |
|---|---|
| `GEMINI_MODEL` | Дефолт из `_gemini.ts` |
| `GEMINI_SUPPORT_MODEL` | Дефолт из `_gemini.ts` |
| `YANDEX_GEOCODER_API_KEY` | Фолбэк на Nominatim |
| `PGSSLMODE` | По умолчанию `require` в pg |

---

## 🗑️ Платёжная система

`YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` — YooKassa заменяется другим сервисом.
API-файлы `api/payments/` нужно будет переписать под новый провайдер.
