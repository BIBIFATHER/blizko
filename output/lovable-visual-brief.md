# Blizko Lovable Brief

## Purpose

Use this prompt in Lovable to generate a mobile-first redesign direction for Blizko.

Do not change the product logic.
Do not redesign the business model.
Do not turn it into a generic marketplace or a playful parenting app.

## Curated References

Use these references as pattern inspiration, not for direct copying.

Core references:
- [Doctor Profile Mobile App Ui](https://dribbble.com/shots/26128326-Doctor-Profile-Mobile-App-Ui)
  Take: trust-first profile structure, strong header/meta/reviews/action stack
- [Telemedicine Mobile App UI](https://dribbble.com/shots/26827412-Telemedicine-Mobile-App-UI)
  Take: reassurance, support visibility, clean trust hierarchy
- [Telemedicine Mobile App Design: iOS Android UI UX](https://dribbble.com/shots/19567339-Telemedicine-Mobile-App-iOS-Android-UI)
  Take: information grouping, profile-to-action clarity
- [Caregiver Mobile Application - UI Design](https://dribbble.com/shots/24109210-Caregiver-Mobile-Application-UI-Design)
  Take: human warmth with service seriousness
- [Property App: Comparison Flow](https://dribbble.com/shots/27021440-Property-App-Comparison-Flow)
  Take: shortlist / compare / match logic, decision support framing
- [Real Estate Mobile App UI Design](https://dribbble.com/shots/26924928-Real-Estate-Mobile-App-UI-Design)
  Take: calm premium shortlist rhythm, feed density, elegant filtering

Support references:
- [MediCall - Telemedicine Mobile App | UI/UX](https://dribbble.com/shots/25691641-MediCall-Telemedicine-Mobile-App-UI-UX)
  Take: support/chat framing, secure coordination feel
- [Parenting App UI UX](https://dribbble.com/shots/26540669-Parenting-app-design-mobile-app)
  Take: warmth and soft emotional tone only

Anti-references:
- [Parenting App Animation](https://dribbble.com/shots/26556110-Parenting-app-animation)
- [Parenting App Concept](https://dribbble.com/shots/17050540-Parenting-App-Concept)

Do not take from anti-references:
- childishness
- illustration-first storytelling
- dribbblized concept polish without product depth

## Prompt

```text
Design a mobile-first product experience for Blizko, a trust-first nanny matching service.

Important:
- do not change the core product logic
- do not invent a new business model
- do not turn this into a generic freelancer marketplace
- do not make it look like a cute parenting app
- do not make it look like a cold medical app

Blizko is not just a catalog of nannies.
It sells:
- trust
- safety
- predictability
- explainability
- peace of mind for families

North Star:
Blizko should feel like a trust-first premium family marketplace with healthcare-grade reassurance, calm decision architecture, and human warmth without childishness.

Product roles:
- family
- nanny

Key screens:
1. detailed nanny profile
2. shortlist / compare / match
3. parent dashboard

Optional:
4. onboarding / welcome

Visual direction:
- calm premium
- warm neutral base
- soft layered surfaces
- strong trust hierarchy
- clear CTA structure
- editorial restraint
- human but serious

Color direction:
- ivory
- warm stone
- paper beige
- muted teal
- calm blue
- olive green accents
- soft amber for warnings

Typography direction:
- restrained editorial serif for high-trust headings
- clean modern sans for body and controls

UI principles:
- trust must be visible, not implied
- calmness must come from structure, not softness alone
- every screen should reduce ambiguity
- profile depth matters more than feed decoration
- warmth is allowed, infantilization is not

Design patterns to include:
- strong profile trust summary above the fold
- layered verification markers
- visible review and credibility signals
- explicit “why this nanny fits” explanation
- shortlist as a first-class object
- compare flow that helps decision-making
- clear next-step actions
- support visibility before the user gets stuck

Design patterns to avoid:
- bright startup gradients
- candy pastels
- childish family illustrations
- glassmorphism for effect
- dark cyber UI
- fintech severity
- giant fake trust badges like “100% safe”
- noisy marketplace cards

Reference pattern sources:
- telemedicine apps
- doctor profile apps
- caregiver apps
- premium service marketplace apps
- property comparison flows

Use these reference types conceptually:
- doctor profile structure for nanny profile
- telemedicine trust and support framing
- caregiver warmth and seriousness
- real estate comparison logic for shortlist / compare
- premium parent dashboard rhythm

Create 3 polished mobile screens:
1. detailed nanny profile
2. shortlist / compare / match
3. parent dashboard

For each screen, make sure:
- trust is visible early
- the layout feels calm and premium
- the user understands what to do next
- the product feels explainable and safe

Output expectations:
- one cohesive design direction
- reusable component language
- strong card system
- clear badge / trust system
- obvious CTA hierarchy
- visual consistency across all screens
```

## Best Use

Use this prompt first in Lovable to generate a direction.

Then:
- choose the strongest direction
- extract the visual system
- bring that direction back into the repo using [wave-3a-nanny-profile-brief.md](/Users/anton/Desktop/blizko%203/output/wave-3a-nanny-profile-brief.md#L1)

## Recommended First Screen In Repo

After Lovable exploration, implement the chosen direction first on:
- [NannyPublicProfile.tsx](/Users/anton/Desktop/blizko%203/src/components/nanny/NannyPublicProfile.tsx#L1)

This should become the reference screen for the rest of the redesign.
