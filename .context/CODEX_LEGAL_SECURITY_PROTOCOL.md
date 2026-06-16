# Blizko Legal and Security Protocol

Mandatory legal-by-design and security-by-design workflow for Claude and Codex.

## Objective

Prevent product and architecture decisions from creating avoidable Russian
legal, personal-data, security, or infrastructure rework.

The agent owns evidence collection, register maintenance, issue spotting,
technical verification, and preparation of required artifacts. Anton is not
expected to fill compliance questionnaires.

## Trigger

Follow this protocol before planning, implementing, reviewing, or releasing any
change that touches:

- personal data, identity, profiles, children, documents, health information,
  photos, video, chat, support, moderation, or verification;
- Auth, RLS, Storage, admin/support access, logs, analytics, payments, AI, or
  external APIs;
- a new vendor, data recipient, hosting location, country, backup, monitoring
  destination, or subprocessor;
- consent, privacy, offer, retention, deletion, account removal, or incident
  handling;
- public safety, verification, trust, or compliance claims.

## Agent Ownership

Claude or Codex must:

1. Read the relevant code, migrations, configuration, contracts, and current
   compliance registers.
2. Infer known facts from evidence instead of asking Anton to transcribe them.
3. Update `docs/compliance/DATA_REGISTER.md`,
   `docs/compliance/PROCESSOR_REGISTER.md`, and the project changelog when
   behavior or a material decision changes.
4. Run `$blizko-lawyer` for legal impact and `$blizko-security` for technical
   impact.
5. Verify current legal conclusions against primary or regulator sources in the
   current task. Record exact dates and separate rule, application, assumption,
   and required official confirmation.
6. Produce the safest workable implementation and required tests.
7. Block the change when legality or security cannot be demonstrated.

Do not ask Anton questions that can be answered from repository, provider,
deployment, database, or runtime evidence.

## Owner Escalation

Ask Anton only for a decision that cannot be inferred, such as:

- whether real users are currently admitted to production;
- whether a business capability may be disabled or delayed;
- whether to accept cost, timeline, or UX consequences of the compliant option;
- approval for a filing, contract, production change, data deletion, vendor
  communication, or other external/irreversible action.

Present one recommended option, its consequence, and at most two alternatives.
Do not send Anton an open-ended compliance questionnaire.

## Workflow

### 1. Classify the Change

Record data subjects and classes, purpose, collection and first-write point,
storage/processing/backup/deletion locations, caller roles, recipients,
countries, AI/analytics/observability flows, and user-facing claims.

### 2. Update the Registers

Update affected rows before implementation. Mark unresolved mandatory facts as
`Unknown - blocks Go` and record the evidence needed to resolve them.

### 3. Legal Gate

Use `$blizko-lawyer`. Required decision: `Go`, `Conditional Go`, or `No-Go`.
Do not treat consent, vendor marketing, or a checkbox as proof of compliance.

### 4. Security Gate

Use `$blizko-security`. Verify authorization, RLS/grants, secrets, input
validation, minimization, logs, external egress, retention/deletion, tests, and
role-correct runtime behavior.

### 5. Implementation

- Prefer provider-neutral domain boundaries and repositories.
- Keep restricted data out of external AI, analytics, logs, and monitoring
  unless the flow is explicitly approved and documented.
- Prefer reversible, additive changes.
- Make risky paths fail closed.
- Add tests proving the control, not only functional success.

### 6. Review and Release

Review must report register drift, undocumented processors, new data fields,
changed purposes, and unverified claims as findings.

Release is blocked until registers match implementation, the legal decision is
`Go` or all conditions are met, no Critical/High security finding remains, and
the affected consent/privacy/retention/deletion artifacts match real behavior.

## Default No-Go Conditions

- Restricted user content is sent to external AI without an approved flow.
- A new processor or country appears without register review.
- Personal data may enter analytics, logs, or monitoring without minimization
  and retention controls.
- Client-side checks are the only authorization control.
- A privileged secret can reach the browser.
- The real caller role has no authorization/RLS acceptance test.
- Purpose, legal basis, first-write location, recipient, or deletion path is
  unknown.
- Public trust or verification claims exceed implemented evidence.

## External Specialist Threshold

Routine outside consultation is not required by this operating model. Mark
`External confirmation required` only when:

- law requires a signed, licensed, certified, or formally accountable actor;
- a regulator, court, claimant, or reportable incident is involved;
- an official protection-level, attestation, or threat-model determination is
  required;
- primary sources remain materially ambiguous and the consequence is
  irreversible or severe.

Until confirmation exists, choose the conservative fallback: disable the flow,
use synthetic data, reduce the data set, keep processing inside the approved
contour, or block release.

## Status Language

Use `legal/security ready`, `conditional - controls pending`,
`blocked - evidence missing`, `blocked - owner approval required`, or
`external confirmation required`.

Never say compliant, secure, or ready from documentation alone.
