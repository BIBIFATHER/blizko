# ARCHITECTURE.md — архитектура Blizko

## Компоненты
- **Client (Vite + React)** — интерфейс пользователя
- **Serverless API (Vercel)** — backend endpoints
- **Supabase** — БД + Auth + Storage + RLS
- **AI Proxy (/api/ai)** — доступ к AI через сервер
- **Resend** — email‑уведомления
- **SMSAero** — SMS‑верификация
- **Sentry** — мониторинг ошибок

## Поток данных (упрощённо)
1) Пользователь заполняет форму → Client
2) Client сохраняет данные в Supabase
3) Для AI‑функций Client вызывает `/api/ai`
4) Serverless API обращается к AI‑провайдеру
5) Результат возвращается в Client и сохраняется в Supabase
6) Уведомления отправляются через Resend/SMSAero

## Безопасность
- Ключи только на сервере
- `.env` не в git
- RLS закрывает доступ per‑user
- `/api/notify` защищён токеном
