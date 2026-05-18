# Blizko Redesign Launch Room — 2 Weeks

Created: 2026-05-18
Deadline: 2026-06-01

## Launch Thesis

The redesign is not primarily a visual refresh.

The product must be rebuilt around the tired parent:

> "Я сказал, что у нас происходит. Меня поняли. Мне спокойно показали следующий шаг."

Blizko should remove everything that forces an exhausted parent to think, compare, decode, or make too many decisions in a row. It should add everything that creates the feeling:

> "Меня поняли, выбор сузили, следующий шаг безопасен."

## First Technical Priority

Do first:

1. `Home`
2. first step of `ParentForm`

Reason:

This is where trust is either created or lost. Do not start with `MatchResults`, palette polish, or broad component refactoring.

## Product Decisions

### Home Stops Being A Landing Page

Home should be an app-first start screen, not a long explanation page.

Keep:
- one strong promise;
- one primary CTA;
- one short trust line;
- quick-start prompt chips;
- a clear path into parent intake.

Remove or postpone:
- long algorithm explanations;
- mission sections;
- process card walls;
- trust FAQ before action;
- anything that asks the parent to read before starting.

### First Step Is Story, Not Filters

The first parent intake screen should not start with city, child age, budget, schedule, and calendar.

Start with:
- "Расскажите, что сейчас нужно семье";
- one large calm text field;
- a few prompt chips:
  - "нужна помощь вечером";
  - "сложный график";
  - "важен мягкий подход";
  - "ребёнок тревожится".

Filters and structured fields come after the parent has entered the process.

### One Screen, One Question

Rule:

> One screen = one semantic question or one small cluster.

Avoid showing 12 chips, 5 blocks, budget, calendar, and work-style questions together.

### Show "We Understood" Summaries

After freeform story and after key steps, show concise summaries:

- "Мы поняли: вам важны мягкость, предсказуемость и связь без лишнего контроля."
- "Учтём: вечерние окна, ребёнок тяжело реагирует на смену режима."

This matters more than technical analysis language.

### Shortlist, Not Catalog

Match results should return 2-3 suitable options, not a browsing feed.

Nanny cards should lead with:
- "Почему подходит вашей семье";
- "Что проверить перед встречей";
- "Сигналы доверия".

Do not lead with score, percent, or photo-first marketplace browsing.

### Remove AI Hype

Use:
- "мы подобрали";
- "куратор посмотрит";
- "почему подходит";
- "что дальше".

Avoid:
- "AI-анализ";
- "алгоритм";
- "Humanity+ technology";
- tech-show language.

### Visual Rule

Remove:
- purple glow;
- pulse / bounce motion;
- many cards with equal visual weight;
- long explanations;
- heavy shadows;
- report-like screens.

Keep:
- large calm headings;
- paper-like surfaces;
- soft selected states;
- sticky CTA;
- clear progress;
- high contrast;
- reduced motion.

### Success Screen Reframe

The success screen should stop feeling like an AI processing show.

Use:
- "Спасибо. Мы поняли контекст."
- "Куратор посмотрит заявку."
- "Вы получите короткий shortlist."
- "Можно вернуться позже."

### Nanny Onboarding Reframe

Nanny onboarding should not feel like entering a candidate database.

Use:
- "Расскажите, как обычно работаете";
- "С чем вам комфортно";
- "Какие условия лучше обсудить заранее".

## Two-Week Delivery Structure

### Days 1-2 — Lock Entry Experience

Goal:
- ship the new Home and first ParentForm story step.

Acceptance:
- Home has one promise, one CTA, one trust line, quick-start chips.
- Parent flow starts with freeform family story.
- No AI-first language.
- Mobile 390px has no CTA overlap.

### Days 3-4 — Parent Intake Rhythm

Goal:
- restructure ParentForm into progressive low-decision steps.

Acceptance:
- one screen has one semantic question or one small cluster.
- structured fields come after the story.
- "We understood" summary appears before submit.

### Days 5-6 — Success And Care Handoff

Goal:
- replace tech-show success state with calm curator handoff.

Acceptance:
- no "AI-анализ" / algorithm theatrics.
- clear next step and safe return path.

### Days 7-9 — Curated Shortlist And Profile Trust

Goal:
- make match results and nanny profile feel curated, not catalog-like.

Acceptance:
- 2-3 options shown.
- cards lead with "why fits", "what to check", trust signals.
- profile reinforces evidence, not slogans.

### Days 10-11 — Nanny Onboarding Tone And Rhythm

Goal:
- make nanny onboarding human, face-saving, and clear.

Acceptance:
- copy frames the nanny as a person whose work style is being understood.
- no "candidate database" feeling.

### Days 12-13 — QA, Accessibility, Visual Consistency

Goal:
- run mobile, accessibility, and consistency pass.

Acceptance:
- `npm run build` passes.
- focused lint/test pass for edited surfaces.
- 390px and desktop screenshots checked.

### Day 14 — Release Gate

Goal:
- prepare deployable frontend relaunch.

Acceptance:
- release checklist completed.
- Vercel preview verified.
- critical regressions fixed or explicitly postponed.

## Tools And Ownership

- Linear: project/tasks, status, scope control.
- Figma: reference screens and visual source of truth.
- Claude Code: implementation lead for frontend changes.
- Antigravity: orchestration, design drift review, acceptance checks.
- Codex: context maintenance, code review, release gate, verification.

## Guardrail

Do not let the redesign become a broad aesthetic pass.

Every change should answer:

> Does this reduce cognitive load for a tired parent and make the next step feel safer?

