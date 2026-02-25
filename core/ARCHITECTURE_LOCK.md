# ARCHITECTURE LOCK — Stage 0

## Stack (locked)
- Frontend: Vite / React
- Backend: Vercel API
- DB: Supabase
- AI: server-side only
- Payments: ЮKassa
- Observability: Sentry

## Security Rules
- AI только через сервер
- RLS включён
- Secrets не во фронте
- Логи обязательны

## Forbidden until Stage 1+
- OCR automation
- AI Phase B–C
- Push notifications
- App Store / Capacitor
