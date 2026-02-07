# EXECUTION_PLAN.md — 10-day MVP plan (extended)

## Day 1 — Build must be green
Goal: `npm run build` + `npx tsc --noEmit` pass.

Tasks:
- Fix alias `@/*` for Vite + TS
- Fix `aiGateway` contract (`aiText` + `aiImage`)
- Remove/resolve `/index.css` warning (optional but preferred)

Definition of Done:
- Typecheck passes
- Build passes
- No blocking import/runtime errors in console

---

## Day 2 — AI Proxy stability
Goal: `/api/ai` works predictably.

Tasks:
- Keep `API_CONTRACT.md` as source of truth
- Normalize success/error payloads
- Add timeout + retry/backoff (429/5xx)
- Add safe logging (without secrets)
- Add fallback model for provider limits

Definition of Done:
- `/api/ai` returns stable `{ text }` on success
- Errors are consistent JSON
- Basic curl checks pass in dev and prod

---

## Day 3 — Matching flow (parent → result)
Goal: ParentRequest → MatchingResult works end-to-end.

Tasks:
- Parent form UX
- Matching prompt quality (`matchingAi.ts`)
- Result screen (`matchScore + recommendations`)
- Run 5–10 scenario checks

Definition of Done:
- 5+ manual cases produce coherent results
- No crashes in form/submit/result

---

## Day 4 — Nanny profile flow
Goal: nanny can create and view profile.

Tasks:
- Nanny form
- Save to local/mock backend (if server not ready)
- Profile display/edit basics

Definition of Done:
- Create/edit/view profile works without data loss in session

---

## Day 5 — Document verification
Goal: upload + AI analysis + status shown.

Tasks:
- Upload document image
- Analyze through `documentAi.ts`
- Save and render `DocumentVerification`

Definition of Done:
- `verified/rejected/pending` statuses visible in UI
- Error path has user-friendly message

---

## Week 2

### Day 6 — SupportChat polish
- Final system prompt
- Fast deterministic templates for key intents
- Anti-spam / request throttling

### Day 7 — PWA and mobile
- Install prompt quality
- Manifest/icons
- Minimal offline support

### Day 8 — Admin moderation
- Admin screen
- Profiles/docs overview
- Manual override for verification status

### Day 9 — UX polish
- Copy, buttons, empty/error states, skeletons
- Visual consistency pass

### Day 10 — Deploy + demo
- Vercel env checks
- Production smoke tests
- Demo script and fallback plan

---

## Cross-cutting safeguards (mandatory)

1) Minimal e2e smoke before merge to main:
- Parent → Matching
- Nanny → Profile
- Doc upload → Verification

2) Deterministic paths for demo-critical intents (avoid AI randomness).

3) Release safety:
- Verify quota + backup key
- Keep previous stable commit/tag for rollback
- Rollback command documented

4) Definition of Done required for each day (no vague “looks fine”).
