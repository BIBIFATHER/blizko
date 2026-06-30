# BLI-134 — Match-chat thread provisioning (server-side) — Design

Date: 2026-06-30 · Linear: BLI-134 · Blocks: BLI-124 deploy · Related: RISK-009.

## Problem

Match-chat provisioning is entirely client-side in `src/services/matchChat.ts` (the
only writer of `chat_threads` / `chat_participants`). Its sole caller
`NannyChatModal` (from `BookingsTab`, opened by BOTH roles) never passes
`otherUserId`, so on create `chat_threads.nanny_id` is `NULL` and the nanny branch
produces a malformed thread (`family_id = nanny uid`).

After the BLI-124 hardening migration, `can_current_user_join_thread` authorizes a
nanny self-join only when `chat_threads.type='match' AND nanny_id = auth.uid()`.
With `nanny_id = NULL` the nanny cannot self-join → match chat breaks for the nanny.
Prod has 0 match threads today (synthetic-only), so no live break yet, but it must
be fixed before BLI-124 deploy / real users.

## Verified facts

- `bookings.parent_id` + `bookings.nanny_id` are both `auth.users.id` (FK-enforced)
  → reliable source of both auth uids. Booking is created by the curator
  (`AdminCuratorTab.tsx:94-95`).
- `chat_threads` RLS: `threads_insert_v2 WITH CHECK (auth.uid() = family_id)` —
  only family can INSERT; `threads_select_v2 USING (auth.uid() = family_id)` —
  nanny cannot even see the thread (hence the SECURITY DEFINER helper in BLI-124).
- `chat_threads.match_id` is `text`, nullable, with **no unique constraint**.
- API has `verifyBearerUser(req)` (`api/_auth.js`) and a service-role pattern
  (`api/data.ts`).

## Decision: server-side provisioning (option B)

Client must NOT create `chat_threads` anymore. A new service-role endpoint
provisions the thread authoritatively from the booking, so it is robust to either
side opening the chat first (nanny-first works). Participant self-join stays
client-side (BLI-124 helper authorizes each side by `thread.family_id`/`nanny_id`).

### Endpoint — `api/match-chat.ts`

- `POST` body `{ bookingId }`, auth = Bearer JWT.
- `verifyBearerUser(req)` → `uid`.
- Service-role read `bookings` by id → `parent_id`, `nanny_id`.
- **Authorization:** `uid ∈ {parent_id, nanny_id}` else `403`; `404` if booking missing.
- Idempotent upsert `chat_threads` (`type='match'`, `match_id=bookingId`,
  `family_id=parent_id`, `nanny_id=booking.nanny_id`) → return the thread row.
- No payload/PII logging (DB protocol Phase 3); structured error on failure.

### Client — `src/services/matchChat.ts`

- `getOrCreateMatchThread` calls the endpoint instead of direct `chat_threads`
  insert; remove the `familyId = otherUserId||currentUserId` / `nanny_id` branch
  and the `otherUserId` param path.
- Keep `ensureSelfParticipant` (each side self-joins after provisioning).

### Migration — idempotency

`CREATE UNIQUE INDEX chat_threads_match_uniq ON public.chat_threads (match_id)
WHERE type = 'match' AND match_id IS NOT NULL;`
Prevents duplicate threads on concurrent first-open. Additive; exact postcondition
check + rollback runbook (drop index) per DB protocol.

## Tests (role-correct)

- family provisions → thread has both uids; nanny provisions first → same thread (idempotent).
- outsider (not booking participant) → 403.
- after provisioning: family self-join OK, nanny self-join OK (DEFINER helper), outsider blocked (mirror `chat_participants_rls_matrix.sql`).
- endpoint: missing booking → 404; missing/invalid JWT → 401.

## Deploy order (removes BLI-134 as a BLI-124 blocker)

1. Ship provisioning endpoint + client change + unique-index migration.
2. Backfill `nanny_id IS NULL` match threads (0 in prod → no-op; documented).
3. THEN apply BLI-124 hardening migration (nanny self-join already works).

## Gates

DB protocol (chat_threads + migration), legal/security (PD/chat endpoint),
Codex review before deploy. Owner approval for prod DDL/deploy.

## Rollback

- Endpoint/client: revert commit (client falls back to broken-but-current behavior; acceptable pre-real-users).
- Migration: `DROP INDEX chat_threads_match_uniq;` (runbook).

## Self-adversarial review (2026-06-30 — does NOT replace the Codex gate, which is blocked on Codex usage limit until ~Jul 30)

1. **Booking status:** `bookings.status` ∈ {pending,confirmed,active,completed,cancelled}.
   Decision: status does NOT block provisioning — chat is participant communication,
   allowed regardless of status (incl. cancelled, so parties can still talk). Product
   call; revisit if chat must close on cancel.
2. **Idempotency / ON CONFLICT:** Postgres supports `ON CONFLICT` on a **partial**
   unique index via conflict-target inference (`ON CONFLICT (match_id) WHERE
   type='match'`). Valid; second concurrent open conflicts → return existing thread.
3. **Support threads NOT affected:** support uses `support_tickets` /
   `support_messages` (separate tables), NOT `chat_threads`. `chat_threads` is
   match-only in practice → removing the client insert from `matchChat` does not
   touch support.
4. **Null guard:** `bookings.parent_id` and `nanny_id` are BOTH nullable. Endpoint
   MUST reject (422) if either is null — cannot provision a match thread without
   both auth uids.
5. **Confused-deputy:** caller passing another booking's id is blocked by the
   `uid ∈ {parent_id, nanny_id}` authorization (403). service_role read is
   server-only; the client never receives the counterparty uid.

Open for Codex: deploy-order edge cases, any RLS bypass via the endpoint, whether
422-null-guard should instead be a curator-side fix, test completeness.

## Codex design review #1 (2026-06-30): REJECTED — corrections folded in below

Codex (verdict Rejected, all findings accepted) required the following before
implementation. Design updated accordingly:

### C1 — Exclusivity (was a hole)
The endpoint is pointless if the client can still create threads directly.
- BLI-124 migration (or a paired migration) MUST replace `threads_insert_v2`
  (currently `TO authenticated WITH CHECK auth.uid()=family_id`) with
  **service_role-only** INSERT on `chat_threads`. Client never inserts threads.
- Endpoint: validate `bookingId` is a UUID; enforce method (POST only), CORS,
  rate-limit, and the synthetic-admission gate.

### C2 — Booking integrity is the root cause (precondition, separate task)
Curator booking creation uses `nanny.userId ?? nanny.id` / `requesterId ?? id`
(`AdminCuratorTab.tsx:94-95`) — entity-id fallback; `parent_id`/`nanny_id` nullable;
local-only curator bookings may report success without sync.
- Precondition task (filed separately): require REAL auth `userId`/`requesterId`;
  do not report success for local-only bookings; participant assignment is
  server/curator-controlled and immutable to participants; migrate
  `bookings.parent_id`/`nanny_id` to `NOT NULL` after data cleanup.
- The endpoint keeps the 422 null-guard as defense-in-depth, NOT as the fix.

### C3 — Atomic conflict semantics (no identity overwrite)
- Use native atomic SQL with the partial-index predicate explicit; the existing
  row must MATCH the booking's participants. On mismatch return **409** — never
  overwrite `family_id`/`nanny_id`. (Upsert that overwrites identities is forbidden.)

### C4 — Data repair BEFORE the unique index
- Find duplicate match_ids, reconcile all match threads against bookings, find
  orphan/non-UUID match_ids; repair; THEN create + verify the partial unique index.
  (Prod = 0 match threads → no-op, but the repair/verify step is mandatory.)

### C5 — Safer staged rollout (replaces the 3-step order above)
1. Deploy dormant endpoint.
2. Run verified data repair.
3. Add + verify unique index.
4. Switch client to the endpoint.
5. Disable direct client INSERT (service_role-only policy).
6. Concurrent role-correct smoke tests.
7. Apply BLI-124 hardening.

### C6 — Extended tests
Concurrent parent+nanny provisioning → one thread id; direct client INSERT denied;
conflicting existing identities → 409; participants cannot reassign booking
parent/nanny; null/orphan/malformed booking; cached/old-client behavior;
participant-insert failure surfaces to UI; full BLI-124 family/nanny/outsider
matrix after provisioning.

**Status:** design corrected; needs Codex re-review before implementation.

## Codex design review #2 (2026-06-30): REJECTED on rollout safety — folded in

Architecture confirmed correct (server-authoritative provisioning). Remaining issues
are rollout-safety, not direction. Resolutions:

### R1 — BLI-138 must fully precede a callable BLI-134 (High)
- BLI-134 endpoint ships behind a **server-side default-OFF feature gate**; it is NOT
  enabled until BLI-138 (booking integrity) is fully deployed + verified. A dormant
  endpoint with no gate is still callable by booking participants → would provision
  from attacker-modifiable authority. Gate is the control.

### R2 — Close direct thread writes before/atomically with repair+index (High)
- The service_role-only `chat_threads` INSERT lockdown (C1) must land **before or in
  the same window as** data repair + unique-index creation; then reconcile AGAIN
  after write-closure. Otherwise old clients create malformed threads in the gap
  (unique index stops dup match_id but not orphan/identity-mismatch rows).

### R3 — Booking participant lifecycle (Medium)
- Define explicitly: booking participants are IMMUTABLE after creation, OR
  reassignment is transactional + audited and reconciles the thread. "Immutable to
  participants" alone is insufficient (curator reassignment could commit stale
  participants). Owned by BLI-138.

### R4 — Forward-fix, not rollback (Medium)
- After direct INSERT is disabled, reverting the client does NOT restore behavior
  (thread creation fails entirely). Rollback strategy = re-enable the feature gate
  off / forward-fix, never re-open authenticated thread INSERT.

### R5 — Old-client fail-closed (Medium)
- Cached web bundles + installed Capacitor apps keep doing direct INSERT and will
  fail after lockdown. Define explicit fail-closed UX + min-version/upgrade handling;
  test both new and existing chats on an old client.

### R6 — Explicit threads_insert_v2 replacement migration (Low)
- The exclusivity change is currently design-only; the committed BLI-124 migration
  touches only chat_participants + support_messages. Add a dedicated migration that
  replaces `threads_insert_v2` with service_role-only INSERT, with exact policy/grant
  postconditions + rollback/forward-fix runbook.

### R7 — Re-verify prod "0 match threads" (Low)
- Re-check live count immediately before repair/index work (read-only).

**Status after #2:** direction Confirmed; 2 maker/checker cycles reached (stop-rule
→ owner decision). NOT starting implementation. Awaiting owner: final round-3 verify
vs accept-with-conditions → writing-plans. BLI-138 is a hard precedent (blocks BLI-134).

## Codex design review #3 (2026-06-30): REJECTED — architecture sound, do BLI-138 first

Codex: architecture is sound, but the doc still lacks ONE safe rollout contract and
complete BLI-138 lifecycle. Directive: write the BLI-138 design/plan first; do NOT
start BLI-134 implementation from this spec yet.

### CANONICAL ROLLOUT (supersedes ALL earlier ordering in this doc — "Deploy order", C4, C5, R1, R2)
1. **BLI-138** booking integrity: deploy + verify fully (server-authoritative creation,
   no local-only success, participant mutations/deletion owned + locked/audited,
   `bookings.parent_id`/`nanny_id` → NOT NULL after cleanup).
2. Deploy BLI-134 endpoint **gated OFF** (server-side default-off feature gate).
3. Enable endpoint + deploy compatible client (client now calls endpoint).
4. **Atomically** revoke authenticated `chat_threads` INSERT (service_role-only) together
   with data repair + partial-unique-index creation.
5. Reconcile threads vs bookings AGAIN after write-closure.
6. Old-client enforcement (fail-closed, min-version).
7. Role-correct concurrent smoke.
8. Apply BLI-124 hardening.

### Remaining corrections folded for the eventual plan
- **Atomic, not upsert:** the endpoint contract's word "upsert" is superseded by C3 —
  it is an atomic insert-or-return that, on an existing row, MUST match booking
  participants (mismatch → 409), and MUST lock against booking mutation/deletion
  between read and insert (no orphan/stale thread).
- **BLI-138 owns ALL booking participant mutations AND deletion** (not just reassignment):
  bookings_participant policy currently allows participant UPDATE/DELETE; deletion
  between endpoint read and thread insert can orphan a thread.
- **Old-client policy (R5) needs a real design:** version source (package.json is 0.0.0),
  enforcement location, upgrade UX, behavior for new vs existing chats.
- **Feature-gate tests:** missing/default-off config, disabled response, enablement only
  after BLI-138, synthetic-admission rejection.
- **DATA_REGISTER:** update Chat/Bookings paths — provisioning adds Vercel server processing.

**Status after #3:** BLI-134 spec FROZEN pending BLI-138 design. Next action per Codex:
brainstorm + design BLI-138 (its own spec → review → plan), then return to finalize
BLI-134 against the canonical rollout above. 3 review cycles done.
