# Blizko — Product & Technical Brief

## 1. Product Thesis

Blizko is not a nanny marketplace.

Blizko is a trusted care advisor for tired parents who need calm, safe, understandable help finding a nanny.

The product helps an exhausted parent explain what is happening in their family, turns that context into a structured request, asks only necessary follow-up questions, and returns a curated shortlist of 2-3 trusted nanny matches with clear reasons and next steps.

Core emotional promise:

> "I was understood. My choice was safely narrowed down. I know what happens next."

## 2. Target User: The Tired Parent

The primary user is a tired, anxious parent with limited attention and high emotional stakes.

They may be using the app:
- late at night;
- while holding a child;
- between family tasks;
- under stress;
- with low patience for reading, comparing, and decision-making.

This user does not want:
- a catalog of nannies;
- endless filters;
- long explanations;
- AI hype;
- dozens of profiles;
- unclear next steps.

They want:
- to say what is happening;
- to feel understood;
- to see a safe narrowed choice;
- to know what happens next.

Design implication:

> Do not make the parent think more than necessary.

## 3. Product Direction

Blizko should feel like a calm, attentive care concierge:

- warm;
- trustworthy;
- precise;
- human;
- low-pressure;
- not fake-friendly;
- not corporate;
- not luxury concierge;
- not generic AI app.

The app should turn family chaos into a clear, trusted shortlist.

## 4. Core UX Flow

Primary parent journey:

1. Home
2. Start parent request
3. Freeform family story
4. Structured editable summary
5. Necessary follow-up questions
6. Calendar / schedule / budget details
7. "We understood" summary
8. Submit request
9. Success / what happens next
10. Curated match results
11. Nanny profile
12. Message / meet / trial day

The key mechanic is hybrid intake:

> Freeform story -> structured summary -> follow-up questions -> curated shortlist.

## 5. Current Technical Stack

Blizko is already implemented as a production web/PWA app.

Frontend:
- Vite
- React 19
- TypeScript
- React Router
- Tailwind CSS 4
- Lucide React icons
- Framer Motion for selected motion patterns
- Capacitor configured for future iOS/Android wrapping

Backend / data:
- Supabase
- PostgreSQL
- Row Level Security emphasis
- Vercel serverless API routes
- Local fallback storage for offline-first behavior

Existing logic includes:
- parent request submission;
- nanny profile submission;
- matching logic;
- risk / compatibility scoring;
- document verification logic;
- support chat;
- analytics events;
- referrals;
- payments flow;
- auth/session handling;
- role dashboards.

Production source of truth:

`/Users/anton/Desktop/blizko 3`

## 6. Current Routes / Screens

Core routes:

- `/` — Home
- `/find-nanny` — Parent request flow
- `/become-nanny` — Nanny onboarding flow
- `/success` — Submission/payment/matching success screen
- `/match-results` — Curated match results / shortlist
- `/nanny/:slug` — Public nanny profile
- `/for-nannies` — Nanny-facing landing page

Account / utility routes:

- `/login`
- `/family-dashboard`
- `/nanny-dashboard`
- `/admin`

Legal / SEO routes:

- `/how-we-verify`
- `/humanity-plus`
- `/oferta`
- `/about`
- `/safe-deal`
- `/privacy`

## 7. Important Code Areas

Main app shell:

- `App.tsx`
- `src/components/app/AppHeader.tsx`
- `src/components/app/AppFooter.tsx`

Home:

- `src/components/Home.tsx`

Parent flow:

- `src/components/ParentForm.tsx`
- `src/components/forms/parent/ParentFormWrapper.tsx`
- `src/components/forms/parent/ParentFormProvider.tsx`
- `src/components/forms/parent/Step1_Requirements.tsx`
- `src/components/forms/parent/Step2_Calendar.tsx`
- `src/components/forms/parent/Step3_FamilyProfile.tsx`

Nanny flow:

- `src/components/NannyForm.tsx`
- `src/components/forms/nanny/NannyFormWrapper.tsx`
- `src/components/forms/nanny/NannyFormProvider.tsx`
- `src/components/forms/nanny/Step1_BasicInfo.tsx`
- `src/components/forms/nanny/Step2_Experience.tsx`
- `src/components/forms/nanny/Step3_Verification.tsx`
- `src/components/forms/nanny/Step4_Psychology.tsx`

Shared UI:

- `src/components/ui/form-primitives.tsx`
- `src/components/ui/surface-primitives.tsx`
- `src/components/ui/StepWizardShell.tsx`
- `src/components/ui/feedback-primitives.tsx`

Other key screens:

- `src/components/SuccessScreen.tsx`
- `src/components/MatchResultsScreen.tsx`
- `src/components/nanny/NannyPublicProfile.tsx`

Design tokens:

- `index.css`

## 8. Existing Parent Data Model

Current parent request flow already has enough fields for v1 hybrid intake.

Existing data includes:
- `city`
- `childAge`
- `schedule`
- `budgetHourly`
- `budgetMonthly`
- `comment`
- `dateFrom`
- `dateTo`
- `analysisNotes`
- `isNannySharing`
- `selectedSlots`
- `requirements`
- `documents`
- `riskProfile`

No new backend schema is required for v1.

Recommended mapping:
- freeform family story -> `analysisNotes`
- structured notes -> `comment`
- priorities -> `requirements`
- family style / stress / communication preferences -> `riskProfile`
- calendar availability -> `selectedSlots`, `dateFrom`, `dateTo`

## 9. Needed Product Changes

### Home

Current Home should stop behaving like a long landing page.

It should become an app-first entry screen with:
- one clear promise;
- one main CTA;
- one short trust line;
- quick-start chips;
- a preview of how a family story becomes a shortlist.

Example promise:

> "Расскажите, как живёт ваша семья — мы соберём не список анкет, а подходящие совпадения."

Primary CTA:

> "Начать подбор"

Avoid:
- long explanation blocks;
- AI-first positioning;
- marketplace language;
- FAQ-style first screen.

### Parent Flow

Convert current parent form into hybrid intake:

1. `Рассказ`
   - freeform story about family context;
   - calm prompt chips;
   - privacy/trust line.

2. `Структура`
   - city;
   - child age;
   - schedule;
   - budget;
   - calendar slots.

3. `Контекст`
   - family style;
   - child stress;
   - triggers;
   - communication preference;
   - red lines;
   - household details.

4. `Готово`
   - editable summary cards:
     - "Мы поняли"
     - "Что учтём"
     - "Что дальше"

The goal is for the parent to feel understood before submitting.

### Nanny Flow

Keep the current technical structure, but change the experience from "candidate form" to:

> "Create a profile that helps families understand your style."

Suggested step labels:
1. `О вас`
2. `Опыт`
3. `Проверка`
4. `Стиль и условия`

Use face-saving copy:
- "Расскажите, как обычно работаете"
- "С чем вам комфортно"
- "Какие условия лучше обсудить заранее"

### Success Screen

Change from AI-style processing to calm care handoff.

Instead of:
- "AI-анализ заявки"
- score/progress theater
- tech-show animations

Use:
- "Спасибо. Мы поняли контекст."
- "Куратор посмотрит заявку."
- "Вы получите короткий shortlist."
- "Можно вернуться позже."

### Match Results

Make match results feel like editorial curated matching, not a marketplace.

Each nanny card should start with:
- "Почему подходит вашей семье"
- trust signals
- context notes
- what to discuss before meeting
- CTA: "Познакомиться"

Avoid:
- "кандидат"
- AI / ИИ language
- purple accent/glow
- emoji badges
- catalog-like browsing
- too many profiles

## 10. Visual Direction

Target design direction:

- Warm Trust
- Editorial Calm
- Care-intelligence, not marketplace
- Premium through spacing, clarity, typography, and restraint

Keep current implementation fonts:
- Display / headings: `Newsreader`
- UI / body: `Manrope`

Suggested color roles:
- Background: Porcelain / warm paper
- Text: Deep warm ink
- Primary action: Deep Petrol / trust teal
- Secondary surfaces: Mist / Sage
- Micro-accent: Copper only in small moments

Avoid:
- purple SaaS gradients
- tech-startup blue
- oversized coral / terracotta as main CTA
- heavy shadows
- heavy animation
- generic AI polish

## 11. UI Principles

For tired parents:
- reduce reading before action;
- avoid many decisions per screen;
- use progressive disclosure;
- start with natural story, not filters;
- show "we understood" summaries;
- return 2-3 good options, not many profiles;
- explain reasoning in human language;
- make next action obvious.

## 12. Preferred UI Language

Use:
- "мы подобрали"
- "куратор посмотрит"
- "почему подходит"
- "что важно учесть"
- "короткий shortlist"
- "семья"
- "няня"
- "познакомиться"

Avoid:
- "AI-анализ"
- "алгоритм"
- "кандидат"
- "submit"
- "proceed"
- "пользователь"
- "клиент"

## 13. Implementation Goal

Do not rebuild the product from scratch.

Implement the new direction inside the existing codebase by changing:
- visual tokens;
- shared UI primitives;
- Home structure;
- parent intake flow;
- success screen;
- match results presentation;
- nanny onboarding copy and rhythm.

The goal is to make the existing production app feel like a calm trusted advisor instead of a landing page plus form plus catalog.

## 14. Acceptance Criteria

A user should understand in 5 seconds:

> "Blizko helps me get a small trusted shortlist of suitable nannies for my family."

The app should not feel like:
- a nanny catalog;
- a long form;
- an AI demo;
- a generic marketplace;
- a landing page pretending to be an app.

The parent should feel:

> "I was understood. My choice was narrowed safely. I know what happens next."

Functional acceptance:
- Home has one clear main CTA.
- Parent flow starts with freeform story.
- Parent flow includes structured summary before submit.
- Match results show max 2-3 curated nannies.
- Nanny cards explain why they fit the family.
- Trust signals appear before the CTA.
- Primary CTA uses Deep Petrol / trust color.
- Main UI copy does not sell AI.
- Mobile 390px works without sticky CTA overlap.
