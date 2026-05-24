# CLAUDE.md

## Scope

This file contains local coding rules for the Blizko repository.

Global personal memory lives outside this repository:

`/Users/anton/Documents/Claude-Memory`

Use global memory for durable preferences, values, and cross-project rules. Use this repository for Blizko-specific code, architecture, commands, ADRs, and implementation details.

## Read First

Before code changes, read only the smallest relevant set:

- `BOOTSTRAP.md`
- `CLAUDE.md`
- `README.md`
- `.context/DNA.md`
- `.context/CHANGELOG.md` when recent project history matters
- relevant files in `src/`, `api/`, `supabase/`, `SQL/`, or `docs/`

Do not load the whole Obsidian/global memory vault or the whole repository unless the task explicitly requires it.

## Token Budget

- Read summary files before long archives.
- Do not load the whole repository, `.context/`, changelog, journal, or ADR folder without explicit need.
- Before reading a large file, estimate its size and state why it is needed.
- For files above 2500 tokens, read headings, summaries, or relevant fragments first.
- Keep this `CLAUDE.md` under 2500 tokens.
- Keep active project summaries under 1500 tokens each.
- Move stale detail into archive notes and keep active memory focused on current state and links.

## Current Stack

- App: React 19, TypeScript, Vite, React Router.
- Styling: Tailwind CSS 4, Blizko Cloud Design System tokens in `index.css`.
- Backend/API: Vercel serverless functions in `api/`.
- Data/auth: Supabase PostgreSQL, Supabase JS, `pg` server-side pool.
- Mobile: Capacitor for iOS and Android.
- Quality: ESLint, Prettier, Vitest.

## Product Rules

- Preserve the Blizko promise: trust, calm, privacy, and premium care experience.
- Protect family and nanny personal data as high-risk user data.
- Treat safety, moderation, consent, and support flows as core product surfaces, not edge cases.
- Keep growth mechanics aligned with trust; do not add dark patterns or noisy referral UI.

## Engineering Rules

- Read existing code and contracts before editing.
- Keep changes scoped to the requested behavior.
- Preserve API calls, event names, state shape, and backend contracts during UI-only redesigns.
- Prefer typed boundaries and avoid `any`.
- Validate external input at API and server boundaries.
- Keep Supabase RLS assumptions explicit and documented.
- Never rely on client-side filtering for authorization.
- Add or update focused tests for risky behavior, auth, payments, matching, storage, or data access changes.

## UI Rules

- Build UI from Blizko Cloud Design System tokens before adding new styles.
- Use Tailwind and existing component patterns instead of one-off CSS.
- Use Lucide icons where a matching icon exists.
- Keep mobile ergonomics first; Blizko is an app-like experience.
- Use motion only when it improves clarity, continuity, or perceived quality.

## Documentation

- Keep repo-specific technical memory in `.context/`.
- Put architecture decisions in Markdown ADRs under `docs/adr/` when the decision affects auth, data, deployment, matching, payments, or core UI architecture.
- Keep global memory changes in `/Users/anton/Documents/Claude-Memory`, not in this repository.
- Resume every restart from `BOOTSTRAP.md`, then the active daily memory files, then `MEMORY.md`.

## Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
- Format check: `npm run format:check`
- Env check: `npm run env:doctor:local`

## Completion Checklist

- Run the narrowest relevant verification command.
- Update `.context/CHANGELOG.md` after meaningful repository changes.
- Update ADRs when an architectural decision changes.
- Keep `CLAUDE.md` under 2500 tokens; consolidate before expanding it.
