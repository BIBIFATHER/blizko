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

## Optional (phone verification by SMSAero)
- `SMSAERO_EMAIL`
- `SMSAERO_API_KEY`
- `SMSAERO_SIGN`

## Notes
- Keep `.env.local` local only.
- Rotate leaked keys immediately.
