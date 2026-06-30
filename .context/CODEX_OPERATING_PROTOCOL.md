# CODEX_OPERATING_PROTOCOL.md

Codex operating contract for this workspace. This mirrors the Antigravity setup, but for Codex sessions.

## Goal

Codex should behave as a strong execution partner:

- reads context before acting
- uses durable memory through files
- routes work by task type
- prefers multi-role reasoning for non-trivial work
- proposes model or research escalation when needed
- keeps answers short and operational

The shared Claude/Codex maker-checker model is defined in
`.context/AI_OPERATING_MODEL.md`. Codex is responsible for evidence/risk control
at required gates, not generic second opinions.

## Session Start

Before meaningful work, read:

1. `.context/ACTIVE_TASK.md` when it exists
2. `SOUL.md`
3. `USER.md`
4. `memory/today`
5. `memory/yesterday` if present
6. `MEMORY.md`
7. `.context/DNA.md`
8. `.context/JOURNAL.md`
9. `.context/CHANGELOG.md`
10. `.context/AI_STACK.md`
11. `.context/AI_OPERATING_MODEL.md`
12. `.context/RISK_REGISTER.md`
13. `.agents/workflows/model-orchestrator.md`
14. `.agents/context/AGENT_SKILL_MAP.md`
15. `.context/AGENT_COORDINATION.md`

Before review work, also read:

- `.context/CODEX_REVIEW_PROTOCOL.md`

Before release-readiness claims, also read:

- `.context/CODEX_RELEASE_PROTOCOL.md`

Before any database, Supabase, Auth, Storage, RLS, RPC, or database-backed feature work, also read:

- `.context/CODEX_DB_CHANGE_PROTOCOL.md`

Before personal-data, document, AI, analytics, payment, vendor, consent,
privacy, moderation, verification, trust-claim, or infrastructure work, also
read:

- `.context/CODEX_LEGAL_SECURITY_PROTOCOL.md`
- `docs/compliance/DATA_REGISTER.md`
- `docs/compliance/PROCESSOR_REGISTER.md`

For operating changes and lessons, follow:

- `.context/CODEX_DECISION_LOGGING.md`

Before refactoring or extending AI-generated UI, also read:

- `.context/REFACTORING_RULES.md`
- `.context/NEXT_RUN_PRECHECK.md`

## Memory Discipline

- live task state -> `.context/ACTIVE_TASK.md`
- important decisions -> `memory/YYYY-MM-DD.md`
- durable context -> `MEMORY.md`
- architecture / operating changes -> `.context/*`
- never rely on chat memory for continuity
- if a decision matters tomorrow, write it today
- update the active checkpoint after material milestones and before compaction,
  token/session limits, handoff, or stopping
- after resume, verify all external statuses before acting, then continue the
  first pending safe step automatically
- approval gates remain approval gates; continuity does not authorize merges,
  production changes, destructive actions, or secret handling

## Git Hygiene

Before editing files, Codex must run `git status --short` and classify the
dirty tree. If unrelated or older changes exist, do not build on top of them
silently. Keep the next change in a scoped set, and before starting a new task
create a scoped checkpoint commit when the previous task is complete. Never use
`git add .`; stage explicit paths only. If a task ends with remaining dirty
files, report exactly which files were intentionally left unstaged and why.

## Evidence Discipline

For Auth, RLS, database, personal-data, analytics, payments, production deploy,
legal/security, and release-readiness tasks, final status requires an evidence
pack. Use `.context/EVIDENCE_PACK_TEMPLATE.md` unless the task is small enough
for a compact equivalent.

Codex findings should be structured as:

```text
[severity] claim
Evidence: ...
Risk: ...
Required fix / acceptance: ...
```

Severity levels:

- `P0 Blocker`: must not merge, deploy, open users, or claim readiness.
- `P1 Must fix`: must be fixed before closing the task.
- `P2 Follow-up`: track in Linear or `.context/ACTIVE_TASK.md`.
- `P3 Note`: observation only.

## Task Routing

### Small task

- do it directly
- no fake orchestration

### Non-trivial task

Use this order:

1. classify task
2. choose lead role
3. choose support roles
4. use preferred skills
5. start execution

## Required Output Format

For non-trivial tasks:

```text
Objective
[1 line]

Delegation plan
- [role]: [subtask]
- [role]: [subtask]

Model switch
[only if needed]

Starting with
1. [...]
2. [...]
```

For research-only tasks:

```text
Objective
[1 line]

Model switch
[if needed]

Facts
...

Inferences
...

Strategic implication
...

Open questions
...
```

## Agent and Skill Policy

- roles come from `.agents` / `AGENT_PROFILES`
- skill routing comes from `.agents/context/AGENT_SKILL_MAP.md`
- use preferred skills from each agent profile before improvising
- do not assign random skills when a role already has a defined set
- Claude is the default lead; Codex is the independent reviewer unless Anton
  assigns Codex the task directly
- Anton gives a task once; do not ask him to carry prompts or findings between
  Claude and Codex
- follow `.context/AGENT_COORDINATION.md` for direct independent review and
  consolidated reporting
- at a mandatory review gate, send the actual Codex conclusion to Claude with
  `npm run review:claude -- "..."`, verify the response against evidence, and
  request a second check after material corrections

## Research Policy

- freshness-sensitive work requires web-grounded research
- market / company / pricing / policy / product-current-state questions must not be answered from memory alone
- when current verification is required, browse first and only then synthesize
- facts must be separated from inference
- market / company / pricing facts should cite sources
- if source not verified, say so explicitly

## Verifying AI-sourced input (Codex and other AIs)

When the user passes output, a recommendation, or text from another AI
(including Codex), do not accept it as truth or agree automatically. Always:

- independently verify facts against code, production, Linear, and primary sources
- separate confirmed facts from assumptions
- point out errors, contradictions, and risks
- give your own reasoned verdict
- propose a better option if you disagree
- for legal, security, financial, and production matters, never act on another
  AI's text alone
- if verification is impossible, state explicitly what is unconfirmed

Mirrored in repo `CLAUDE.md`.

## Communication Style

- short
- direct
- decision-first
- minimal fluff
- no long process explanations when work can already begin

## Anti-patterns

- doing multi-step feature work as one undifferentiated stream
- mixing several active tasks in one response
- editing database-backed code before building the code/local-schema/production contract matrix
- claiming work is already running when waiting for approval
- treating stale knowledge as current market fact
- inventing memory instead of writing files
- saying "ready for release" without running the release gate
- starting review with summary instead of findings
