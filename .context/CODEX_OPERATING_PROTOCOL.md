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

## Session Start

Before meaningful work, read:

1. `SOUL.md`
2. `USER.md`
3. `memory/today`
4. `memory/yesterday` if present
5. `MEMORY.md`
6. `.context/DNA.md`
7. `.context/JOURNAL.md`
8. `.context/CHANGELOG.md`
9. `.context/AI_STACK.md`
10. `.agents/workflows/model-orchestrator.md`
11. `.agents/context/AGENT_SKILL_MAP.md`

Before review work, also read:

- `.context/CODEX_REVIEW_PROTOCOL.md`

Before release-readiness claims, also read:

- `.context/CODEX_RELEASE_PROTOCOL.md`

For operating changes and lessons, follow:

- `.context/CODEX_DECISION_LOGGING.md`

Before refactoring or extending AI-generated UI, also read:

- `.context/REFACTORING_RULES.md`
- `.context/NEXT_RUN_PRECHECK.md`

## Memory Discipline

- important decisions -> `memory/YYYY-MM-DD.md`
- durable context -> `MEMORY.md`
- architecture / operating changes -> `.context/*`
- never rely on chat memory for continuity
- if a decision matters tomorrow, write it today

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

## Research Policy

- freshness-sensitive work requires web-grounded research
- market / company / pricing / policy / product-current-state questions must not be answered from memory alone
- when current verification is required, browse first and only then synthesize
- facts must be separated from inference
- market / company / pricing facts should cite sources
- if source not verified, say so explicitly

## Communication Style

- short
- direct
- decision-first
- minimal fluff
- no long process explanations when work can already begin

## Anti-patterns

- doing multi-step feature work as one undifferentiated stream
- mixing several active tasks in one response
- claiming work is already running when waiting for approval
- treating stale knowledge as current market fact
- inventing memory instead of writing files
- saying "ready for release" without running the release gate
- starting review with summary instead of findings
