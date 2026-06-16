# Blizko PD/AI MVP: corrected decision candidate

Date: 2026-06-13
Status: candidate for independent Claude review; not an implementation approval
Decision ID: `BLI-PD-AI-MVP-001-R1`

## 1. Purpose

Define an MVP architecture that:

- keeps raw personal data inside an approved Russian data plane;
- removes documents and health details from the MVP;
- preserves useful external AI capabilities without treating pseudonymization
  as anonymization;
- prevents code, schema, legal documents, and public trust claims from
  diverging.

This document corrects
`/Users/anton/Downloads/blizko_pd_ai_mvp_decision_for_claude_codex.md`.
Claude must independently review the corrections before implementation.

## 2. Decision Status

### Approved Stop-Risk Direction

These measures may be planned immediately and should be implemented before
accepting new real sensitive data:

1. Disable external-AI analysis of documents and files.
2. Remove passport, medical-book, medical-certificate, criminal-record,
   education-document, resume-file, and verification-video upload from the MVP.
3. Remove health-detail fields and document-derived fields from MVP forms.
4. Disable personalized AI support that sends raw profile or chat context.
5. Prevent personal data, document metadata, full prompts, request bodies,
   signed URLs, and chat text from entering logs, Sentry, analytics, or
   Telegram notifications.
6. Keep public claims limited to controls that have evidence.
7. Inventory historical external egress and retained copies. Where supported
   and legally/technically applicable, request deletion from processors and
   purge or scrub historical personal data from application logs, Sentry,
   analytics, and Telegram. Preserve non-sensitive evidence of the result.

### Conditional Architecture Direction

The following direction is accepted only after its stated gates pass:

- Russian personal-data plane for collection, Auth, APIs, database, private
  storage, audit, backups, admin access, and consent evidence.
- External OpenAI/Gemini use through a server-side AI Privacy Gateway.
- External AI receives only scenario-specific payloads that are either:
  - demonstrated not to be personal data; or
  - separately approved as a controlled cross-border personal-data flow after
    all legal, contractual, notification, retention, and security gates pass.

### Not Yet Approved

- A specific Russian provider.
- Self-hosted Supabase as the final architecture.
- A protection level or attestation requirement.
- External AI processing of `personal` or `child_data`.
- Production migration or deletion.
- The original document's proposed SQL.

## 3. Core Legal Correction

### Pseudonymization Is Not Anonymization

Replacing names with `case_id`, age bands, district clusters, or other coded
values does not automatically remove the data from personal-data regulation.
Under Article 3 of 152-FZ, anonymization requires that attribution to a subject
be impossible without additional information.

Blizko itself may retain the mapping and may combine age, district, schedule,
budget, care type, and risk flags. Therefore, the default classification of a
rich structured profile is `personal`, not `anonymous`.

### External AI Default

External AI is deny-by-default.

Until a separate cross-border gate passes:

- allowed: `public`, `internal`, synthetic, and validated anonymous aggregates;
- blocked: `personal`, `restricted`, `special_category`, `child_data`,
  `document`, and `secret`.

The existence of vendor ZDR or `store: false` does not itself make a transfer
lawful and does not prove that the payload is anonymous.

## 4. Cross-Border AI Gate

An external-AI scenario may receive personal data only when all rows below are
verified:

| Gate | Required evidence |
| --- | --- |
| Purpose and necessity | Specific purpose; non-AI or anonymous alternative assessed |
| Legal basis | Basis mapped to the exact fields and purpose |
| Data classification | Payload reviewed field-by-field; re-identification risk recorded |
| Recipient and countries | Provider, subprocessors, and processing/storage countries verified |
| Roskomnadzor | Required processing and cross-border notifications submitted/updated before the flow |
| Recipient-country assessment | Applicable country-protection assessment completed; statutory waiting conditions satisfied; no regulator restriction or prohibition applies |
| Contract | Applicable DPA/terms and processor role preserved as evidence |
| Retention | Actual endpoint/model settings verified; unsupported ZDR features disabled |
| Security | Access, encryption, abuse controls, incident handling, and audit evidence |
| Transparency | Privacy/consent text matches the real provider, purpose, fields, and countries |
| Exit | Provider-disable switch and non-AI fallback tested |

Any unknown mandatory row means `No-Go`.

The gate is evaluated per jurisdiction. For `UNKNOWN` and the MVP `EU`
placeholder, external AI cannot receive personal data regardless of gate
evidence because their selected personal-data plane is `none`.

## 5. Correct AI Privacy Gateway Model

### 5.1. Build From Allowlisted DTOs

Do not sanitize a raw profile by deleting known fields. Construct a new
scenario-specific DTO from an empty object.

Requirements:

- reject unknown properties;
- disallow arbitrary free text by default;
- use enums, booleans, bounded numbers, and coarse bands;
- limit array size and string length;
- classify every output field;
- run deterministic schema validation;
- run semantic PII detection as defense in depth;
- log only scenario, policy version, data classes, result, and pseudonymous
  audit reference;
- never log prompt or response bodies.

### 5.2. Data Classes

```ts
export type DataClass =
  | 'public'
  | 'internal'
  | 'anonymous'
  | 'personal'
  | 'restricted'
  | 'special_category'
  | 'child_data'
  | 'document'
  | 'secret';
```

`anonymous` may be assigned only after a documented re-identification test.

Any payload generated for a real subject, real family, real nanny, or real match
is `personal` by default because Blizko retains linking context and can combine
the payload with internal records. The `anonymous` class is limited to
non-subject-linked aggregates, templates, and synthetic data after a documented
re-identification test. Real-user match analysis and explanation remain blocked
from external AI until the cross-border gate passes.

### 5.3. MVP Policy

```ts
export const externalAiClassPolicy = {
  allowedByDefault: ['public', 'internal', 'anonymous'],
  blockedByDefault: [
    'personal',
    'restricted',
    'special_category',
    'child_data',
    'document',
    'secret',
  ],
} as const;
```

Manual approval cannot override a blocked data class. A policy change requires
legal and security review, register updates, and a new policy version.

### 5.4. Example: Allowed Before Cross-Border Approval

```json
{
  "scenario": "match_explanation_template",
  "policy_version": "mvp-1",
  "features": {
    "schedule_overlap_band": "high",
    "experience_band": "5_10_years",
    "care_capabilities": ["infant_care", "walking"],
    "communication_style": "structured"
  }
}
```

This example is allowed only if it is not tied to a real case identifier and
cannot be combined with retained data to identify a person.

### 5.5. Blocked Before Cross-Border Approval

- `case_id` linked to an internal subject;
- child age plus district plus schedule plus budget for a real family;
- raw or summarized chat;
- profile narrative or curator notes;
- risk flags generated for a real person;
- document-readiness status tied to a real nanny;
- names, contacts, exact locations, credentials, payment IDs, URLs, files, or
  tokens.

## 6. MVP Data Minimization

### Do Not Collect

- medical documents or health details;
- passport scan or passport number;
- criminal-record certificate file;
- education-document file;
- resume file;
- verification video or face-match data;
- document images for external AI.

### Collect Only If Necessary

- phone/email inside the approved Russian data plane;
- coarse city/district data needed for matching;
- experience, schedule, skills, rate band, and availability;
- child age group, not child name or date of birth;
- neutral readiness status:
  `readyToProvideRequiredDocumentsBeforeStart`.

Do not collect detailed statuses such as `has_actual` or `needs_update` for a
medical book until their legal classification and necessity are resolved.

## 7. Trust Model Correction

Do not store or expose a single unexplained `trust_level` as evidence.

Use evidence records:

```ts
export type TrustEvidence = {
  kind:
    | 'profile_review'
    | 'interview_completed'
    | 'references_reviewed'
    | 'documents_ready_declared'
    | 'document_checked_off_platform';
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  checkedAt?: string;
  checkedByRole?: 'curator' | 'verifier' | 'admin';
  methodVersion: string;
  expiresAt?: string;
  evidenceRef?: string;
};
```

Rules:

- `evidenceRef` must not contain a document, personal data, or public URL.
- Public badges are derived from current confirmed evidence.
- Public wording must state whether a fact is self-declared or checked, include
  the applicable method and date where shown, and must not imply government,
  state, licensed, or official verification.
- “Documents verified” is forbidden unless the exact document class, method,
  reviewer, time, and expiry are recorded in an approved process.
- Readiness declarations must be shown as self-declared, not verified.

## 8. Database Contract Correction

The authoritative committed schema currently has:

```text
public.nannies
- id text
- payload jsonb
- created_at timestamptz
- user_id uuid
- updated_at timestamptz
```

There is no authoritative `nanny_profiles` table. The original SQL must not be
executed.

The current `public.nannies_public` view is unsafe for arbitrary payload
extension: it removes only a short denylist of keys while exposing every other
key, and it is currently defined with `security_invoker=false`. Before adding
readiness, evidence, trust, moderation, risk, or other private keys to
`public.nannies.payload`, replace the public projection with an explicit
allowlist of safe public keys.

The access model must be designed and role-tested. `security_invoker=true` may
be used only if the underlying RLS/grant model still provides the intended
public catalog. Otherwise use a narrow server/RPC projection with equivalent
deny-by-default behavior. Do not change the view flag without contract tests.

Before any database change, follow
`.context/CODEX_DB_CHANGE_PROTOCOL.md` and build this matrix:

| Object | Code expects | Committed migrations | Production | Decision |
| --- | --- | --- | --- | --- |
| `public.nannies.payload` | exact new keys and types | verify baseline/history | read-only verification | compatible/mismatch |
| `public.nannies_public` | no restricted fields | verify view definition | read-only verification | compatible/mismatch |
| RLS/grants | owner/admin behavior | verify policies | role-correct smoke | compatible/mismatch |

Preferred MVP shape:

1. Convert the public profile projection to an explicit allowlist and verify
   anonymous/authenticated/owner behavior.
2. Remove obsolete document fields and flows from application behavior.
3. Add typed optional readiness/evidence structures inside the existing payload
   only if this remains compatible and testable.
4. Consider normalization only through a separate architecture decision and
   expand-migrate-contract plan.

No migration may be implemented from this memo alone.

## 9. Confirmed Current Code Risk

Current code:

- converts files to data URLs in `src/core/ai/aiGateway.ts`;
- sends the data URL inside messages to `/api/ai`;
- uses that path from `src/core/ai/documentAi.ts`;
- may return a fallback status of `verified` when AI fails.

Stop-risk implementation must:

1. Make document AI unavailable in production.
2. Remove the `verified` fallback on failure.
3. Prevent file/data URL/base64 payloads at the server AI boundary.
4. Remove public `ai_checked` or `verified_docs` claims unless evidence exists.
5. Add regression tests for each prohibition.
6. Route every support-AI scenario through the same DTO gateway; partial or
   summarized context must not bypass scenario policy.
7. Apply authentication, authorization, request-size limits, rate limits, and
   prompt-injection-resistant structured inputs at the gateway boundary.

## 10. Required Tests

1. External-AI DTO rejects every unknown field.
2. `personal`, `child_data`, `restricted`, `special_category`, `document`, and
   `secret` are denied by default.
3. Manual approval cannot bypass a denied class.
4. File, Blob, data URL, base64 marker, storage URL, JWT, and payment identifier
   are rejected server-side.
5. Raw chat and arbitrary profile text cannot enter an external-AI DTO.
6. Prompt and response bodies are absent from application logs and Sentry.
7. Analytics and Telegram reject contact, address, document, and free-text
   profile fields.
8. Nanny registration succeeds without document upload.
9. AI failure never creates `verified`, `ai_checked`, or equivalent evidence.
10. Public trust badges require current confirmed `TrustEvidence`.
11. `nannies_public` does not expose removed or newly introduced private keys.
12. Production caller-role tests verify Auth/RLS; `service_role` is not used as
    acceptance evidence.
13. Support AI cannot bypass the DTO gateway with raw or partially redacted
    context.
14. Gateway rate limits, request limits, and schema rejection are tested.
15. Historical egress remediation has an inventory, action status, and
    non-sensitive evidence.

## 11. Implementation Order

### Phase 0: Stop Risk

- disable document AI and document uploads;
- disable raw-context support AI;
- remove false verification fallbacks and claims;
- add server-side payload rejection;
- scrub logs, Sentry, analytics, and Telegram;
- inventory already-egressed documents, prompts, profile/chat context, and
  historical logs; request deletion or purge where supported;
- route support AI through the same DTO gateway;
- add gateway rate limits and strict structured-input controls;
- replace `nannies_public` key-denylist behavior with a tested explicit
  allowlist before adding payload keys;
- determine whether production already contains real personal data.

### Phase 1: Simplify MVP

- replace documents with a neutral readiness declaration;
- implement evidence-based trust statuses;
- update UI copy, privacy notice, consent evidence, registers, and tests;
- keep external AI synthetic/anonymous-only.

### Phase 2: Russian Data Plane

- select provider only after provider evidence and PoC;
- migrate Auth, APIs, database, storage, audit, backups, and admin plane;
- verify migration ledger, schema, RLS, roles, deletion, and restore;
- remove old EU data only after explicit approval and verified migration.

### Phase 3: Controlled External AI

- complete the cross-border AI gate;
- approve scenarios one by one;
- version policies and DTO schemas;
- preserve a kill switch and deterministic fallback.

## 12. Release Gates

The MVP remains blocked for real users when any of these is unknown:

- whether production already contains real personal data;
- whether new collection is open;
- the approved first-write/storage/processing path;
- operator notification state;
- external-AI countries, terms, and actual retention configuration;
- recipient-country assessment, applicable waiting conditions, and absence of a
  regulator restriction/prohibition;
- consent/privacy alignment;
- deletion and backup behavior;
- historical egress inventory and remediation status;
- ISPDn boundary and required security measures for launch.

Stop-risk code may proceed while these are resolved. Production migration,
external communication, filings, contracts, and deletion require Anton's
explicit approval.

## 13. Decision Record

```yaml
decision_id: BLI-PD-AI-MVP-001-R1
date: 2026-06-13
status: review_candidate
owner: Anton Anosov

accepted_stop_risk:
  document_ai: disable
  document_uploads_mvp: remove
  health_details_mvp: remove
  raw_context_external_ai: disable
  false_verification_fallbacks: remove
  historical_egress_inventory: required
  historical_log_scrub: required

external_ai:
  default: deny
  allowed_before_cross_border_gate:
    - public
    - internal
    - validated_anonymous
  blocked_before_cross_border_gate:
    - personal
    - restricted
    - special_category
    - child_data
    - document
    - secret

database:
  authoritative_profile_table: public.nannies
  profile_storage: payload_jsonb
  public_projection: explicit_allowlist_required
  security_invoker_change: requires_role_contract_test
  proposed_nanny_profiles_sql: rejected
  migration_status: not_authorized

pending:
  real_pd_in_production: unknown
  collection_open: unknown
  ru_provider: not_selected
  rkn_processing_notification: unverified
  rkn_cross_border_notification: not_approved
  isp_dn_boundary: pending
  protection_level: pending
  external_ai_personal_data: no_go
```

## 14. Independent Claude Review Contract

Claude must:

1. Review this document independently using `blizko-lawyer` and
   `blizko-security`.
2. Verify every legal statement against current primary/regulator sources as of
   2026-06-13 or the actual review date.
3. Compare every technical statement with current code, committed migrations,
   and project protocols.
4. Report findings first, ordered by severity.
5. Explicitly challenge:
   - whether the proposed anonymous DTO is truly non-personal;
   - whether the stop-risk scope is complete;
   - whether external AI must remain fully disabled for real-user scenarios;
   - whether the payload JSONB approach is preferable to normalization;
   - whether trust evidence and public wording are defensible.
6. Make no code, production, filing, contract, or deletion changes.

Required output:

```text
Decision: Accept / Accept with corrections / Reject

Findings
- severity, exact section, problem, correction

Verified legal rules
- rule, source, effective/access date

Technical contract check
- code, migrations, production unknowns

Required edits
- exact replacement text or section changes

Implementation authorization
- No; review only
```

## 15. Sources

Primary/current starting points; re-verify during review:

- 152-FZ, Article 3:
  https://www.consultant.ru/document/cons_doc_LAW_61801/4f41fe599ce341751e4e34dc50a4b676674c1416/
- 152-FZ, Article 5:
  https://www.consultant.ru/document/cons_doc_LAW_61801/96fbc469f91f57235cc842a85e0516a99f23dc85/
- 152-FZ, Article 10:
  https://www.consultant.ru/document/cons_doc_LAW_61801/26edb2934b899bf9c74c3a8f7e574651c6565e6d/
- 152-FZ, Article 12:
  https://www.consultant.ru/document/cons_doc_LAW_61801/e4ebbe1780de623c7cf32a59ca82a7bb523a25dd/
- 152-FZ, Article 18:
  https://www.consultant.ru/document/cons_doc_LAW_61801/cbf4e15b7c330f9372e876cdf2bc928bad7950ef/
- 152-FZ, Article 22:
  https://www.consultant.ru/document/cons_doc_LAW_61801/d996966e22e1320c9de1ab82d9f6be12c3d9d765/
- Roskomnadzor cross-border portal:
  https://pd.rkn.gov.ru/cross-border-transmission/
- Roskomnadzor operator notification:
  https://pd.rkn.gov.ru/operators-registry/notification/
- FSTEC Order No. 21:
  https://fstec.ru/dokumenty/vse-dokumenty/prikazy/prikaz-fstek-rossii-ot-18-fevralya-2013-g-n-21
- OpenAI data controls:
  https://developers.openai.com/api/docs/guides/your-data
- Gemini API ZDR:
  https://ai.google.dev/gemini-api/docs/zdr
- Gemini API terms:
  https://ai.google.dev/gemini-api/terms
- Internal architecture memo:
  `/Users/anton/Desktop/blizko 3/docs/ru-data-contour-decision-memo.md`
- Compliance registers:
  `/Users/anton/Desktop/blizko 3/docs/compliance/DATA_REGISTER.md`
  `/Users/anton/Desktop/blizko 3/docs/compliance/PROCESSOR_REGISTER.md`
