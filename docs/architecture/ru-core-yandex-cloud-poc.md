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
- **Does NOT fit (later, on prod budget):** Managed PostgreSQL as a separate
  service (would consume the grant alone), HA / replicas, ФСТЭК-attested segment.
- **PostgreSQL stays self-hosted inside the Supabase compose**, pinned to
  **17.x** (prod is 17.6 — dump compatibility is mandatory).
- **Cost control:** YC budget alert at 10,000 ₽; single VM; stop/destroy the VM
  at PoC end within the 2-month window; capture the Evidence Pack before teardown.

## Target stack (Yandex Cloud, synthetic)

| Need | Yandex Cloud service | PoC note |
|---|---|---|
| Compute | Compute Cloud VM (Docker) | single VM, self-hosted Supabase (GoTrue, PostgREST, Realtime, Storage API, Kong, Studio) |
| PostgreSQL | self-hosted in compose, **PG 17.x** | managed PG deferred (budget); pin version for dump compatibility |
| Object Storage | Object Storage (S3 API) | private buckets, **server-issued signed URLs**, object encryption |
| OTP | SMSAero (RU) | GoTrue Send-SMS hook |
| Secrets / KMS | Lockbox + KMS | minimal config; no secrets in code/logs (T12) |
| Audit | Audit Trails | enable for the PoC project (T15-adjacent) |
| Network | Security Groups, TLS, SSH keys, MFA on console | minimal perimeter (T11) |
| Backup/restore | YC backup + KMS-encrypted | RU, encrypted, restore drill (T6/T16) |
| Frontend | Vercel — **public static only, no PD** | all PD-API (`api/data`, `api/ai*`, `api/payments/*`, `api/auth/*`, sign-doc, support) run in RU or stay disabled for real users; moving Supabase alone does NOT localize PD if Vercel functions/logs see payload/JWT |

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
