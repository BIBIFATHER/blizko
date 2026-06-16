# Claude / Codex Coordination

This file is the shared operating contract for Claude Code and Codex.

## Default Ownership

Claude Code is the default lead agent for Blizko. Anton normally gives each
task to Claude once. Claude owns planning, implementation, coordination,
routine corrections, and the final consolidated response.

Codex is the default independent reviewer for legal, security, architecture,
database, and release gates. Codex may also execute a task when Anton addresses
Codex directly, but this does not change the default ownership model.

The lead agent:

1. Reads the repository context and performs the work.
2. Decides whether independent review is required.
3. Invokes the other local agent directly when available, or writes a complete
   handoff file under `.context/` when direct invocation is unavailable.
4. Resolves review findings itself when they do not require owner approval.
5. Returns one consolidated result to Anton.

Neither agent may ask Anton to relay messages, findings, prompts, or files
between agents.

## When Independent Review Is Required

Use the second agent for:

- personal data, children, documents, AI data flow, consent, retention, or
  deletion;
- Auth, RLS, privileged credentials, payments, production migrations, or
  infrastructure;
- release-readiness decisions;
- architecture decisions with material rework cost;
- any Critical or High security finding.

Routine copy, isolated UI polish, documentation cleanup, and low-risk local
refactors do not require dual-agent review.

## Direct Coordination

Both agents have read-only review commands:

```bash
npm run review:codex -- "Claude's conclusion or implementation report"
npm run review:claude -- "Codex's conclusion or implementation report"
```

The commands invoke the other local agent in repository read-only mode. Codex
uses its filesystem sandbox without user config or user MCPs. Claude Code
`2.1.170+` runs in safe mode with only `Read`, `Grep`, and `Glob`, without
session persistence, custom MCPs, hooks, plugins, shell, or test execution.
The reviewer must challenge the conclusion, inspect repository evidence,
report disagreements, and return `Confirmed`,
`Confirmed with conditions`, or `Rejected`.

These challenge-review commands do not replace `$blizko-lawyer`,
`$blizko-security`, database, or release gates. Those run in the normal lead
session before the restricted independent challenge.

For every mandatory independent-review gate:

1. The lead agent sends its actual conclusion or implementation report to the
   other agent using the appropriate command.
2. The lead agent verifies every returned finding against evidence.
3. The lead agent fixes valid findings or records a reasoned disagreement.
4. If the conclusion materially changes, the reviewer checks the corrected
   conclusion once more.
5. Anton receives the consolidated result, including any unresolved conflict.

This is bidirectional: Claude reviews Codex conclusions and Codex reviews Claude
conclusions. A verdict from either agent alone is not sufficient at a mandatory
gate.

If direct invocation fails, the lead agent may exit reviewer mode and write a
complete handoff under `.context/`; that fallback write is not part of the
read-only reviewer session. Report the technical blocker. Anton must not be
asked to compose or transport the review prompt.

## Shared State

- Implementation truth: code, tests, migrations, and configuration.
- Durable decisions: `.context/`, ADRs, and `memory/YYYY-MM-DD.md`.
- Work status and owner-facing milestones: Linear.
- Temporary task-specific handoff: `.context/<TASK>_HANDOFF.md`.

Do not paste long agent transcripts into permanent context. Record decisions,
evidence, unresolved blockers, and the next executable action.

## Owner Escalation

Escalate to Anton only for:

- business tradeoffs;
- cost, timeline, or UX choices;
- external communication;
- contracts, filings, production changes, or irreversible deletion;
- an unresolved conflict between agents that changes product risk.

Present one recommendation. Do not ask Anton to act as a messenger.
