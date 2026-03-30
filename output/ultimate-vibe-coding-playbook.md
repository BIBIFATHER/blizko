# Ultimate Vibe Coding Playbook

Date: 2026-03-27
Workspace: Blizko
Focus: `Antigravity/Cursor + Claude Code/Codex + Figma + existing backend`

## 0. What This Is

This is a synthesis of 16 YouTube videos about:

- AI-first design systems
- Antigravity workflows
- Claude Code / Codex workflows
- Figma-to-code
- AutoResearch / skills / agents
- AI-native redesign and shipping

This is not a raw summary dump.

This is the operating system you actually want if:

- backend already exists
- you need a redesign or new frontend
- you want speed without turning the repo into sludge
- you want Antigravity and Claude Code to complement each other instead of competing

## 1. Source Map

### 1.1 Core Design-System / Figma-to-Code

1. `I Built My Entire Design System in 4 Hours With AI`  
   Link: https://www.youtube.com/watch?v=nafNPuElCtY  
   Channel: The Design Project  
   Duration: 8.7 min  
   Best for: fast design-system scaffolding from Figma into code

2. `The $100K AI Design System Masterclass (Gemini 3)`  
   Link: https://www.youtube.com/watch?v=qJsDfREUwDs  
   Channel: Jack Roberts  
   Duration: 45.6 min  
   Best for: commercial framing, systemized UI production

3. `The greatest design system I’ve ever used (AntiGravity)`  
   Link: https://www.youtube.com/watch?v=CpzZnudxSTM  
   Channel: Jack Roberts  
   Duration: 56.5 min  
   Best for: Antigravity as design operating system, not just prompt box

4. `How I Build a Production-Ready Design System with AI | Figma Make`  
   Link: https://www.youtube.com/watch?v=sTNy6cDMEjg  
   Channel: AI Builder Space  
   Duration: 9.6 min  
   Best for: concise production-oriented design-system workflow

### 1.2 Antigravity / Vibe UI / Visual Generation

5. `VIBE CODING FULL COURSE: Gemini 3.1 + Antigravity (6 Hrs)`  
   Link: https://www.youtube.com/watch?v=gcuR_-rzlDw  
   Channel: Nick Saraev  
   Duration: 383.1 min  
   Best for: full-stack vibe workflow mindset

6. `The Ultimate AntiGravity Masterclass (3+ HOUR FREE COURSE)`  
   Link: https://www.youtube.com/watch?v=mvHGl6zEA3w  
   Channel: Jack Roberts  
   Duration: 196.2 min  
   Best for: deep Antigravity exploration and hidden features

7. `How to Use AntiGravity Better than 99% of People`  
   Link: https://www.youtube.com/watch?v=QZCYFJTv8jI  
   Channel: Jack Roberts  
   Duration: 24.0 min  
   Best for: operational shortcuts and usage patterns

8. `AntiGravity + Spline = INSANE 3D Websites`  
   Link: https://www.youtube.com/watch?v=nhibi9TRgNc  
   Channel: Jack Roberts  
   Duration: 40.8 min  
   Best for: 3D hero sections, premium motion, visual differentiation

### 1.3 Claude Code / Codex / Skills / Research

9. `Claude Code's New Upgrade: /btw`  
   Link: https://www.youtube.com/watch?v=ZbKNpn0woDY  
   Channel: Nick Saraev  
   Duration: 5.2 min  
   Best for: token and context efficiency

10. `Stop Fixing Your Claude Skills. Autoresearch Does It For You`  
    Link: https://www.youtube.com/watch?v=qKU-e0x2EmE  
    Channel: Nick Saraev  
    Duration: 16.5 min  
    Best for: self-improving skills, research-first automation

11. `Claude Code + Kaparthy’s AutoResearch = GOD MODE`  
    Link: https://www.youtube.com/watch?v=vXylQqxsGX0  
    Channel: Jack Roberts  
    Duration: 31.3 min  
    Best for: research loops before implementation

12. `AI Agents Full Course 2026: Master Agentic AI`  
    Link: https://www.youtube.com/watch?v=EsTrWCV0Ph4  
    Channel: Nick Saraev  
    Duration: 133.2 min  
    Best for: agent orchestration mental models

### 1.4 Hybrid Design + Code

13. `Claude Code + Nano Banana 2 + Kling = $15K Animated Sites`  
    Link: https://www.youtube.com/watch?v=ZfYvv-0l9NA  
    Channel: Nick Saraev  
    Duration: 14.0 min  
    Best for: packaging AI visuals into premium-feeling sites

14. `Claude Code + Stitch 2.0 Destroys Web design (Figma Killer)`  
    Link: https://www.youtube.com/watch?v=eNJfD6yHeIY  
    Channel: Jack Roberts  
    Duration: 26.5 min  
    Best for: rapid UI ideation before repo integration

15. `Vibe Design вышел на новый уровень — Figma + OpenAI Codex`  
    Link: https://www.youtube.com/watch?v=3mMPtWjlefM  
    Channel: Даниил Шишко x Pixel Perfect  
    Duration: 19.9 min  
    Best for: design-to-code convergence

16. `Vibe Design — Новая эра интерфейсов | Claude + Figma MCP, Pencil.dev, Motiff`  
    Link: https://www.youtube.com/watch?v=h2jzrWSJ008  
    Channel: Даниил Шишко x Pixel Perfect  
    Duration: 22.9 min  
    Best for: modern UI generation tooling landscape

## 2. The Core Synthesis

All 16 videos keep repeating the same truth:

`The biggest multiplier is not one magical model. It is the handoff quality between exploration, systemization, implementation, and verification.`

The strongest combined pattern is:

1. Use AI to generate options fast.
2. Turn those options into a reusable system quickly.
3. Move from visuals to code as early as possible.
4. Keep one tool for exploration and another for repo-grounded implementation.
5. Use research loops to improve prompts and skills instead of manually tweaking forever.
6. Ship through verification, not vibes.

## 3. What Each Tool Should Own

### 3.1 Antigravity / Cursor

Use it for:

- fast visual ideation
- multiple design directions
- premium hero sections
- motion exploration
- design-system look-and-feel generation
- landing pages, storytelling pages, 3D-first surfaces
- broad experimentation before the repo is touched

Do not let it own:

- backend-aware integration
- real routing/data contracts
- production-safe refactors across the existing app
- final QA confidence

### 3.2 Claude Code / Codex

Use it for:

- repo-grounded implementation
- understanding existing backend contracts
- real component integration
- state flows and effects
- API wiring
- database/RLS-sensitive paths
- refactors
- verification
- release-readiness

Do not waste it on:

- endless visual fishing with no constraints
- generating 20 aesthetic variants before a clear system exists

### 3.3 Figma / Stitch / MCP

Use them for:

- structuring the visual system
- preserving reusable components/tokens
- aligning designers and code
- documenting the UI system

Do not let them become:

- a second source of truth that diverges from code

### 3.4 AutoResearch / Skills / Agents

Use them for:

- discovering best practices before coding
- generating improved skills/prompts from failures
- collecting patterns across sessions
- creating repeatable mini-workflows

## 4. The Best Operating Model For Your Situation

Your situation:

- existing backend already written
- you want redesign + site/app building
- you want maximum leverage from Antigravity/Cursor and Claude Code/Codex together

The correct operating model is:

### Phase 1. Understand The Existing System

Owner: `Claude Code / Codex`

Outputs:

- backend capability map
- API contract map
- screen inventory
- reusable domain objects
- risky coupling list

Why:

If backend already exists, redesigning from the visual side first is dangerous.
You need to know what the UI must actually support.

### Phase 2. Create The Visual System

Owner: `Antigravity + Figma`

Outputs:

- visual direction options
- token set
- component family
- layout patterns
- motion language

Why:

This is where Antigravity is strongest: speed, breadth, aesthetics, variation.

### Phase 3. Freeze The System Into Rules

Owner: `Claude Code / Codex`

Outputs:

- component architecture
- token definitions in code
- folder structure
- naming rules
- acceptance criteria

Why:

This is the bridge between vibe and production.
Without this step, every new screen becomes a fresh hallucination.

### Phase 4. Build Screens Fast

Owner split:

- Antigravity/Cursor: first-pass UI exploration
- Claude Code/Codex: final integration in repo

Rule:

Never paste raw Antigravity output into the main app without a repo-grounded rewrite.

### Phase 5. Verify Hard

Owner: `Claude Code / Codex`

Outputs:

- responsive check
- loading/error/empty states
- auth states
- real API integration
- lint/test/build
- release risks

## 5. Your Ultimate Division Of Labor

Use this exact split.

### Antigravity/Cursor is the `Creative Frontend Lab`

Responsibilities:

- concept generation
- design direction
- page composition
- premium storytelling sections
- animation ideas
- fast component drafts

### Claude Code/Codex is the `Production Integration Engine`

Responsibilities:

- audit existing repo
- implement final components
- wire state and data
- enforce consistency
- clean architecture
- debug regressions
- run verification

### Figma is the `System Memory`

Responsibilities:

- source of visual patterns
- token organization
- component kit
- handoff clarity

## 6. The Golden Workflow For Redesigning An Existing App

Use this every time.

### Step 1. Backend-Aware Product Audit

Prompt for Codex:

```text
Audit this codebase for a redesign project.

I already have the backend.
Your job is to map:
- current routes/screens
- API endpoints and their consumers
- shared domain types
- auth/session assumptions
- loading/error/empty states
- UI surfaces that can be redesigned without backend changes
- UI surfaces blocked by backend constraints

Output:
1. Screen inventory
2. Data contract inventory
3. Reusable component opportunities
4. Redesign risks
5. Recommended redesign order
```

### Step 2. Visual Direction Exploration In Antigravity

Prompt:

```text
Redesign this app UI without changing the backend capabilities.

Context:
- Existing backend is fixed for now
- Prioritize trust, clarity, conversion, and modern product quality
- Avoid generic SaaS dashboard aesthetics
- Build a coherent design system first, then apply it to screens

Deliver:
- 3 visual directions
- token suggestions
- component patterns
- hero/landing treatment if relevant
- mobile and desktop considerations
```

### Step 3. Convert Visual Direction Into A Code System

Prompt for Codex:

```text
Turn this redesign direction into a production-ready UI system for the existing repo.

Do not redesign backend contracts.
Do not invent fake data shapes.

Create:
- design tokens
- component architecture
- naming rules
- screen composition rules
- migration plan from old UI to new UI

Output:
1. Token map
2. Component list
3. File structure changes
4. Implementation sequence
```

### Step 4. Build One Vertical Slice First

Prompt:

```text
Implement one complete vertical slice of the redesign.

Scope:
- one real screen
- real data
- real loading/error/empty states
- production-safe responsiveness

Do not redesign the whole app at once.
Use this slice to prove the system.
```

### Step 5. Expand Only After Verification

Prompt:

```text
Use the completed screen as the reference system.

Now extend the redesign to adjacent screens while preserving:
- tokens
- spacing logic
- typography
- motion language
- API/data contracts

Flag any deviations instead of improvising new patterns.
```

## 7. What The Videos Get Right

### 7.1 Strong Ideas Repeated Across Videos

- Start a fresh context for each major feature.
- Design systems are the real speed multiplier.
- Visual generation is most useful when converted into reusable code quickly.
- Research loops beat manual trial-and-error prompt tweaking.
- Agents and skills matter more when they improve workflow reliability.
- Tool chaining is stronger than tool worship.

### 7.2 What Is Actually Valuable

- `new context per feature`
- `system before screen`
- `research before skill edits`
- `code as source of truth`
- `design exploration separate from integration`

## 8. What The Videos Overhype

- “Build everything in minutes”
- “Figma killer”
- “No code needed”
- “One tool replaces the whole stack”

Reality:

- Antigravity is not your final source of truth.
- Stitch is not enough for production integration.
- Raw vibe output degrades quickly without a system.
- Existing backend apps need repo-aware implementation, not just pretty mockups.

## 9. The Anti-Slop Rules

If you want to become genuinely elite at vibe coding, enforce these rules:

1. Never generate a full redesign before mapping real backend constraints.
2. Never merge visual experiments directly into the main app.
3. Never accept a new component pattern unless it can be reused 3+ times.
4. Never let motion or style outrun clarity.
5. Never trust a great screenshot until loading/error/auth states exist.
6. Never keep one giant AI chat for the whole product.
7. Never call a feature done before lint/test/build and a real walkthrough.

## 10. The Best Watch Order

### 90-Minute Essential Track

1. `nafNPuElCtY`  
   Why: fastest design-system foundation

2. `QZCYFJTv8jI`  
   Why: Antigravity operating habits

3. `ZbKNpn0woDY`  
   Why: context efficiency and token hygiene

4. `qKU-e0x2EmE`  
   Why: skill improvement via research loops

5. `3mMPtWjlefM`  
   Why: Figma + Codex bridge from a design perspective

6. `h2jzrWSJ008`  
   Why: updated vibe design tooling landscape

#### Suggested Session Timing

- `00:00-00:09` -> `nafNPuElCtY`
- `00:09-00:33` -> `QZCYFJTv8jI`
- `00:33-00:38` -> `ZbKNpn0woDY`
- `00:38-00:55` -> `qKU-e0x2EmE`
- `00:55-01:15` -> `3mMPtWjlefM`
- `01:15-01:38` -> `h2jzrWSJ008`

#### If You Only Have 30 Minutes

- `00:00-00:09` -> `nafNPuElCtY`
- `00:09-00:14` -> `ZbKNpn0woDY`
- `00:14-00:30` -> `qKU-e0x2EmE`

### 1-Day Deep Dive

Add:

- `qJsDfREUwDs`
- `CpzZnudxSTM`
- `eNJfD6yHeIY`
- `vXylQqxsGX0`
- `EsTrWCV0Ph4`

#### Suggested 1-Day Timing

- Block 1, `00:00-01:38` -> 90-minute essential track
- Block 2, `01:38-02:24` -> `qJsDfREUwDs`
- Block 3, `02:24-03:21` -> `CpzZnudxSTM`
- Block 4, `03:21-03:48` -> `eNJfD6yHeIY`
- Block 5, `03:48-04:19` -> `vXylQqxsGX0`
- Block 6, `04:19-06:32` -> `EsTrWCV0Ph4`

### Full Mastery

Then do:

- `gcuR_-rzlDw`
- `mvHGl6zEA3w`
- `nhibi9TRgNc`
- `ZfYvv-0l9NA`

#### Suggested Full-Mastery Order

- Day 1 -> section above
- Day 2 -> `gcuR_-rzlDw`
- Day 3 -> `mvHGl6zEA3w`
- Day 4 -> `nhibi9TRgNc` + `ZfYvv-0l9NA`

## 11. Ready-To-Use Prompt Library

### 11.1 System Audit Prompt For Codex

```text
You are the production integration lead for this repo.

Task:
Audit the existing codebase for a redesign.

Constraints:
- Backend already exists
- Do not propose backend rewrites unless strictly necessary
- Focus on reusable frontend architecture
- Treat file-backed code as source of truth

Return:
1. UI inventory
2. Data contract inventory
3. Redesign-safe areas
4. Backend-coupled areas
5. First vertical slice recommendation
```

### 11.2 Antigravity Exploration Prompt

```text
Act as a world-class product designer and frontend art director.

Design a new UI direction for this app.

Goals:
- modern, premium, memorable
- trust-first, not gimmick-first
- coherent design system
- mobile and desktop

Constraints:
- existing backend capabilities stay fixed
- avoid generic SaaS templates
- avoid dribbble-only visuals that break in production

Deliver:
- design direction
- tokens
- component patterns
- layout grammar
- motion principles
```

### 11.3 Figma-to-System Prompt

```text
Convert this visual direction into a reusable design system.

Need:
- color tokens
- type scale
- spacing scale
- radii
- shadow logic
- component families
- state variants

Output must be reusable across the whole app, not just one screen.
```

### 11.4 Codex Integration Prompt

```text
Implement this UI system inside the real repo.

Rules:
- preserve existing business logic
- preserve API contracts
- do not invent fake backend fields
- build production-quality components
- include loading, error, empty, and responsive states

Deliver:
- code changes
- verification
- residual risks
```

### 11.5 Repair Prompt

```text
This redesign implementation drifted from the system.

Audit for:
- token inconsistency
- spacing drift
- typography drift
- duplicated components
- backend contract mismatches
- broken states

Return:
1. Issues
2. Root cause
3. Fix order
```

### 11.6 AutoResearch Prompt

```text
Research best practices before changing the skill/workflow.

Question:
What exact prompt structure, context split, and handoff pattern gives the most reliable output for [task]?

Return:
1. stable patterns
2. unstable patterns
3. recommended workflow
4. prompt template
5. what to avoid
```

## 12. The Codex Prompt I’d Use For You

This is the rewritten prompt for using Codex/Claude Code as your elite production partner.

```text
You are my repo-grounded product engineering partner.

Your role:
- think like a CTO, lead frontend architect, and implementation operator
- stay grounded in the actual codebase, not abstract theory
- optimize for shipping high-quality product fast

Main rule:
Antigravity/Cursor is for exploration.
You are for production.

When I am redesigning an app with an existing backend:
- first map the real constraints
- then define the frontend system
- then implement one vertical slice
- then expand safely

Always do:
- inspect current code before proposing changes
- preserve backend contracts unless explicitly told otherwise
- separate visual experimentation from production implementation
- prefer reusable systems over one-off screens
- include loading, error, empty, auth, and responsive states
- run verification before claiming quality

When helpful, structure your work like this:
1. What exists now
2. What should change
3. What can be reused
4. What is risky
5. Implementation order

For redesign work:
- convert vague taste into tokens, components, states, and layout rules
- reject generic AI aesthetics
- preserve clarity and trust over flashy clutter

For code changes:
- be concise
- edit the repo directly
- verify what you changed
- call out residual risks

Never:
- invent backend capabilities
- hallucinate API contracts
- ship screenshot-level UI without real states
- let design drift between screens
- claim “done” without proof
```

## 13. The Real Meta-Lesson

The highest-level lesson from all of these videos is simple:

`Elite vibe coding is not about generating more. It is about reducing entropy between idea, system, code, and verification.`

If you do this right:

- Antigravity gives you speed and originality
- Figma gives you visual memory
- Claude Code/Codex gives you production truth
- research loops give you reliability

That is the stack.

## 14. Recommended Next Move For Blizko

For your actual app, I would do this next:

1. Run a redesign audit on the existing repo from the backend outward.
2. Pick one high-impact screen to become the new reference system.
3. Use Antigravity to generate 2 to 3 directions only.
4. Freeze the winning direction into tokens/components.
5. Implement one production-quality vertical slice in the real repo.
6. Expand only after verification.

## 15. Fast Navigation

- Want speed: go to section 5
- Want the real workflow: go to section 6
- Want prompts: go to section 11
- Want the custom Codex prompt: go to section 12
- Want the philosophy: go to section 13
