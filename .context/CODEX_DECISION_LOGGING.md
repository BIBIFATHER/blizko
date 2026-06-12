# CODEX_DECISION_LOGGING.md

Codex decision logging shortcut for this workspace.

## Log Immediately When

- architecture changes
- AI routing or agent rules change
- release workflow changes
- integrations or MCP behavior change
- security posture changes
- environment or machine setup changes
- a lesson should survive the session

## Where To Write

- `.context/ACTIVE_TASK.md` for the current objective, verified checkpoint,
  blockers, next action, and safety boundaries
- `memory/YYYY-MM-DD.md` for session facts
- `MEMORY.md` for durable human-level context
- `.context/CHANGELOG.md` for project-visible milestones
- `.context/DNA.md` for architecture truth
- `.context/JOURNAL.md` for values / process reflections when relevant

## Minimum Decision Record

- what changed
- why it changed
- consequence or next effect

## Shortcut Rule

If a decision will matter tomorrow, write it today.

If unfinished work must survive compaction, a limit, or a new session, update
`.context/ACTIVE_TASK.md` before stopping. Do not store secrets or assume its
external statuses are still current on resume.

## Anti-patterns

- "I'll remember this"
- logging only outcomes without rationale
- keeping operating changes only in chat
