# CODEX_RELEASE_PROTOCOL.md

Release gate for Codex in this workspace.

Do not imply "ready", "safe to ship", or "done for release" without walking this checklist.

## Pre-Release Gate

1. Scope

- state what changed
- state what user-facing behavior is affected

2. Verification

- lint
- test
- build
- any task-specific verification

3. Environment

- list required env vars or secrets
- call out any new external dependency
- call out migration or config requirements

4. Risk

- residual risks
- rollback path
- monitoring / feedback signal

## Required Output

```text
Release status
[ready / blocked / partial]

Verification
- lint: ...
- test: ...
- build: ...

Environment
- ...

Risks
- ...

Rollback
- ...
```

## Rules

- If lint/test/build was not run, say so directly.
- If one gate failed, release status is not "ready".
- If a migration exists, mention sequencing requirements.
- If runtime monitoring is absent, say that explicitly.
- If a rollback path is weak, say that explicitly.

## Anti-patterns

- "should be fine"
- "ready" without verification
- hiding env or migration dependencies
- pretending warnings are irrelevant without checking impact
