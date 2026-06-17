# Live PD exposure audit — 2026-06-17

Read-only audit of the live `www.blizko.app` site to prove the real goal:
**zero EXTRA marketing/behavioral live-collection + closed real-user entry +
documented minimal technical processing.** Companion to BLI-119/120.

Scope note: literal "zero live-collection" is impossible — Cloudflare/Vercel IP
logs, the CDN, server logs, and Sentry (error-only) are unavoidable technical
traces. The bar is no *extra* behavioral/marketing collection and a proven
closed entry.

## C — Supabase Auth (project `geomyyfjvemdphaeimkz`, EU)

Read GoTrue `/auth/v1/settings` + `auth.users` (aggregated, PD masked) + security
advisors.

| Check | Finding |
| --- | --- |
| **`disable_signup`** | **`false` — open email signups ENABLED.** A stranger can register; their email lands in prod `auth.users`. Entry is NOT closed at the project level. |
| `mailer_autoconfirm` | `false` — email confirmation required (partial mitigation; the account row is still created on signup). |
| GoTrue phone provider | `false` — disabled; phone OTP runs through the custom `api/auth/phone.ts` + Twilio, not GoTrue. |
| `anonymous_users` | `false` (good). |
| Existing users | 3 total, all confirmed/active — **all owner accounts** (yandex + gmail = owner; `phone_*@blizko.local` = phone-OTP placeholder). No third-party registrations. |

**Verdict:** entry is empirically clean (only owner) but the door is open at
config. The client synthetic guard + server admission gate limit what a stranger
can DO, but signup still writes a real email into `auth.users`.

Secondary posture (pre-real-data, currently synthetic):

- public buckets `nanny-photos` / `nanny-videos` allow listing (`anon` broad SELECT).
- `anon` / `authenticated` can SELECT many PD tables via PostgREST/GraphQL (rows still RLS-gated).
- leaked-password protection disabled; 2 functions with mutable `search_path`;
  `nannies_public` is a SECURITY DEFINER view; one anon-executable SECURITY DEFINER RPC.

## A' — live third-party loaders

| Loader | Status |
| --- | --- |
| **PostHog** | **NOT loaded.** No `posthog-js` import, no `posthog.init`, no `VITE_POSTHOG*` env, no snippet in `index.html`. Only a guarded `if (window.posthog) window.posthog.capture(...)` — dead unless an external injector adds `window.posthog` (none found). No live autocapture. |
| Yandex Metrica | Removed (BLI-120). Live HTML verified clean. |
| **Cloudflare Insights** | **LIVE** — `static.cloudflareinsights.com` beacon + `cf-nel` reporting (auto-injected by Cloudflare when Web Analytics/Browser Insights is ON). Behavioral RUM → disable in the Cloudflare dashboard. |
| **Google Fonts** | **LIVE** — `fonts.googleapis.com` + `fonts.gstatic.com`; visitor IP to Google on every load. Fix: self-host the fonts. |
| Cloudflare proxy | Live (CDN/WAF, server: cloudflare) — sees all visitor IPs. Unavoidable infra processor; documented. |
| Sentry | Error-only (BLI-117); SDK beacons only on error, scrubbed. |
| CSP | Was STALE (still allowed `mc.yandex.ru` + doubleclick after Metrica removal). **Cleaned this PR** — all Yandex/Metrica/doubleclick origins removed. |

## Action items

**Owner — dashboard (not code; cannot be done autonomously):**

1. **🔴 Critical — Supabase → Authentication → Email provider → disable
   "Allow new users to sign up"** (`disable_signup=true`). Closes the entry.
   Re-enable briefly only to create new test accounts.
2. Cloudflare → Web Analytics / Browser Insights → **OFF** (removes the behavioral beacon).
3. (optional) Supabase → Auth → enable leaked-password protection.

**Code (this PR + follow-ups):**

- ✅ CSP cleaned of Metrica/Yandex/doubleclick (`vercel.json`).
- ⏳ Self-host Google Fonts (remove `fonts.googleapis`/`gstatic` egress) — separate chunk (binary assets).
- ⏳ Tighten anon/authenticated SELECT grants + public-bucket listing before real data — separate DB hardening slice (advisors above).

Tracking note: Linear MCP was disconnected at audit time; these belong under the
BLI-110 egress epic (BLI-119 entry/geocode, BLI-120 analytics/loaders) — sync to
Linear when reconnected.
