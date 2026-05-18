# DESIGN OVERRIDE MAP

## Context
Redesign involves migrating to the "Cloud System" and "Trust-First" architecture to remove generic marketplace UI and replace it with a highly curated, maternal, safe look.

## Core Principles
- **Previous System Principles**: Generic React UI components, sharp corners, harsh borders, primary contrasting buttons.
- **New System Principles (Cloud Design)**: Trust-First, curated editorial calm. Banned `1px solid black` line dividers, heavy focal shadows. Uses ghost borders, soft spacing, and fluid typography.

## Mapping

| Screen / Element | Old Design | New Cloud Design | Visual Risk | Trust Risk |
| --- | --- | --- | --- | --- |
| **Primary Buttons** | Boxy, solid colors (`bg-blue-600`) | Honey gradient (`var(--cloud-honey)`), `rounded-full` (`Pill`) | Contrast loss if tokens load late | Low |
| **Card Layouts** | `1px solid var(--border)` divisions | Soft tone separations, `rounded-2xl` (`1.5rem`), `surface-container-lowest` on cream | Content merging | High (sharp corners ruin warmth intent) |
| **Typography** | Default Sans | Hero/Names in `Newsreader` (serif), Body/Actions in `Manrope` (sans) | Font loading flash (FOUT) | High (wrong font breaks premium editorial feel) |
| **Trust Badges** | Native green/red alerts | Soft pills `bg-[#65c865]` `text-[#006e1c]` | Legibility | High (bright red/green induce anxiety instead of calm) |

## Migration Notes
- **Forms**: Must remove standard inset outlines. Use `input-glass` classes.
- **Modals**: Background overlays must use soft `backdrop-blur` instead of pure dark opacity. シート (Sheet) modals must use `2rem` top rounding.
- **Skeletons**: Remove generic loading spinners; replace with slow pulsing opacity on placeholders.
