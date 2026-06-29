# Blizko Risk Register

Durable risks that should survive individual tasks. Current task state still
lives in `.context/ACTIVE_TASK.md`; this file is for long-lived product,
legal/security, infrastructure, and launch risks.

| ID | Risk | Severity | Status | Evidence | Owner / Next Step |
|---|---|---:|---|---|---|
| RISK-001 | Supabase Auth open email signup may admit real users despite synthetic-only client/server guards. | P0 | Open | 2026-06-17 active-task audit records `disable_signup=false`; only 3 owner accounts found. | Anton must disable signups in Supabase dashboard and confirm; then verify config and session behavior. Linear: BLI-121. |
| RISK-002 | Cloudflare Web Analytics and edge logs can create live visitor telemetry outside Blizko's event schema. | P1 | Open | 2026-06-17 live-PD audit recorded Cloudflare Insights as a live loader. | Anton/project owner disables CF Web Analytics or accepts/document it; update registers. Linear: BLI-121/BLI-122. |
| RISK-003 | Google Fonts and Unsplash create third-party IP egress for live visitors. | P2 | Resolved | 2026-06-17: Google Fonts self-hosted via @fontsource (PR #40); Unsplash images self-hosted under `public/assets/` + dropped from CSP (PR #41). Both merged + prod-deployed; prod CSP has no fonts.*/unsplash, local hero 200. Cloudflare proxy/Insights remain (RISK-002, owner). | Closed. Remaining live egress = Cloudflare (RISK-002, owner dashboard). Linear: BLI-122. |
| RISK-004 | Published privacy policy may not fully describe current factual processing. | P1 | Partial | `/privacy` exists and Metrica was removed from policy in PR #38; completeness remains tracked. | Complete B legal draft package and factual policy sync. Linear: BLI-123. |
| RISK-005 | Geocode external egress cannot be opened for real users while `/api/geocode` remains unauthenticated/public without jurisdiction/legal acceptance. | P1 | Controlled | Gate is default-closed; legal assessment was Conditional-Go only. | Keep `BLIZKO_GEOCODE_EGRESS_GATE_OPEN` closed until counsel/security acceptance or auth/jurisdiction redesign. |
| RISK-006 | RU personal-data data plane is not yet proven for real pilot users. | P1 | In Progress | 2026-06-17: provider DECIDED — **Timeweb** for the ordinary-data pilot (cheap, 152-FZ); Yandex Cloud later for special categories (ФСТЭК/high УЗ). Phase 3 PoC not started (gated). | Build T1-T10 PoC on Timeweb (self-host Supabase) only AFTER A'/C/privacy quick gate + legal drafts. УЗ level needs ИБ confirmation before special-category go. |
| RISK-007 | Payment split/multipayout model needs real provider-backed validation before pilot scale. | P2 | Open | MEMORY.md records intended 80-85% nanny / 15-20% Blizko split; first closed pilot must validate cycle. | Validate provider flow during controlled pilot, after legal/data-plane gates. |
| RISK-008 | Special-category/document/children flows need counsel/security review before real-user processing. | P1 | Controlled | Synthetic-only contour is ON; legal/security protocol requires review before real data. | Keep real documents/health/sensitive processing closed until Phase 2+3 gates and counsel review. |
| RISK-009 | Supabase RLS/grant gaps: `chat_participants` INSERT lets any authenticated user join any thread (read others' chat); `support_messages` INSERT allows sender spoofing; broad `GRANT ALL` to anon/authenticated on PD tables. | P1 | Open | Codex review 2026-06-18 vs `00000000000000_remote_schema.sql` (chat_participants l.751, chat_messages SELECT l.627, support_messages l.669, GRANT ALL l.856/926, default privileges l.958); hardening plan PR #44; Linear BLI-124; `npm run check:chat-participants-rls-matrix` passed on `ca3e62a`. Synthetic-only now (only owner accounts) — not actively exploited. This is the sharpest DB/RLS vuln, NOT the sharpest product risk (that is RISK-001/BLI-121). | Migration `20260618090000` closes the two **INSERT exploit paths** (participant self-join + support sender spoof); verified locally (clean apply + `regression-guard-ok` + `matrix-ok`, 2026-06-29) and Codex `Confirmed with conditions` (conditions closed: rollback runbook `scripts/sql/rollback_20260618090000.sql`, `support_messages` pinned `TO authenticated`). **Still OPEN in this risk:** broad `GRANT ALL` to anon/authenticated (`remote_schema.sql` l.856/926) — NOT addressed by this migration; needs a separate least-privilege grant pass. Deploy of `20260618090000` gated on BLI-121 + owner prod-DDL approval + **BLI-134** (match-thread provisioning must set both `family_id`+`nanny_id` auth uids; otherwise hardening blocks the nanny self-join — found by Codex re-review 2026-06-29; 0 prod match threads today so no live break yet). Plan: `docs/architecture/supabase-security-hardening-plan.md`. |

## Severity

- `P0`: blocks opening users, release-readiness, or safety claims.
- `P1`: must be resolved before pilot or before opening the affected flow.
- `P2`: tracked follow-up; does not block synthetic-only development.
- `P3`: note / monitoring item.

## Maintenance Rule

When a risk changes status, update:

- this file;
- `.context/ACTIVE_TASK.md` if it affects current execution;
- `docs/compliance/DATA_REGISTER.md` or `PROCESSOR_REGISTER.md` when data or
  processors are involved;
- Linear when owner-visible action is required.
