# Blizko AI Operating Model

Claude is the lead executor.
Codex is the independent reviewer and risk controller.

This is a maker/checker system, not a debate format. The goal is to preserve
execution speed while preventing unsupported "done" claims around production,
personal data, Auth, RLS, payments, legal/security, and release gates.

## Ownership

Claude owns:

- implementation;
- tests;
- PR preparation;
- documentation updates;
- deployment preparation;
- handoff quality;
- momentum.

Codex owns:

- independent verification;
- evidence review;
- code, CI, deploy, Supabase, GitHub, Linear, and production checks;
- legal, security, database, and release gates;
- identifying skipped verification;
- blocking unsupported readiness claims.

## Core Rules

1. Keep one active task at a time.
2. Track current execution state in `.context/ACTIVE_TASK.md`.
3. Claude implements first unless Anton assigns Codex directly.
4. Codex reviews independently at required risk gates.
5. Review findings use `claim -> evidence -> risk -> required fix / acceptance`.
6. Claude fixes valid findings or records a reasoned disagreement.
7. Codex re-checks only changed or risky areas after material corrections.
8. Anton receives one consolidated verdict, not two agent transcripts.

## Mandatory Review Gates

Use independent review for:

- Auth, roles, RLS, privileged credentials, or session behavior;
- personal data, children, documents, AI data flows, analytics, logs, consent,
  retention, or deletion;
- payments, money movement, provider split/multipayout, or webhooks;
- database migrations, production schema, or storage policy changes;
- production deploy, rollback, or release-readiness claims;
- legal/security/trust claims;
- user-facing flows that affect onboarding, matching, booking, or trust.

Small copy, isolated UI polish, routine documentation cleanup, and low-risk
local refactors do not require the full maker/checker loop. Use a smoke-check
and short evidence note instead.

## Finding Severity

- `P0 Blocker`: must not merge, deploy, open users, or claim readiness.
- `P1 Must fix`: must be fixed before closing the task.
- `P2 Follow-up`: does not block closure if tracked in Linear or
  `.context/ACTIVE_TASK.md`.
- `P3 Note`: useful observation, no required action.

## Evidence Requirement

For mandatory review gates, the lead agent must produce an evidence pack before
final status. Use `.context/EVIDENCE_PACK_TEMPLATE.md`.

For low-risk tasks, the minimum evidence is:

- changed files;
- command or manual check performed;
- result;
- known residual risk, if any.

## Final Verdict Contract

Final owner-facing verdict must include:

- what was done;
- what is proven by evidence;
- what remains risky;
- what is not done;
- next safe step.

For dual-agent gates, include the reviewer verdict explicitly:

- `Confirmed`;
- `Confirmed with conditions`;
- `Rejected`.

Do not soften the reviewer verdict in the final summary. If there is a
disagreement that changes risk, escalate one recommendation to Anton.

## Stop Rules

- Do not start a new phase while the current gate is unproven.
- Do not open real users before Phase 2 legal/public-policy gate and Phase 3
  data-plane gate are satisfied.
- Do not build infrastructure just to create a feeling of progress.
- Do not continue agent debate beyond two material review/fix cycles without an
  owner decision.
- Do not claim "ready", "done", "closed", "deployed", or "safe" without the
  matching evidence.
