# BLIZKO_UI_CODEX.md

Blizko UI codex for Lovable, Figma, and implementation work.

## Purpose

This file defines the visual and verbal system that separates Blizko from generic AI-generated UI.

Blizko should feel:

- calm
- curated
- human
- trustworthy
- editorial

Not:

- flashy
- glossy
- startup-generic
- luxury concierge
- wellness-app pastel fog

## Brand Position

Blizko is not a status product. It is a trust product.

The emotional promise is not "premium access".
The emotional promise is "спокойствие, ясность и человеческая забота".

Internal shorthand:

- page = paper
- card = sheet
- background = table
- CTA = gentle confidence, not pressure

## Core Principles

1. Trust-first, not premium-first.
2. One screen = one emotional accent.
3. If an element does not improve trust, clarity, or rhythm, remove it.
4. Tone replaces borders.
5. Typography carries brand more than decoration.
6. The product should feel like one editorial system, not a set of separate mockups.

## Visual Language

### Overall Mood

- soft daylight
- tactile paper layers
- quiet confidence
- careful spacing
- restrained warmth

### Explicitly Avoid

- heavy blur everywhere
- glassmorphism noise
- bright startup gradients
- hard 1px dividers as layout structure
- oversaturated coral or gold
- overly rounded toy-like UI
- purple SaaS aesthetics

## Typography

### Fonts

- Display and section headings: `Newsreader`
- UI, forms, labels, tabs, buttons, body: `Manrope`

### Roles

- Display XL: `56/60`, `Newsreader`, `-0.02em`
- Display L: `44/48`, `Newsreader`, `-0.02em`
- Display M: `32/36`, `Newsreader`, `-0.01em`
- Title: `20/28`, `Manrope`, `600`
- Body: `16/26`, `Manrope`, `500`
- Body Small: `14/22`, `Manrope`, `500`
- Label: `11/14`, `Manrope`, `700`, `0.06em`, uppercase

### Rules

- Headings must feel compact and confident, never airy and weak.
- Display text should use tight tracking.
- Secondary text must stay readable; never wash it out into beige.
- Labels should look system-level and consistent across all screens.

## Color System

```css
:root {
  --bg-page: #fcf9f4;
  --bg-section: #f6f2eb;
  --bg-card: #fffdfa;
  --bg-card-muted: #f3eee7;
  --bg-input: #f1ece5;
  --bg-input-focus: #f7f3ed;

  --text-primary: #1c1c19;
  --text-secondary: #4d4635;
  --text-muted: #7b7466;
  --text-disabled: #a39b8c;
  --text-on-accent: #fffaf7;

  --accent-primary: #d98263;
  --accent-primary-hover: #cb7657;
  --accent-primary-soft: #f3d8cd;
  --accent-gold: #b69246;
  --accent-gold-soft: #efe3bf;

  --trust-green: #6f9a67;
  --trust-green-soft: #e6efe2;
  --trust-blue: #6e88a8;
  --trust-blue-soft: #e8eef6;
  --trust-peach-soft: #f6e7df;

  --line-soft: rgba(127, 118, 99, 0.16);
  --line-strong: rgba(127, 118, 99, 0.28);
}
```

### Color Rules

- Cards should read as near-white paper on a warm page background.
- Secondary text should feel warm and legible, never faded.
- Coral should feel curated, not promotional.
- Gold should be a quiet guidance color, not jewelry.
- Trust colors must be softened and desaturated.

## Radius

- Inputs and small buttons: `16px`
- Medium surfaces: `22px`
- Main cards: `24px` to `28px`
- Large grouped surfaces and hero containers: `32px`
- Chips and pills: `999px`

### Radius Rule

Do not use tiny utility radii for brand-defining surfaces.
Blizko should feel soft and composed, not enterprise-sharp.

## Spacing

Use 8pt rhythm:

- `4`
- `8`
- `12`
- `16`
- `24`
- `32`
- `40`
- `48`
- `56`
- `64`

### Practical Defaults

- Mobile page padding: `20`
- Card padding: `24`
- Tight card padding: `20`
- Form field gap: `16`
- Internal block gap: `32`
- Section gap: `48`

### Spacing Rule

If a screen feels slightly emptier than usual, that is often correct.
Do not rush to fill silence.

## Depth and Surfaces

### Mental Model

- background = table
- card = paper sheet
- grouped panel = stack of paper

### Rules

- Prefer tonal separation over borders.
- Prefer light-on-light layering over shadow-heavy depth.
- Use shadows only for floating elements, sticky bars, and modal moments.
- Hard borders should not be the main structure of the page.

## Components

### Header

- height: `72px`
- background: warm translucent cream
- subtle blur only if needed
- separation from page via tone, not a hard line
- active nav item should be visibly intentional, not just slightly bolder

### Primary CTA

- height: `52px`
- radius: pill
- background: `--accent-primary`
- text: `16/20`, `600`
- state change on hover should darken slightly, not glow

### Secondary Button

- quiet neutral surface
- dark readable text
- no loud outline treatment

### Card

- near-white fill
- large soft radius
- no hard visible border by default
- optional ghost border only where accessibility needs stronger separation

### Inputs

- filled, soft, tactile
- no default border
- more internal padding than generic SaaS forms
- focus should feel precise and calm

### Chips

- inactive chips must remain readable
- active state should communicate semantic selection, not just "a random accent color"

### Stepper

- visually thinner than the average pill-tab component
- active segment should feel deliberate and calm
- inactive steps must recede without disappearing

### Sticky Bottom CTA

- should feel anchored to the screen, not pasted on top of content
- use a soft background veil or tonal fade above it

## Content Page Rules

### About

- max text width should be editorial, not stretched
- begin with a strong typographic opening
- include one brand-specific supporting block such as a curator note or trust statement

### How We Verify

- verification stages should not look identical
- use subtle tonal families to differentiate document review, video, psychology, and moderation
- add rhythm inside each card: icon, title, explanation, optional trust cue

## Wizard Rules

For `find-nanny` and `become-nanny`:

- one clear CTA per screen
- one emotional support line under each main heading
- grouped inputs should feel like one coherent sheet
- avoid long dull placeholders
- keep labels systematic and quiet

## Microcopy Rules

### Tone

- calm
- warm
- factual
- reassuring

### Do

- speak in plain Russian
- lead with clarity
- reduce anxiety
- explain what happens next

### Do Not

- use empty marketing adjectives
- say "инновационный"
- say "уникальный"
- say "лучший"
- sound corporate or procedural
- use cold nouns like "пользователь" or "кандидат" when "семья" or "няня" works

### Good Pattern

- heading = invitation
- subline = emotional reassurance
- field text = example, not command

## Brand Pattern To Repeat

Introduce one stable brand device across the product:

### Curator Note

- small label such as `Почему это важно`
- short calming message
- serif or italic flavor allowed sparingly
- soft tinted background

This pattern should repeat across:

- about
- how-we-verify
- onboarding
- profile moments

## Prompting Rules For AI Tools

When prompting Lovable, Figma, or other generators:

1. Do not ask for "make it beautiful".
2. Specify typography, tone, surfaces, and spacing.
3. Separate work into iterations:
   - typography and color
   - structure and layering
   - page character and brand motifs
4. Review against this codex after each pass.

## Review Checklist

Use this before approving any new screen:

- Does this feel like trust, not generic premium?
- Are headings clearly editorial?
- Is secondary text readable enough?
- Are surfaces paper-like rather than foggy?
- Is there only one main emotional accent?
- Does the header belong to the same system as the body?
- Would this still feel branded if the logo were removed?

If the answer to the last question is no, the screen is not finished.
