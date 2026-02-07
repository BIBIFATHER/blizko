# DATA_MODEL.md

This document describes the main domain entities used in Blizko.
Source of truth: `src/core/types/types.ts`.

---

## Language

```ts
type Language = "ru" | "en";
```

Used for UI translations and AI prompts.

## Review

Represents feedback left after a booking.

Fields:
- `id: string` — unique identifier
- `authorName: string` — review author name
- `rating: number` — 1..5 stars
- `text: string` — review content
- `date: number` — unix timestamp (ms)
- `bookingId?: string` — optional link to Booking

## ParentRequest

Represents a parent's request for a nanny.

Fields:
- `id: string`
- `type: "parent"` — discriminant field
- `city: string`
- `childAge: string` — stored as free text (e.g. "2 years", "5 months")
- `schedule: string` — free text (e.g. "Mon-Fri 9-18")
- `budget: string` — free text (e.g. "5000/day", "100k/month")
- `requirements: string[]` — tags/requirements (e.g. `["medical book", "experience"]`)
- `comment: string` — extra notes from parent
- `createdAt: number` — unix timestamp (ms)

## SoftSkillsProfile

Represents AI-generated soft skills evaluation.

Fields:
- `rawScore: number` — 0..100
- `dominantStyle: "Empathetic" | "Structured" | "Balanced"`
- `summary: string` — AI-generated explanation
- `completedAt: number` — unix timestamp (ms)

Notes:
- This is AI output. It should be treated as advisory, not as a strict decision rule.

## DocumentVerification

Represents a verification record for an uploaded document.

Fields:
- `type: "passport" | "medical_book" | "police_record"`
- `status: "verified" | "rejected" | "pending"`
- `documentNumber?: string` — extracted by AI if possible
- `expiryDate?: string` — extracted by AI if possible
- `aiConfidence: number` — 0..100 confidence score
- `aiNotes: string` — human-readable explanation from AI
- `verifiedAt: number` — unix timestamp (ms)

Rules:
- `status` can be set by AI analysis, but final status may later be overridden by admin/human review.
- `aiConfidence` is used only for UI hints and internal logic (not a legal verification).

## NannyProfile

Represents a nanny profile.

Fields:
- `id: string`
- `type: "nanny"` — discriminant field
- `name: string`
- `photo?: string` — base64 or URL
- `city: string`
- `experience: string` — free text
- `childAges: string[]` — free text list (e.g. `["0-1", "1-3"]`)
- `skills: string[]` — list of skills/tags
- `about: string` — description
- `contact: string` — phone/telegram/etc
- `isVerified: boolean` — general trust flag (e.g. external verification / platform verified)
- `documents?: DocumentVerification[]` — uploaded documents analysis results
- `softSkills?: SoftSkillsProfile` — AI soft skill analysis
- `videoIntro?: boolean` — legacy flag
- `video?: string` — URL to video
- `reviews?: Review[]`
- `createdAt: number` — unix timestamp (ms)

Rules:
- `documents` is optional and may be empty.
- `isVerified` is a high-level trust indicator independent from documents.
- `photo` can be a base64 string. Avoid storing large base64 in state long-term.

## ViewState

UI state navigation enum.

```ts
type ViewState = "home" | "parent-form" | "nanny-form" | "success" | "admin";
```

## SubmissionResult

Output of matching logic.

Fields:
- `matchScore: number` — 0..100
- `recommendations: string[]` — AI-generated explanation / suggestions

## User

Represents current user (minimal auth model for now).

Fields:
- `email?: string`
- `phone?: string`
- `name?: string`
- `role?: "parent" | "nanny"`

## ChatMessage

Support chat message.

Fields:
- `id: string`
- `text: string`
- `sender: "user" | "agent"`
- `timestamp: number` — unix timestamp (ms)

## Booking

Represents a booking between a parent and a nanny.

Fields:
- `id: string`
- `nannyName: string`
- `date: string` — stored as text (may be improved later)
- `status: "active" | "completed" | "cancelled"`
- `amount: string` — stored as text
- `avatarColor?: string`
- `isPaid?: boolean`
- `hasReview?: boolean`

## General Notes

- Many fields are currently stored as free text. This is intentional for MVP speed.
- Future refactors may introduce structured fields (dates, currency, schedules).
- IDs are strings (UUID-like).
