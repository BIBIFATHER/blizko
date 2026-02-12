# MEMORY.md

- Проект Blizko: контекст/принципы — объяснимый AI, безопасность как продукт, человек принимает решение, няни — партнёры. Проектный промпт зафиксирован в BLIZKO_PROMPT.md; краткий фокус добавлен в SOUL.md.
- OpenClaw: настроен Telegram бот, pairing подтверждён (telegram user id 329953714).
- Репозиторий проекта: /Users/anton/Desktop/blizko 3 (Vite+React, Supabase, Vercel API routes).
- Первичный аудит: риск утечки VITE_GEMINI_API_KEY на клиенте; OTP хранится в памяти serverless; /api/notify без auth; Twilio endpoints лишние; проверить RLS Supabase.
