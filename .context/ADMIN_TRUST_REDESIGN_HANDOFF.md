# Admin Trust Redesign Handoff

Updated: 2026-06-02
Branch: `admin-trust-redesign-wip`
Primary Linear issue: `BLI-82`

## Goal

Turn the admin redesign into a safer trust-ops console, not just a prettier admin UI.

The admin should help a curator answer:

1. What needs action next?
2. What trust evidence exists?
3. What risks need attention?
4. Why is this family-nanny pair a reasonable match?
5. What has already been changed or decided?

## What Was Fixed In This Pass

### 1. Dev preview no longer enters runtime production JS

Changed `App.tsx`.

Before:

- `AdminPreviewHarness` was statically imported at the top of `App.tsx`.
- The route was hidden behind `import.meta.env.DEV`, but the module still entered the production graph.

Now:

- `AdminPreviewHarness` is a DEV-only lazy import.
- Production runtime JS no longer contains `AdminPreviewHarness`, `mockParents`, `admin-preview`, or `DEV-ONLY` strings.

Why:

- Preview fixtures are useful for local review, but should not ship as reachable runtime code.
- This lowers bundle noise and avoids exposing internal mock/admin structures.

### 2. Curator matching no longer shows false precision

Changed `src/components/admin/AdminCuratorTab.tsx`.

Before:

- The UI showed match percentages like `75%`.
- The score was still a simple heuristic: city, schedule, verification, child age.

Now:

- The UI shows qualitative levels:
  - `Сильное совпадение`
  - `Частичное совпадение`
  - `Мало сигналов`
- The explicit reasons remain visible under `Почему подходит`.

Why:

- Percentages imply mature model confidence.
- Blizko should present explainable curation, not fake algorithmic certainty.
- Numeric compatibility can return later after `BLI-90` has a real model.

### 3. Status changes are safer

Changed:

- `src/components/admin/AdminParentsTab.tsx`
- `src/components/admin/AdminBookingsTab.tsx`

Now:

- Drag-and-drop status changes ask for confirmation.
- Regular status buttons also ask for confirmation.
- Kanban cards have a select fallback, so drag-and-drop is not the only way to change status.
- Rejection still opens the rejection reason flow.

Why:

- Status changes are trust-critical workflow actions.
- A dropped card should not silently change family or booking state.
- Keyboard/touch users need a non-drag path.

### 4. Parent cards put next action first

Changed `src/components/admin/AdminParentsTab.tsx`.

Now:

- `Следующее действие` appears above location, child age, schedule, and budget.

Why:

- A curator opens this screen to decide what to do, not just to read data.
- Operational hierarchy should be:
  1. next action
  2. risk/trust state
  3. details

### 5. Nanny trust badges are evidence-based

Changed `src/components/admin/adminTrustSignals.tsx`.

Before:

- Badges were abstract: `Личность`, `Документы`, `Опыт`, `Видеовизитка`.

Now:

- Badges communicate evidence and state:
  - `Личность подтверждена`
  - `Личность не подтверждена`
  - `Документы проверены`
  - `Документы на проверке`
  - `Документы не загружены`
  - `Опыт указан`
  - `Опыт нужно уточнить`
  - `Видео есть`
  - `Видео ожидает просмотра`
  - `Видео не загружено`

Why:

- Trust UI must show evidence, not slogans.
- Curators need the state and implied action at a glance.

### 6. Nanny profile completion is separated from show-readiness

Changed `src/components/admin/AdminNanniesTab.tsx`.

Now:

- The progress bar is `Заполненность профиля`.
- The status pill is `Готова к показу` or `Нужно ревью`.

Why:

- A complete profile and a profile ready for family exposure are different signals.
- A profile may be filled but still blocked by docs or moderation risk.

### 7. Support inbox load cycle was simplified

Changed `src/components/admin/AdminSupportTab.tsx`.

Before:

- `loadInbox` depended on `selectedTicketId`.
- The effect depended on both `loadInbox` and `selectedTicketId`.
- `loadInbox` could also update `selectedTicketId`.

Now:

- Initial load depends only on `focusTicketId`.
- Manual ticket selection owns ticket-specific reloads.

Why:

- Avoids repeated fetches and UI flicker from state-driven dependency loops.

### 8. Support urgency is explained, not only colored

Changed `src/components/admin/AdminSupportTab.tsx`.

Now:

- Urgent or tense tickets show a short reason:
  - `Срочно: семья просит человека`
  - `Тон тревожный: нужен быстрый ответ`
  - `Тон напряжённый: лучше не откладывать`

Why:

- Color alone does not tell a curator what to do.
- Urgency should be status + reason + implied action.

## Verification

Passed:

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Test result:

- 23 test files passed
- 75 tests passed

Production bundle check:

```bash
rg -n "AdminPreviewHarness|mockParents|admin-preview|DEV-ONLY" dist --glob '!*.map'
```

Result:

- no runtime JS matches

Note:

- source maps can still include original source paths. That is expected unless sourcemaps are disabled.

## Follow-Up Test Coverage

Added `src/components/admin/adminTrustSignals.test.ts`.

Covered contracts:

- verified nanny evidence creates `ok` badges;
- pending documents and pending video create `pending` badges;
- missing identity/experience/docs create `missing` badges;
- nanny risk flags cover missing docs, rejected docs, low scan confidence, and unverified identity;
- parent risk flags cover stale new requests, payment pending, and missing contact.

Why:

- The admin trust layer is now a product contract, not just visual copy.
- These tests protect the evidence-based badge language from drifting back into vague labels.

## What Claude Code Should Review Next

### Priority 1

Check the changed admin flows manually:

- `/admin/parents`
- `/admin/bookings`
- `/admin/curator`
- `/admin/nannies`
- `/admin/support`
- `/admin-preview` in local dev only

Focus on:

- confirmation modal copy
- kanban select fallback ergonomics
- whether match levels feel clear enough without percentages
- whether nanny badges fit inside cards on mobile
- whether support urgency reasons create useful priority

### Priority 2

Decide whether kanban should be default or secondary:

- current default remains list
- kanban is useful for operators, but riskier for accidental state changes

### Priority 3

Implement the next layer from `BLI-90`:

- real `FamilyCompatibilityProfile`
- real `NannyCompatibilityProfile`
- `CompatibilityReason`
- curator-editable reasons
- outcome/feedback links for the learning loop

## Known Non-Goals In This Pass

- Did not implement `BLI-90`.
- Did not add a true compatibility data model.
- Did not change Supabase schema.
- Did not change public family or nanny-facing UI.
- Did not remove the dev preview harness files; only removed them from production runtime graph.
- Did not resolve unrelated dirty workspace files.

## Dirty Workspace Warning

There are unrelated dirty/untracked files outside the product changes:

- `.agents/workflows/model-orchestrator.md`
- `BOOTSTRAP.md` deleted
- `MEMORY.md`
- `memory/*`
- `.claude/*`

Do not include or revert those unless explicitly handling workspace memory/setup.

Product files touched in this pass:

- `App.tsx`
- `src/components/admin/AdminBookingsTab.tsx`
- `src/components/admin/AdminCuratorTab.tsx`
- `src/components/admin/AdminNanniesTab.tsx`
- `src/components/admin/AdminParentsTab.tsx`
- `src/components/admin/AdminSupportTab.tsx`
- `src/components/admin/adminTrustSignals.tsx`
