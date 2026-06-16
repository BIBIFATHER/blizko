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
- `.context/ACTIVE_TASK.md` when it exists
- `.context/AGENT_COORDINATION.md`
- `README.md`
- `.context/DNA.md`
- `.context/CHANGELOG.md` when recent project history matters
- relevant files in `src/`, `api/`, `supabase/`, `SQL/`, or `docs/`

Do not load the whole Obsidian/global memory vault or the whole repository unless the task explicitly requires it.

## Session Continuity

- Treat `.context/ACTIVE_TASK.md` as the source of truth for live execution
  state, pending steps, blockers, and safety boundaries.
- At every session start or resume after `/compact`, read it before historical
  notes, then verify live git, PR, CI, deployment, Linear, and production state.
  A recorded status is a checkpoint, not proof that the external state is still
  current.
- Continue the first pending safe step automatically. Stop only at an explicit
  approval gate, a real blocker, or completed acceptance criteria.
- Update the checkpoint after every material milestone and before compaction,
  token/session limits, handoff, or stopping. Never put secrets in it.
- When the task is complete, record durable evidence in Linear/CHANGELOG and
  clear or archive the active checkpoint.

### Git Hygiene Before Changes

Before editing files, run `git status --short` and classify the dirty tree. Do
not start new work on top of unrelated dirty files silently. If previous work is
complete, make a scoped checkpoint commit before changing more files. Never use
`git add .`; stage explicit paths only. If dirty files remain at handoff, list
exactly what is unstaged and why.

### Claude / Codex Coordination

Claude is the default lead agent for Blizko. Anton gives a task once; own it
end to end and do not ask him to relay prompts, findings, or files between
Claude and Codex. Follow
`.context/AGENT_COORDINATION.md`: request independent review only at its defined
risk gates, resolve ordinary findings yourself, and return one consolidated
answer. Use repository context and Linear as shared state.

At a mandatory review gate, send your actual conclusion to Codex with
`npm run review:codex -- "..."`. Verify its findings, correct valid issues, and
request a second check if the conclusion materially changes. Do not ask Anton
to relay the review.

### Mandatory Database Protocol

Before diagnosing, implementing, reviewing, deploying, or approving any Supabase,
PostgreSQL, Auth, Storage, RLS, RPC, migration, cron-SQL, or database-backed
change, read and follow:

- `.context/CODEX_DB_CHANGE_PROTOCOL.md`

At the start of the work, explicitly confirm that the protocol was read and state
the selected migration path. Prefer supported Supabase migration tooling
(`supabase db push --linked`) over manual DDL plus migration-history repair.
Manual DDL and `migration repair` are fallback-only after a demonstrated CLI
failure and require an explicit production approval.
Never offer temporary schema/ledger drift for routine work. Wait for the
supported path to recover. A drift-producing emergency fallback is allowed only
to resolve an active production outage, with explicit approval and immediate
ledger reconciliation.

### Mandatory Legal and Security Protocol

Before planning, implementing, reviewing, deploying, or approving work touching
personal data, documents, AI, analytics, payments, external services,
consent/privacy, moderation, verification, trust claims, or infrastructure,
read and follow:

- `.context/CODEX_LEGAL_SECURITY_PROTOCOL.md`
- `docs/compliance/DATA_REGISTER.md`
- `docs/compliance/PROCESSOR_REGISTER.md`

Use `blizko-lawyer` and `blizko-security`. Infer facts from code, configuration,
migrations, and runtime evidence; do not ask Anton to fill compliance forms.
Unknown mandatory evidence is a release blocker, not an accepted assumption.

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

## Verifying AI-sourced input (Codex and other AIs)

When the user passes you output, a recommendation, or text from another AI
(including Codex), do not accept it as truth or agree automatically. Always:

- independently verify facts against the code, production, Linear, and primary
  sources;
- separate confirmed facts from assumptions;
- point out errors, contradictions, and risks;
- give your own reasoned verdict;
- propose a better option if you disagree;
- for legal, security, financial, and production matters, never act on another
  AI's text alone;
- if verification is impossible, state explicitly what is unconfirmed.

## Completion Checklist

- Run the narrowest relevant verification command.
- For database-backed changes, complete the gates in `.context/CODEX_DB_CHANGE_PROTOCOL.md`.
- Update `.context/CHANGELOG.md` after meaningful repository changes.
- Update ADRs when an architectural decision changes.
- Update or clear `.context/ACTIVE_TASK.md` before handing off or stopping.
- Keep `CLAUDE.md` under 2500 tokens; consolidate before expanding it.
