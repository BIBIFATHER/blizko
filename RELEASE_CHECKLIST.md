# RELEASE CHECKLIST (Blizko)

## 1) Core product
- [ ] Parent flow: create/edit/resubmit request works
- [ ] Nanny flow: create/edit profile works
- [ ] Admin moderation: statuses + reject reason + history works
- [ ] Document upload/preview works for parent and nanny

## 2) Security
- [ ] No secrets in frontend code
- [ ] `.env.local` not committed
- [ ] Service keys rotated if leaked

## 3) Notifications
- [x] Resend domain is Verified
- [x] `RESEND_API_KEY` set
- [x] `RESEND_FROM_EMAIL` set to verified domain
- [x] `ADMIN_EMAIL` set
- [x] `curl /api/notify-test` returns `ok:true` (tested to `anton.anosovv@yandex.ru`)

## 4) Data / Supabase
- [ ] RLS enabled on parents/nannies
- [ ] Policies tested with authenticated user
- [ ] `user_id` is saved on write

## 5) UX checks
- [ ] Status labels are human-readable
- [ ] New moderation badge appears and can be marked read
- [ ] City autocomplete works
- [ ] Geolocation fallback works

## 6) Pre-deploy
- [ ] Build passes (`npm run build`)
- [ ] Smoke tests done (see `SMOKE_TESTS.md`)
- [ ] Commit created with release notes
