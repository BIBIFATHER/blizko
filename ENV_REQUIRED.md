# ENV REQUIRED (Blizko)

## Client
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AI_ENABLED` (optional, default true)
- `VITE_NOTIFY_TOKEN` (optional, **not secret**, if you want to protect /api/notify)

## Server
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required for server-side OTP storage)
- `NOTIFY_TOKEN` (optional, if set then /api/notify требует header `x-notify-token`)
- `CORS_ALLOW_ORIGINS` (optional, comma-separated allowlist, e.g. https://blizko-3.vercel.app,http://localhost:5173)

## Notifications (Resend)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (must use verified domain)
- `ADMIN_EMAIL`

## Optional (phone verification by SMSAero)
- `SMSAERO_EMAIL`
- `SMSAERO_API_KEY`
- `SMSAERO_SIGN`

## Notes
- Keep `.env.local` local only.
- Rotate leaked keys immediately.
