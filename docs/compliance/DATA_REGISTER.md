# Blizko Data Register

Status: agent-maintained working register
Last evidence review: 2026-06-16
Owner: Claude/Codex operating process

Agents update this file from code, migrations, configuration, provider evidence,
and runtime verification. Anton is not expected to maintain it manually.

**Operating mode — synthetic-only closed contour (until RU-core).** The app runs
as a closed dev/staging environment on synthetic data only. Real-user admission
is closed server-side (`BLIZKO_SYNTHETIC_ONLY`, only allow-listed test phones);
real personal data and production payments are forbidden until RU-core + owner
Go. All product features (forms, photo, documents, video, AI, matching, chat,
support, bookings) remain enabled and operate on fictional test data. Because no
real subject is admitted, the flows below process synthetic data in this phase.

| Domain | Subjects | Data | Class | Purpose | Collection / first write | Storage / processing | External flow | Retention / deletion | Current status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth | parents, nannies, staff | phone, email, user ID, session/JWT metadata | Personal | registration and access | browser/OTP API -> Supabase Auth | Supabase EU currently; API via Vercel | SMSAero for OTP | Identity deletion and backup evidence pending | `Blocked for legal Go`: RU first-write position unresolved |
| Jurisdiction routing | all users | jurisdiction, policy version, verified phone-country and declared residency/citizenship, minimized advisory IP/locale/timezone, pin and audit | Personal; online identifiers | route data plane, AI, consent, retention, and processors | server at/after Auth | RU core target; no personal-data plane for `UNKNOWN`/`EU` | None; external geo prohibited unless registered | Account lifetime plus immutable audit; short retention for advisory signals | `Conditional`: fail-closed `UNKNOWN`; geo source must be internal/offline or separately registered |
| Nanny warm pool | prospective nannies | source reference, first name, broad area, experience/schedule/rate summary, contact status, recontact permission, operational dates/note | Personal; minimized recruiting data | resume interrupted conversations and invite a small closed-pilot cohort | manual entry after source-platform contact | encrypted local registry; key in macOS Keychain | Full resume/contact remains in source platform; no AI or Supabase EU flow | Delete on objection/refusal; purge all records not updated for 90 days | `Conditional`: later outreach only for explicit recontact `yes`; no documents, direct contacts, health data, full resumes, scoring, scraping, or bulk messaging |
| Parent profile | parents, children | location, child age, schedule, budget, requirements, comment, contact | Personal; child-related | matching and service delivery | browser -> Supabase `parents` | Supabase EU; local fallback may exist | AI support may receive selected context | Full retention/backups proof pending | `Conditional`: minimize child data and resolve RU contour |
| Nanny profile | nannies (synthetic) | name, contact, photo, video, documents, location, experience, preferences | Synthetic test data in this phase | profile, matching, verification | browser -> Supabase `nannies`/Storage | Supabase EU (test contour) | Full profile incl. fictional documents/photo/video retained for testing; `nannies_public` uses a short key denylist (explicit allowlist still required before payload extension) | Test-data retention; no real-PD obligation in this phase | `Synthetic-only`: real nanny PD forbidden until RU-core |
| Verification documents | nannies (synthetic) | fictional passport/medical/recommendation test files, extracted fields | Synthetic test data in this phase | identity and trust verification testing | upload -> private Supabase Storage | Supabase EU private bucket (test contour) | Enabled for synthetic documents; external-AI document analysis runs on fictional files only | Test-data retention | `Synthetic-only`: real/identity documents forbidden until RU-core |
| Chat and support | parents, nannies, staff (synthetic) | messages, family context, identifiers, sentiment/summary | Synthetic test data in this phase | support and communication | browser -> Supabase chat/support tables | Supabase EU/Realtime; Vercel AI support | AI support + Telegram handoff enabled on synthetic data only | Test-data retention | `Synthetic-only`: real chat PD forbidden until RU-core |
| Bookings | parents, nannies | participants, schedule/date, status, amount | Personal; transactional | service coordination | browser/API -> Supabase | Supabase EU | notifications may receive limited fields | Post-completion retention pending | `Conditional`: notification payload inventory pending |
| Payments | payer/customer | payment ID, amount, currency, order/user metadata, email/phone where used | Personal; financial metadata | payment and reconciliation | Vercel API -> YooKassa + database | YooKassa and Supabase/Postgres | YooKassa | Accounting/provider retention split pending | `Conditional`: verify exact production fields |
| Analytics | visitors/users | event, properties, URL, session ID, optional user ID, IP/cookies | Personal/online identifiers | product analytics and reliability | browser -> API/providers | Supabase/Postgres, Yandex Metrica, Cloudflare | Yandex/Cloudflare | Event retention and property allowlist pending | `Conditional`: prohibit free-text/PII properties |
| Security/error logs | users, staff | event metadata, IDs, URL, stack traces, request context | Personal if identifiable | security and debugging | API/browser/runtime | audit log, Vercel, Sentry | Sentry/Vercel/Cloudflare | Provider/app retention pending | `Conditional`: browser Sentry = error events only; performance tracing + Session Replay + release-health BrowserSession DISABLED until RU-core (no span/replay/session-envelope egress; `tracesSampleRate:0` + `beforeSendTransaction` drop + integrations filter removes BrowserSession/Replay/BrowserTracing). Error `beforeSend`/`beforeBreadcrumb` (`sendDefaultPii:false`) redact email/phone/id/uuid + strip URL query in message, exception, transaction, request, contexts, tags, extra, fingerprint, breadcrumbs; user dropped, console crumbs dropped. Vercel function-log PII review + provider retention still pending |
| AI-derived assessments | parents, nannies (synthetic) | soft-skill/risk summaries, extraction, matching/support output | Synthetic test data in this phase | assistance and matching | application -> Gemini -> application | vendor plus Supabase/local state | Google Gemini — enabled on synthetic/fictional data only (closed contour, no real subjects admitted). `documentAi` never returns a false `verified`; no unconditional `ai_checked` trust badge | Test-data; historical egress (prior owner/synthetic test traffic) inventory pending | `Synthetic-only`: real-user/child data to external AI forbidden until RU-core + cross-border gate |
| Geocoding | visitors/users | free-text address query or reverse GPS `lat/lon`; synthetic test locations only in this phase | Personal (location) when real; synthetic in this phase | address autocomplete and reverse geocoding in forms | browser -> unauthenticated `/api/geocode` | no persistence; stateless pass-through | Yandex Geocoder + Nominatim — egress fail-closed via `BLIZKO_GEOCODE_EGRESS_GATE_OPEN` (default closed); allowed only in the synthetic contour | None stored by Blizko; provider-side retention pending | `Synthetic-only/default-closed`: real address/GPS egress requires gate open + Yandex/Nominatim in PROCESSOR_REGISTER + legal acceptance for the unauthenticated public path (or auth/jurisdiction routing) |

## Classification

- `Public`: intentionally public and verified to contain no personal data.
- `Internal`: operational data without user personal data.
- `Personal`: identifies or can reasonably relate to a person.
- `Restricted`: documents, credentials, private communications, precise
  identity/contact data, child-related sensitive context, or high-impact
  profiling.

When uncertain, classify upward.

Any new field, event, table, bucket, endpoint, AI prompt, log context, vendor,
country, purpose, or retention behavior requires an update in the same change.
