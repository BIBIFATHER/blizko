# Blizko — Kanban (To‑Do / Doing / Done)

## Doing
- SMSAero (OTP) — в процессе (ждём договор)
- Airtable / Google Sheets — воронка откликов + SLA

## Done (code exists / verified)
- Supabase (DB/Auth/Storage) подключен
- Vercel (API/Hosting) подключен
- Resend (Email) подключен + домен верифицирован
- Sentry (Errors) подключен
- AI Provider (matching/document) подключен
- Telegram Ops канал используется
- Ops‑документы подготовлены (регламент/шаблоны/чек‑листы)
- Email pipeline проверен: notify‑test ok + DNS для send.blizko.app
- UI: ParentForm / NannyForm / AuthModal / UserProfileModal / AdminPanel / DocumentUploadModal — присутствуют в коде
- API: /api/notify и /api/notify-test — присутствуют в коде
- API: /api/auth/send-otp-phone и /api/auth/verify-otp-phone — есть вызовы в UI

## To‑Do (needs verification / pending)
- Release checklist: Parent flow (create/edit/resubmit)
- Release checklist: Nanny flow (create/edit profile)
- Release checklist: Admin moderation (statuses + reject reason + history)
- Release checklist: Document upload/preview (parent + nanny)
- Security: secrets not in frontend, .env.local not committed, rotate keys if leaked
- Supabase: RLS enabled + policies tested + user_id saved on write
- UX: status labels human‑readable; new moderation badge; city autocomplete; geolocation fallback
- Pre‑deploy: build passes; smoke tests; release commit with notes
- Product analytics (PostHog)
- KPI‑дашборд (Metabase / Looker Studio)
- ЮKassa / CloudPayments (Payments)
- CRM (HubSpot light)
- OCR/MRZ + Face‑match
- OSINT checks
- Push notifications (T‑24ч/T‑3–4ч)
- App Store readiness (Capacitor + TestFlight)
- App Store release
