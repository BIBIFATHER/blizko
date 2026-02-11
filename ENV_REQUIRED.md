# ENV REQUIRED (Blizko)

## Client
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_AI_ENABLED` (optional, default true)
- `VITE_NOTIFY_TOKEN` (optional, **not secret**, if you want to protect /api/notify)

## Server
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTIFY_TOKEN` (optional, if set then /api/notify требует header `x-notify-token`)

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
