# Bootstrap for Claude Code

Use this file as the first entry point after every restart.

## Load Order

1. `SOUL.md`
2. `USER.md`
3. `MEMORY.md`
4. `memory/$(today).md`
5. `memory/$(yesterday).md` if present
6. `.context/CODEX_OPERATING_PROTOCOL.md`
7. `.context/DNA.md`
8. `.context/JOURNAL.md`
9. `.context/CHANGELOG.md`

## Resume Rule

- Find the last unfinished task from the memory files.
- Continue from that point without asking the user to repeat context unless something is missing.
- If the task spans multiple steps, restate the current objective in one sentence, then execute.
- After each meaningful step, update the relevant memory file.

## Default Behavior

- One primary objective per session.
- Prefer files over chat memory.
- Keep the handoff short and actionable.
