# RU data-plane PoC — Yandex Cloud (Phase 3) — DRAFT

Date: 2026-06-30. **Plan for owner review.** Supersedes the Timeweb direction
(`docs/architecture/ru-poc-plan-timeweb.md`) after Yandex Cloud approved a
**10,000 ₽ / 2-month grant**. Operationalizes memo §C (T1–T16) on Yandex Cloud.

## Status

- **Conditional Go — synthetic-only PoC** (no real personal data, no production).
- **No-Go — real-user migration** until BLI-121 (close signups), BLI-124 (RLS
  hardening deploy) + BLI-134 (chat provisioning), legal drafts / privacy / RKN
  (BLI-123), and T0–T16 evidence are complete.
- Blizko data profile (nannies + **children** + **documents**) is high-sensitivity
  → real-user RU go-live needs **high УЗ + ФСТЭК-attested segment + ИБ assessment**,
  which the 10k grant and a single VM do NOT cover. The grant funds the PoC only.

## Why Yandex now (vs Timeweb)

Timeweb was chosen earlier purely on price. The grant removes that constraint for
a 2-month window and gives a single managed-cloud path that can later extend to
the ФСТЭК/high-УЗ segment for special categories. Decision recorded in RISK-006.

## Grant budget reality (10,000 ₽ / 2 mo ≈ 5,000 ₽/mo)

This is a **PoC budget, not production**.

- **Fits:** one Compute VM (~2 vCPU / 4–8 GB RAM / 20–30 GB SSD) running
  self-hosted Supabase in Docker; Object Storage (current 13 MB → negligible).
- **PostgreSQL — decision pending two checks (console shows Managed PostgreSQL IS
  available):** prefer **Managed Service for PostgreSQL** (built-in backup/PITR →
  closes T6/T16 cleanly) IF (a) it offers **PG 17.x** (prod is 17.6 — dump
  compatibility mandatory; YC often lags a version) AND (b) a burstable (b-class)
  tier fits ~5,000 ₽/mo. Otherwise **fallback to self-host PG 17 in the Supabase
  compose** on the VM. Pin 17.x either way.
- **Does NOT fit (later, prod budget):** HA / replicas, ФСТЭК-attested segment.
- **Cost control:** YC budget alert at 10,000 ₽; minimal tiers; stop/destroy
  compute at PoC end within the 2-month window; capture Evidence Pack before teardown.

## Target stack (Yandex Cloud, synthetic)

| Need | Yandex Cloud service | PoC note |
|---|---|---|
| Compute | Compute Cloud VM (Docker) | single VM, self-hosted Supabase (GoTrue, PostgREST, Realtime, Storage API, Kong, Studio) |
| PostgreSQL | **Managed Service for PostgreSQL** (preferred, if 17.x + burstable fits budget) ELSE self-host PG 17.x in compose | managed gives built-in backup/PITR (T6/T16); **verify YC managed offers 17.x** before choosing |
| Object Storage | Object Storage (S3 API) | private buckets, **server-issued signed URLs**, object encryption |
| OTP | SMSAero (RU) | GoTrue Send-SMS hook |
| Secrets / KMS | Lockbox + KMS | minimal config; no secrets in code/logs (T12) |
| Audit | Audit Trails | enable for the PoC project (T15-adjacent) |
| Network | Security Groups, TLS, SSH keys, MFA on console | minimal perimeter (T11) |
| Backup/restore | YC backup + KMS-encrypted | RU, encrypted, restore drill (T6/T16) |
| Frontend | Vercel — **public static only, no PD** | all PD-API (`api/data`, `api/ai*`, `api/payments/*`, `api/auth/*`, sign-doc, support) run in RU or stay disabled for real users; moving Supabase alone does NOT localize PD if Vercel functions/logs see payload/JWT |

### AI plane (Yandex AI Studio) — strategic note, separate track

YC console shows **Yandex AI Studio** with an **OpenAI-compatible API**, **Vision OCR**,
SpeechKit, Translate, and models (YandexGPT 5.1 Pro, Qwen3.6, DeepSeek). This is a
**RU-resident replacement for Google Gemini** and directly addresses the cross-border
AI gate (RISK-008, `BLIZKO_CROSS_BORDER_AI_GATE_OPEN` / `BLIZKO_SENSITIVE_AI_FLOW_GATE_OPEN`):
- moving AI inference to YC AI Studio keeps prompts/document images inside the RU
  contour instead of egressing to Gemini (EU/US);
- Vision OCR is relevant to nanny-document flows (special category — still gated on ИБ/УЗ);
- the OpenAI-compatible API means `api/ai*` could switch with minimal code change.

**Not in this PoC scope** (PoC = data-plane stack on synthetic). Tracked as a
follow-up: evaluate YC AI Studio as the RU AI processor, add to PROCESSOR_REGISTER
when adopted, keep gates default-closed until legal/ИБ sign-off. Billing for AI
Studio is not yet bound in the console.

## T1–T16 acceptance (synthetic) — unchanged from memo §C

Inherits the full matrix from `ru-poc-plan-timeweb.md` (T0–T16): SMS→Auth→session,
JWT→PostgREST→RLS, private Storage signed-URL + owner-auth, S3 backend, Realtime,
backup→restore→checksum, secret rotation, RU latency, user migration, full
account deletion (DB + Storage + backups), provider/processor evidence (T0),
network perimeter (T11), KMS/secret encryption (T12), deny-by-default RLS/grants
(T13), signed-URL owner authorization (T14), logs without payload (T15), encrypted
backup + PITR + incident tabletop (T16). Each T# emits an Evidence Pack entry
(`.context/EVIDENCE_PACK_TEMPLATE.md`).

## Order (after unblock)

1. YC: VM + Object Storage bucket + Lockbox/KMS + budget alert (owner: access + grant binding).
2. Deploy self-hosted Supabase (Docker compose), PG 17.x, wire SMSAero hook.
3. Import schema (8 migrations) + synthetic data; configure private buckets + signed URLs.
4. Run T0–T16 on synthetic; record Evidence Pack.
5. Produce EU→RU migration plan (memo §D) — NOT executed in this PoC.
6. Stop/destroy VM before grant end; preserve evidence.

## Boundaries — what this PoC does NOT prove

- NOT PD localization, NOT pilot readiness — only stack compatibility on synthetic.
- Single-VM, no HA — PoC only; prod needs HA, monitoring, privileged audit, backup
  schedule, verified restore, runbook.
- ФСТЭК/УЗ for special categories (children/documents) NOT covered — separate ИБ +
  budget track.
- No real PD, no production cutover, no Jurisdiction Router break (RU→ru-core YC,
  EU = placeholder).

## Dependencies / blockers

- **Owner:** YC console access + grant binding; BLI-121; legal-draft review.
- **ИБ:** ИСПДн protection level (for special categories, later).
- Memo: `docs/ru-data-contour-decision-memo.md` §C/§D.

**Status:** draft plan. PoC start — after YC access; synthetic PoC may begin
without BLI-121. Real users remain No-Go per the gates above.
