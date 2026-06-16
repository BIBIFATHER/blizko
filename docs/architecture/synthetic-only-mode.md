# Synthetic-only closed contour (until RU-core)

Date: 2026-06-16
Status: active operating mode
Supersedes the BLI-105/BLI-106 "disable features" approach.

## Decision

Until RU-core is ready, Blizko runs as a **closed development/staging environment
on synthetic data only**. We do not strip or hide product functionality — we keep
the full app working for completion and testing, and we close the contour so that
no real user or real personal data can enter it.

## Principles

1. **Keep all features.** Forms, photo, documents, video, AI, matching, chat,
   support, admin, bookings, notifications stay fully enabled.
2. **All data in this contour is test data** — by construction, because real-user
   admission is closed. No per-record markers, domain allowlists, or user toggles.
3. **Real users, real PD, and production payments are forbidden** until RU-core +
   an explicit owner Go. Code enforces admission only. Real payments are not used
   in this development contour; the code does not verify test-vs-production
   YooKassa keys, so enabling real payments is a separate pre-open gate.
4. **Infra/config switch, not a rewrite.** Synthetic-only is two env flags plus a
   server admission gate. Turning it off after RU-core requires no UI or
   business-logic changes.

## Mechanism

| Concern | Implementation |
| --- | --- |
| Client mode | `VITE_SYNTHETIC_ONLY` (default ON) — `src/core/config/synthetic.ts` |
| Server mode | `BLIZKO_SYNTHETIC_ONLY` (default ON) — `api/_synthetic.ts` |
| Close admission (phone) | `api/auth/phone.ts` refuses OTP send/verify (403) for any phone not in the test allowlist while synthetic-only is ON |
| Close admission (email) | `AuthModal` blocks email magic-link sign-in for non-allow-listed emails. Email OTP goes directly to Supabase Auth, so this client gate is defense-in-depth — see hard enforcement below |
| Close existing sessions | authenticated server external-egress APIs (`api/ai.ts`, `api/ai-support.ts`) reject a non-allow-listed identity via `identityAdmissionClosed` (covers restored sessions / existing JWTs, not just new logins); the client (`useAuthSession`, `AuthModal`) signs out a non-allow-listed restored session |
| Close admission (payments) | `api/payments/create.ts` and `finalize.ts` reject a non-allow-listed identity before any YooKassa egress |
| Test accounts | phones: `SYNTHETIC_TEST_PHONES` / `VITE_SYNTHETIC_TEST_PHONES` ∪ `TEST_OTP_PHONE`; emails: `SYNTHETIC_TEST_EMAILS` / `VITE_SYNTHETIC_TEST_EMAILS`. Identity matched by email or by the phone-OTP placeholder email `phone_<digits>@blizko.local` |
| Visible marking | none — internal env flags + server guards only; no in-product banner or admin TEST badge (the contour is not turned into a visible "test stand") |
| Fail-closed | flags default ON; only the literal `'false'` disables, so a missing/misconfigured value keeps the contour closed |

## Kept guards (independent of mode)

- `documentAi` never returns a false `verified` on AI failure/partial pass
  (status `pending`); verification stays an explicit curator action.
- No unconditional `ai_checked` trust badge (an AI gloss is not verification).

## Pre-real-data checklist (not a development blocker)

Development and testing on synthetic data proceed now. The items below are **not**
blockers for building/testing — they are a checklist to complete **before
admitting any real user or real personal data** (i.e. when turning the contour
off). Application code already closes new logins, server-side AI/payment egress,
and restored sessions in the client/UI; these two enforcement points are
Supabase-side and need an explicit owner Go:

- [ ] **Disable/restrict open email signups** in the Supabase Auth project config
      (and/or add a GoTrue before-user-created hook). The email magic-link path
      goes client → Supabase Auth directly.
- [ ] **Revoke existing Supabase sessions / non-allow-listed users.** Direct
      client→Supabase writes are bounded by RLS, not by this contour, so lingering
      sessions should be revoked at the provider.
- [ ] **Production payment gate.** Decide test-vs-production YooKassa keys
      explicitly, and add a payment-webhook admission/identity guard (the webhook
      is unauthenticated by design — verify signature + bind to an admitted
      order) before real payments are enabled.
- [ ] **Outbound notifications guard.** If real users are admitted, ensure
      notify / Telegram / Email (Resend) paths do not send real personal data
      until reviewed; today they only carry synthetic content.

Context: per the read-only prod inventory (2026-06-13) there are no third-party
real users today — only owner-test + synthetic data — so there is nothing to
revoke yet; these are steps for the open-admission moment, not now, and they do
not block development or BLI-110 / RU-core work.

## Turning it off (post RU-core, owner Go only)

1. RU-core ready, data migrated (copy → verify → switch → owner-approved EU
   delete, BLI-104).
2. Set `BLIZKO_SYNTHETIC_ONLY=false` and `VITE_SYNTHETIC_ONLY=false`.
3. Complete the pre-real-data checklist above.
4. Open admission (remove/raise the test allowlist).
5. Connect production payments via an explicit production payment gate.
6. Re-run legal/security + Claude/Codex review before admitting real users.

## Out of scope (no rewrite-debt added)

No per-record synthetic flags, no domain allowlists, no second data plane, no
temporary Photo Vault, no feature removal.
