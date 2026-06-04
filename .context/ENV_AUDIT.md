# Vercel Env Vars Audit (BLI-23)

Все переменные извлечены из кода. Проверить и проставить в Vercel Dashboard → Settings → Environment Variables.

## 🔴 Критические (без них прод не работает)

| Переменная | Где используется | Примечание |
|---|---|---|
| `VITE_SUPABASE_URL` | клиент (auth, DB) | URL проекта Supabase |
| `VITE_SUPABASE_ANON_KEY` | клиент | anon/public ключ |
| `SUPABASE_URL` | API (auth verify, support) | тот же URL, server-side |
| `SUPABASE_SERVICE_ROLE_KEY` | API | service_role ключ — секрет |
| `DATABASE_URL` | API (`_db.ts`) | прямой Postgres connection string |
| `GEMINI_API_KEY` | API (ai.ts, ai-support.ts) | без него AI не работает |
| `VITE_SENTRY_DSN` | клиент | ошибки в Sentry |
| `CORS_ALLOW_ORIGINS` | все API (`_cors.ts`) | без него CORS = `*` (риск) |
| `CRON_SECRET` | api/cron/* | без него cron открыт |
| `ADMIN_EMAILS` | `_auth.ts`, `notify.ts` | email(ы) администраторов через запятую |

## 🟡 Важные (функции деградируют без них)

| Переменная | Где используется | Примечание |
|---|---|---|
| `RESEND_API_KEY` | `notify.ts` | email-уведомления |
| `RESEND_FROM_EMAIL` | `notify.ts` | отправитель (дефолт: no-reply@blizko.app) |
| `NOTIFY_TOKEN` | `notify.ts` | server-to-server уведомления |
| `TELEGRAM_BOT_TOKEN` | `ai-support.ts` | эскалация в поддержку |
| `TELEGRAM_ADMIN_CHAT_ID` | `ai-support.ts` | куда слать эскалацию |
| `YOOKASSA_SHOP_ID` | `payments/` | платежи YooKassa |
| `YOOKASSA_SECRET_KEY` | `payments/` | платежи YooKassa — секрет |
| `APP_URL` / `PUBLIC_APP_URL` | ссылки в письмах | можно = `VERCEL_PROJECT_PRODUCTION_URL` |

## 🟢 Build-time (только для деплоя, не для рантайма)

| Переменная | Где используется | Примечание |
|---|---|---|
| `SENTRY_AUTH_TOKEN` | `vite.config.ts` | загрузка source maps |
| `SENTRY_ORG` | `vite.config.ts` | организация в Sentry |
| `SENTRY_PROJECT` | `vite.config.ts` | проект в Sentry |

## ⚪ Опциональные

| Переменная | Примечание |
|---|---|
| `GEMINI_MODEL` | override модели для общего AI |
| `GEMINI_SUPPORT_MODEL` | override модели для поддержки |
| `YANDEX_GEOCODER_API_KEY` | геокодирование (фолбэк на Nominatim) |
| `SMSAERO_EMAIL` / `SMSAERO_API_KEY` / `SMSAERO_SIGN` | SMS OTP через SMSAero |
| `VITE_ENABLE_PHONE_AUTH` | фича-флаг телефонной авторизации |
| `VITE_AI_ENABLED` | фича-флаг AI |
| `VITE_FLAG_NANNY_MATCHING` | фича-флаг матчинга |
| `VITE_FLAG_NANNY_MESSAGING` | фича-флаг мессенджера |
| `VITE_SUPABASE_DOCS_BUCKET` | имя бакета документов (дефолт: nanny-documents) |
| `VITE_SUPABASE_PHOTOS_BUCKET` | имя бакета фото (дефолт: nanny-photos) |
| `VITE_SUPABASE_VIDEO_BUCKET` | имя бакета видео |
| `TEST_OTP_PHONE` | только для тестов |
| `PGSSLMODE` | SSL режим для pg (обычно `require`) |

## Авто-инжектируемые Vercel (не надо ставить вручную)

- `NODE_ENV`
- `VERCEL_PROJECT_PRODUCTION_URL`
