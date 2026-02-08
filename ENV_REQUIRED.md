# ENV REQUIRED (Blizko)

## Client
- `VITE_GEMINI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Server
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Notifications (Resend)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (must use verified domain)
- `ADMIN_EMAIL`

## Optional (if phone auth by Twilio)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

## Notes
- Keep `.env.local` local only.
- Rotate leaked keys immediately.
