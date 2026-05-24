# MEMORY.md

Curated long-term memory for the main Blizko workspace.

## Workspace Role

- This workspace is treated as a main-session workspace, not a disposable side repo.
- Long-term context should live here when it affects execution quality, product direction, or collaboration speed.

## User Preferences

- Prefer short internal task compression before execution.
- Prefer execution-ready artifacts over long discussion.
- For larger tasks, parallelize only when the work splits into genuinely independent blocks.
- Value directness, speed, and high technical standards over reassuring chatter.
- Default preferred operating mode: one primary objective per session, then immediate execution.
- The user wants Codex to proactively maintain workspace memory and operating files when that improves future execution.
- When capability is constrained by missing access, list the exact permission or system needed instead of working around it silently.

## Product Context

- Main product: `Blizko`
- Secondary project in orbit: `Photo-Business`
- Current frontend runtime is `Vite 6 + React 19`, not Next.js.
- Core backend/data layer is `Supabase` with strong emphasis on RLS and production hardening.

## Operating Lessons

- The workspace already has enough strategic documentation; the bigger leverage comes from connectors, verification loops, and repeatable execution paths.
- MCP readiness must be validated from the active client, not inferred from config files.
- Durable context belongs in files, not in chat memory.
- Highest-leverage collaboration pattern is: concise task framing, fast context pull, immediate implementation, short closeout.

## Requested Access Pattern

- The user explicitly wants a concrete list of permissions/access needed to unlock maximum execution quality.
- Highest-value accesses for this workspace are: live `Linear`, `Supabase`, `GitHub`, `Vercel`, `Sentry`, `Figma`, `Notion`, and stable local env visibility for the relevant projects.

## Current Operational Reality

- `figma` MCP is working.
- `figma` auth works, but current seats are `View`, so write access to design files may be blocked until edit permissions are granted.
- `notion` MCP can authenticate, but remote MCP state should still be rechecked after a clean app restart.
- `notion` auth is currently working for read access.
- `github` CLI auth is working with `repo` and `workflow` scopes.
- `supabase` CLI auth is working and a project is linked at the account level, but shell env vars are still missing by default.
- `vercel` CLI auth is working, but this repo is not locally linked via `.vercel/project.json`.
- `linear` auth is currently working and should no longer be treated as unresolved.

## Resume Protocol

- On every restart, read `BOOTSTRAP.md` first.
- Then read `SOUL.md`, `USER.md`, `MEMORY.md`, and the latest `memory/YYYY-MM-DD.md` files for today and yesterday.
- Resume from the last unfinished task recorded in memory instead of asking the user to restate the thread.
- When the session changes direction, update the relevant daily memory file immediately so the next restart has a clean handoff.

## Product Delivery Snapshot

- `npm test` passes.
- `npm run build` passes.
- `npm run lint` no longer has blocking errors, but still reports a sizeable warnings backlog.
- Vercel deploy config exists locally.
- GitHub Actions CI now exists for `lint`, `test`, and `build`, but its first remote run still needs validation.
- Sentry is partially wired: build-time release upload is configured, but runtime browser reporting depends on `VITE_SENTRY_DSN`, which is not present in the current `.env.local`.
