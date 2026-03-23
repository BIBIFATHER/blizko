# Blizko — DNA (Real Code Audit)

> Auto-generated: 2026-03-22 | Source: codebase scan

---

## 1. Stack & Versions

| Dependency | Version | Role |
|---|---|---|
| `react` | ^19.2.3 | UI framework |
| `react-dom` | ^19.2.3 | DOM renderer |
| `react-router-dom` | ^6.30.3 | Client-side routing |
| `vite` | ^6.2.0 | Build tool / dev server |
| `typescript` | ~5.8.2 | Type system |
| `tailwindcss` | ^4.2.2 | Styling (v4, `@import "tailwindcss"`) |
| `@supabase/supabase-js` | ^2.95.3 | DB client (anon key, client-side) |
| `pg` | ^8.20.0 | DB pool (server-side, Vercel Functions) |
| `@google/genai` | ^1.33.0 | AI SDK |
| `@sentry/react` | ^10.38.0 | Error monitoring |
| `@capacitor/core` | ^8.2.0 | Mobile wrapper (iOS + Android) |
| `lucide-react` | ^0.561.0 | Icon library |
| `react-helmet-async` | ^3.0.0 | SEO / head management |
| `react-qr-code` | 2.0.15 | QR code generation |
| `@vercel/node` | ^5.5.16 | Serverless runtime |

**Deploy**: Vercel (production: www.blizko.app)
**Mobile**: Capacitor (iOS + Android configured)

---

## 2. Database Schema (Supabase PostgreSQL)

### Tables (13 total + 1 view)

| Table | Key Columns | Pattern | Source |
|---|---|---|---|
| `parents` | `id`, `user_id`, `payload` JSONB | Payload JSONB | migration_v1 |
| `nannies` | `id`, `user_id`, `payload` JSONB | Payload JSONB | migration_v1 |
| `bookings` | `id`, `parent_id`, `nanny_id`, `request_id`, `status`, `amount` | Relational | migration_v1 |
| `booking_confirmations` | `id`, `booking_id`, `type`, `status`, `due_at` | Relational | migration_v1 |
| `chat_threads` | `id`, `type` (support/match), `family_id`, `nanny_id` | Relational | migration_v1 |
| `chat_messages` | `id`, `thread_id`, `sender_id`, `text` | Realtime | migration_v1 |
| `chat_participants` | `thread_id`, `user_id`, `role` (PK: composite) | Relational | migration_v1 |
| `admin_actions` | `id`, `admin_id`, `action`, `meta` JSONB | Audit log | migration_v1 |
| `referrals` | `id`, `referrer_id`, `code`, `status`, `reward_given` | Relational | migration_v2 |
| `matching_outcomes` | `id`, `parent_id`, `nanny_id`, `outcome` (enum), `feedback_text` | RLHF | 20260311 |
| `support_tickets` | `id`, `family_id`, `status`, `sentiment_score`, `summary` | AI Support | 20260312 |
| `support_messages` | `id`, `ticket_id`, `sender_type`, `text` | Realtime | 20260312 |
| `payments` | `id`, `amount`, `currency`, `yk_payment_id`, `metadata` JSONB | Yookassa | SQL/payments |
| `analytics_events` | `id`, `event`, `properties` JSONB, `session_id`, `user_id` | Analytics | 20260315 + 20260322 RLS lock |

### Views

| View | Purpose |
|---|---|
| `nannies_public` | Strips PII (`contact`, `documents`, `resumeNormalized`) for client reads |

### Realtime

Enabled on: `chat_messages`, `support_tickets`, `support_messages`

---

## 3. Security — RLS Policies

> All tables have RLS enabled. 3 iterations: v1 → Shield3 → Security Remediation.

| Table | Policy | Rule |
|---|---|---|
| **parents** | own read/write/update/delete | `auth.uid() = user_id OR service_role` |
| **nannies** | `nannies_read_own` | `auth.uid() = user_id` (full, for editing) |
| | own insert/update | `auth.uid() = user_id OR service_role` |
| | admin delete | `service_role` only |
| **nannies_public** | view grant | `GRANT SELECT TO authenticated` |
| **bookings** | participant | `auth.uid() IN (parent_id, nanny_id)` |
| **chat_threads** | participant | `auth.uid() IN (family_id, nanny_id)` |
| **chat_messages** | thread participant | Subquery join |
| **support_tickets** | own or admin | `auth.uid() = family_id OR service_role` |
| **support_messages** | ticket owner | Subquery OR `service_role` |
| **matching_outcomes** | service only | `service_role` |
| **payments** | service only | `service_role` |
| **phone_otps** | service only | `service_role` |
| **referrals** | owner | `auth.uid() = referrer_id` |
| **analytics_events** | service only | `service_role` |
| **admin_actions** | service only | `service_role` |

---

## 4. Design System — Cloud Concept

### Colors (from `index.css`)

```css
--cloud-bg:             #f7f2e8
--cloud-surface:        rgba(255,251,245,0.86)
--cloud-text:           #332b22
--cloud-text-muted:     #8e8376
--cloud-brand:          #4e4032
--cloud-honey:          linear-gradient(135deg, #e9d6a1, #f5e8c8, #ead2a2)
--cloud-trust-green:    #16a34a
--cloud-trust-blue:     #0891b2
--cloud-warning:        #ca8a04
--cloud-error:          #dc2626
```

### Radii & Shadows

```css
--cloud-radius-card:    24px
--cloud-radius-btn:     9999px  /* pill */
--cloud-radius-input:   16px
--cloud-shadow:         0 16px 40px rgba(96,77,58,0.08)
--cloud-shadow-hover:   0 22px 54px rgba(96,77,58,0.12)
```

### Typography

- Body: `Inter` | Headings: `Manrope` (800, -0.03em) | Brand: `Georgia`
- Fluid: `clamp()` from `--text-xs` to `--text-4xl`

### Key Classes

`.btn-honey` (CTA), `.card-cloud` (glass card), `.input-glass` (glass input), `.trust-badge`, `.section-shell`, `.hover-lift`, `.app-shell` (max-width: 32rem)

---

## 5. Code Patterns

### Data: Dual-Write Offline-First (`services/storage.ts`)

- **Write**: `saveWithFallback()` → Supabase upsert + localStorage sync
- **Read**: remote-first, merge with pending local writes
- **Offline queue**: pending sync IDs tracked per table
- **Auth guard**: `getCurrentUserId()` before every write

### API: Vercel Serverless (`/api/*`)

| Route | Purpose |
|---|---|
| `ai.ts` | Gemini proxy (retry + model fallback) |
| `ai-support.ts` | AI concierge |
| `data.ts` | CRUD + analytics |
| `notify.ts` | Email (Resend) / SMS (SMSAero) |
| `payments/*` | Yookassa |
| `telegram/*` | Bot notifications |

Server DB: `pg.Pool` via `_db.ts`

### TypeScript Types (`src/core/types/types.ts`)

Core: `ParentRequest`, `NannyProfile`, `Booking`, `MatchResult`, `MatchCandidate`, `Review`, `DocumentVerification`, `SoftSkillsProfile`, `NannyRiskProfile`, `ParentRiskProfile`

### i18n

`ru` | `en` via `src/core/i18n/translations.ts`, access: `t[lang].key`
