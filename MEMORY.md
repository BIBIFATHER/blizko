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

## Product Context

- Main product: `Blizko`
- Secondary project in orbit: `Photo-Business`
- Current frontend runtime is `Vite 6 + React 19`, not Next.js.
- Core backend/data layer is `Supabase` with strong emphasis on RLS and production hardening.

## Operating Lessons

- The workspace already has enough strategic documentation; the bigger leverage comes from connectors, verification loops, and repeatable execution paths.
- MCP readiness must be validated from the active client, not inferred from config files.
- Durable context belongs in files, not in chat memory.

## Current Operational Reality

- `figma` MCP is working.
- `notion` MCP can authenticate, but remote MCP state should still be rechecked after a clean app restart.
- `github` and `supabase` are configured for bearer-token MCP auth and still depend on real shell-visible env vars.
- `linear` MCP remains unreliable in the current environment and should be treated as unresolved until verified from a fresh session.

## Product Delivery Snapshot

- `npm test` passes.
- `npm run build` passes.
- `npm run lint` no longer has blocking errors, but still reports a sizeable warnings backlog.
- Vercel deploy config exists locally.
- GitHub Actions CI now exists for `lint`, `test`, and `build`, but its first remote run still needs validation.
- Sentry is partially wired: build-time release upload is configured, but runtime browser reporting depends on `VITE_SENTRY_DSN`, which is not present in the current `.env.local`.
