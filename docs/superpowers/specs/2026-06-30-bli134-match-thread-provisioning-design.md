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
