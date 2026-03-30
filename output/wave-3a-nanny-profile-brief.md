# Wave 3a Brief: Nanny Public Profile

## Purpose

This is the first reference screen for the redesign system in the real repo.

Target file:
- [NannyPublicProfile.tsx](/Users/anton/Desktop/blizko%203/src/components/nanny/NannyPublicProfile.tsx#L1)

Why this screen first:
- it is the strongest trust surface in the product
- it can establish the new design language for cards, badges, states, hierarchy, and CTA behavior
- it is a better system anchor than starting from a generic feed

## Product Goal

Turn profile interest into confidence.

The screen must answer:
- can I trust this nanny?
- why is this profile credible?
- what should I do next?

## UX Goal

The profile should feel like a confidence architecture, not a long form dump.

It should:
- reduce anxiety
- make trust legible
- explain fit signals
- preserve user control
- give one obvious next step

## Current Strengths

The existing screen already has:
- hero card
- reviews
- trust badges
- about and skills
- loading and not-found states
- SEO structure

Keep:
- existing backend contract
- existing data sources
- route structure
- SEO support

## Problems To Solve

- trust summary is present, but not systematized enough
- hierarchy is still component-first, not decision-first
- profile lacks a strong explicit `why this nanny fits` block
- CTA framing can be calmer and clearer
- trust evidence should be layered and more factual
- states can be upgraded to match new foundation

## Redesign Principles

1. Put trust above the fold.
2. Make profile sections decision-oriented.
3. Show evidence, not slogans.
4. Preserve warmth without losing seriousness.
5. Keep one primary action and one safe secondary path.

## Required Blocks

Above the fold:
- profile hero
- rating / reviews signal
- location / experience / availability summary
- trust summary strip
- primary CTA
- secondary CTA

Trust section:
- verified identity / moderation
- reviewed documents if available
- response reliability or freshness indicator if data exists
- social proof and reviews

Explainability section:
- `Почему эта няня может подойти`
- derived from existing signals, soft skills, child ages, skills, and moderation summaries

Experience section:
- about
- skills
- child age coverage
- work style / soft skills summary

Reviews section:
- concise and high-signal
- not a noisy wall

Support / next steps:
- ask question
- return to shortlist if relevant
- safe explanation of what happens next

## Visual Direction

Use:
- warm ivory / stone base
- muted teal / olive / calm blue trust accents
- editorial trust heading treatment
- clean sans body copy
- soft layered cards
- generous spacing

Avoid:
- bright marketplace energy
- harsh dark contrast
- decorative glass effects
- oversized luxury imagery
- childish warmth

## State Requirements

Loading:
- calm skeletons using shared primitives
- profile-like structure, not random placeholders

Not found:
- reassuring tone
- clear recovery path

Error:
- calm explanation
- one next step

## Data and Logic Constraints

Do not:
- change backend contracts
- invent data fields
- remove SEO metadata
- break route behavior
- remove mock-profile dev path

May do:
- reorganize layout
- create new shared profile/trust subcomponents
- improve state design
- improve CTA hierarchy
- improve copy framing using existing data

## Candidate Shared Components To Extract

Possible reusable pieces from this screen:
- `ProfileHeroCard`
- `TrustSummaryStrip`
- `TrustEvidenceList`
- `WhyFitCard`
- `ReviewSummaryCard`
- `ProfileMetaRow`

Only extract if reuse is likely in:
- match results
- nanny cards
- dashboards

## Reference Mapping

Primary references:
- [Doctor Profile Mobile App Ui](https://dribbble.com/shots/26128326-Doctor-Profile-Mobile-App-Ui)
- [Telemedicine Mobile App UI](https://dribbble.com/shots/26827412-Telemedicine-Mobile-App-UI)
- [Caregiver Mobile Application - UI Design](https://dribbble.com/shots/24109210-Caregiver-Mobile-Application-UI-Design)

Secondary:
- [Parenting App UI UX](https://dribbble.com/shots/26540669-Parenting-app-design-mobile-app)

## Implementation Prompt For Codex

```text
Implement Wave 3a for Blizko by redesigning the public nanny profile screen in the real repo.

Target:
src/components/nanny/NannyPublicProfile.tsx

Goals:
- make the profile feel like a trust-first premium family marketplace screen
- improve trust, calmness, clarity, and next-step confidence
- preserve backend contracts and route behavior

Use these principles:
1. Put trust summary above the fold
2. Add an explicit “why this nanny fits” block using existing profile signals
3. Reorganize sections around decision-making, not raw content dumping
4. Keep one primary CTA and one safe secondary CTA
5. Make loading / not-found / error states calmer and clearer

Visual direction:
- warm neutral palette
- calm premium surfaces
- editorial trust accents
- no childishness
- no startup gradients
- no clinical coldness

Use pattern inspiration from:
- doctor profile apps
- telemedicine trust layouts
- caregiver profile flows

Constraints:
- do not invent fake fields
- do not change backend contracts
- do not remove SEO logic
- keep mock profile flow working

Prefer reusable subcomponents if they are likely to be reused later in match results or related trust surfaces.

After implementation:
- run build
- run targeted lint if needed
- summarize what shared patterns were established for later screens
```

## Exit Criteria

Wave 3a is successful if:
- the profile clearly feels more trustworthy and more structured
- trust is visible above the fold
- next step is obvious
- explainability is explicit
- loading and not-found states match the new system
- build passes
- the screen establishes reusable patterns for later rollout
