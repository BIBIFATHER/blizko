# Blizko Frontend Relaunch Handoff

Last updated: 2026-05-18 21:32 MSK

## Purpose

This file is the shared context for Codex, Claude, Antigravity, and any other agent working on the Blizko frontend relaunch.

Before doing frontend work, read this file first, then:

- `.context/DNA.md`
- `.context/CODEX_OPERATING_PROTOCOL.md`
- `AGENTS.md`

Do not rely on chat memory as the source of truth. Update this file when design/product decisions change.

## Current Preview

Local dev server:

```bash
cd "/Users/anton/Desktop/blizko 3"
npm run dev -- --host 127.0.0.1 --port 3000
```

Local URL:

```text
http://127.0.0.1:3000/
```

Cloudflare tunnel for external agents:

```text
https://its-bathrooms-from-sent.trycloudflare.com/
```

If the tunnel URL changes, update this file and `vite.config.ts` `server.allowedHosts`.

## Linear

Project:

```text
Blizko Frontend Relaunch
https://linear.app/blizko/project/blizko-frontend-relaunch-86db2babb32b
```

Key docs:

```text
Launch Room
https://linear.app/blizko/document/launch-room-089004d6178f

Brand Voice
https://linear.app/blizko/document/brand-voice-trust-first-care-advisor-512c8c6c4521
```

Daily mode:

- Linear is the cockpit, not an idea dump.
- Track 10-15 executable tasks.
- Focus first on `Urgent/High` and `In Progress`.
- Move implementation-complete tasks to `In Review`, not `Done`, until verified.

## Product Principle

The core user is a tired parent with low attention and anxiety, often using the app in the evening.

Blizko should feel like:

```text
Я сказал, что у нас происходит.
Меня поняли.
Мне спокойно показали следующий шаг.
```

Do not build screens that force the parent to read, compare, and make 20 decisions in a row.

Core rule:

```text
One screen = one semantic question or one small decision cluster.
```

## Frontend Direction

Home is not a landing page.

The current Home direction is a mobile onboarding-style first screen inspired by the Dribbble job-search app reference the user liked:

```text
https://dribbble.com/shots/26010733-Job-search-mobile-app
```

We should not copy assets 1:1. We copy the interaction logic and composition:

- full first screen;
- big central photo;
- two small circular top actions;
- one strong headline;
- one primary CTA;
- no long explanatory landing sections.

Current Home headline:

```text
Поиск вашей няни начинается тут
```

Top circular actions:

- left: share app;
- right: open account/login.

CTA:

```text
Начать
```

## Design System From Perplexity

Use the Warm Trust system from the Perplexity analysis.

Color tokens:

| Token | HEX | Role |
|---|---:|---|
| `--color-bg` | `#F9F6F2` | Porcelain, primary background |
| `--color-ink` / text | `#1C2B2D` | Deep Ink, text and icons |
| `--color-action` / primary | `#2A6B6E` | Deep Petrol, CTA and active elements |
| `--color-surface` | `#EFF3F2` | Mist, cards/modals/secondary layer |
| `--color-accent-soft` | `#7FA99B` | Sage, hover and quiet details |
| `--color-micro` | `#C4744A` | Copper, micro-accent only |
| `--color-white` | `#FFFFFF` | Inputs and photo frames |

Rules:

- Copper is a micro-accent only, max 2-3 uses per screen.
- Avoid commodity blue.
- Avoid purple glow, pulse, bounce, heavy shadows, and AI spectacle.
- Prefer calm contrast, paper surfaces, clear progress, sticky CTA where useful.

Typography:

- Headings H1-H2: `Playfair Display` (replaced Fraunces 2026-05-18 — feels warmer and more familiar on Cyrillic).
- UI/body: `Inter`.
- Body baseline: 16px / 1.5.
- Avoid bold uppercase CTA copy. CTA should feel calm and direct.

Home H1 spec: `font-medium`, `text-[2.75rem]` / `sm:text-[3.2rem]`, `leading-[1.08]`, `tracking-[-0.015em]`.

Current implementation:

- `index.html` imports Playfair Display + Inter from Google Fonts.
- `index.css` maps `--font-display` to Playfair Display and `--font-sans` to Inter.
- `index.css` maps Warm Trust CSS variables and compatibility aliases.

## What Changed Today

Implemented:

- Created Linear project `Blizko Frontend Relaunch`.
- Created Launch Room and Brand Voice docs in Linear.
- Created milestones and implementation issues, including frontend, trust UX, QA, release, and backend readiness.
- Added backend readiness tasks for RLS, Yookassa, Sentry, Vercel env, and API auth.
- Reworked `Home` away from old AI/Humanity+ landing copy.
- Reworked `Home` to a mobile onboarding-style first screen.
- Removed global `AppHeader` on `/` so the first screen is clean.
- Added two circular actions on Home:
  - share app;
  - account/login.
- Applied Warm Trust palette and Fraunces/Inter typography.
- Added Cloudflare tunnel host to `vite.config.ts` `server.allowedHosts`.

Files changed in this flow:

- `src/components/Home.tsx`
- `App.tsx`
- `index.css`
- `index.html`
- `vite.config.ts`
- `.context/FRONTEND_RELAUNCH_HANDOFF.md`

Verification run:

```bash
npm run build
```

Build passed after the latest Home/design-token changes.

## Current Technical Notes

The repo may have many unrelated dirty files. Do not revert changes you did not make.

Dev server:

- Vite runs on `127.0.0.1:3000`.
- External agents usually cannot use `127.0.0.1`.
- Use Cloudflare Tunnel for external review.

Cloudflare quick tunnel command:

```bash
npx --yes cloudflared tunnel --url http://127.0.0.1:3000
```

If Vite blocks the tunnel host, add it to:

```ts
server: {
  allowedHosts: ['<tunnel-host>'],
}
```

Then restart Vite.

## Next Work Order

Recommended next tasks:

1. Finish `Home` visual QA at mobile width 390px.
2. Start BLI-7: ParentForm Step 1 as freeform family story.
3. Keep first parent step calm:
   - large textarea;
   - prompt chips;
   - privacy/curator line;
   - no filters first.
4. Then BLI-8: restructure ParentForm into low-decision steps.
5. Then BLI-10: add “We understood” summary before submit.

Do not jump to MatchResults before Home + ParentForm entry are coherent.

## Claude / Codex Startup Prompt

Use this when starting a new agent session:

```text
You are working on Blizko in:
/Users/anton/Desktop/blizko 3

Before doing anything, read:
.context/FRONTEND_RELAUNCH_HANDOFF.md
.context/DNA.md
.context/CODEX_OPERATING_PROTOCOL.md
AGENTS.md

Use Linear as the cockpit:
https://linear.app/blizko/project/blizko-frontend-relaunch-86db2babb32b

Current preview:
http://127.0.0.1:3000/

If you are outside the local machine, use the Cloudflare tunnel URL from FRONTEND_RELAUNCH_HANDOFF.md.

Do not redesign from scratch. Continue the Warm Trust + tired-parent direction.
```

