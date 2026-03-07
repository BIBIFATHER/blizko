# Blizko — Figma Design Handoff

## Design System: Cloud Design System

### Palette

| Token | Hex | Use |
|---|---|---|
| `cloud-bg` | `#F9F6F1` | Основной фон |
| `cloud-surface` | `rgba(255,255,255,0.85)` | Карточки, модалки |
| `cloud-honey-solid` | `#E8D5A3` | Primary CTA color |
| `cloud-honey gradient` | `135deg, #E8D5A3 → #F2E6C5` | CTA gradient |
| `cloud-text` | `#44403C` | stone-800, основной текст |
| `cloud-text-muted` | `#A8A29E` | stone-400, вторичный текст |
| `cloud-brand` | `#5D4E37` | Логотип, акценты |
| `cloud-border` | `rgba(245,245,244,0.8)` | Границы карточек |

### Trust & Status Colors

| Token | Hex | Use |
|---|---|---|
| `trust-green` | `#16a34a` | Verified, success |
| `trust-green-bg` | `rgba(22,163,74,0.1)` | Фон badges |
| `trust-blue` | `#0891b2` | Safety, info |
| `warning` | `#ca8a04` | Pending, attention |
| `error` | `#dc2626` | Rejected, danger |
| `info` | `#6366f1` | Info badges |

### Typography

| Level | Font | Weight | Size (desktop) |
|---|---|---|---|
| **H1** | Playfair Display | 700 | 2.5rem (40px) |
| **H2** | Quicksand | 700 | 2rem (32px) |
| **H3** | Nunito | 700 | 1.5rem (24px) |
| **Body** | Inter | 400 | 1rem (16px) |
| **Body semibold** | Inter | 600 | 1rem (16px) |
| **Small** | Inter | 400 | 0.875rem (14px) |
| **Caption** | Inter | 400 | 0.75rem (12px) |

**Google Fonts:** Playfair Display 600,700 • Inter 400,500,600 • Nunito 600,700,800 • Quicksand 600,700

### Spacing Scale

| Token | Value |
|---|---|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 48px |

### Border Radius

| Token | Value | Use |
|---|---|---|
| `card` | 24px | Cards, modals |
| `btn` | 9999px (pill) | Buttons |
| `input` | 16px | Input fields |
| `badge` | 9999px (pill) | Badges, tags |

### Shadows

| Token | Value | Use |
|---|---|---|
| `shadow` | `0 8px 32px rgba(120,113,108,0.06)` | Default cards |
| `shadow-soft` | `0 4px 20px rgba(…,0.04)` | Subtle |
| `shadow-hover` | `0 12px 40px rgba(…,0.1)` | Hover state |
| `shadow-elevated` | `0 20px 60px rgba(…,0.12)` | Modals, overlays |

### Easing

| Token | Value | Use |
|---|---|---|
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Стандарт |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bounce CTA |

---

## Components

### Button

| Variant | Background | Text | Radius | Height |
|---|---|---|---|---|
| **Primary** | honey gradient | `#5D4E37` | pill | 48px |
| **Secondary** | `#F5F5F4` | stone-600 | pill | 40px |
| **Outline** | transparent | stone-600 | pill | 40px |
| **Danger** | `rgba(220,38,38,0.1)` | `#dc2626` | pill | 40px |

**Micro-animations:**

- Hover: scale 1.02, shadow-hover
- Active: scale 0.98
- CTA pulse: `pulse-honey` animation (amber glow)

### Card

- Background: `rgba(255,255,255,0.85)`
- Backdrop: `blur(10px)`
- Border: `1px solid rgba(245,245,244,0.8)`
- Radius: 24px
- Shadow: `shadow`
- Hover: `shadow-hover` + translateY(-2px)

### Badge

| Variant | BG | Text |
|---|---|---|
| `success` | green-50 | green-700 |
| `warning` | amber-50 | amber-700 |
| `danger` | red-50 | red-600 |
| `info` | indigo-50 | indigo-700 |
| `trust` | cyan-50 | cyan-700 |

### ProgressBar

- Track: stone-200, h=8px, radius=9999px
- Fill: honey gradient
- Animation: 300ms ease-out

### Input

- Background: `rgba(255,255,255,0.8)`
- Border: `1px solid stone-200`
- Radius: 16px
- Padding: 12px 16px
- Focus ring: `2px amber-300`

---

## Screens (12)

### 1. Landing / Home

- Hero: H1 (Playfair) + subtitle (Inter)
- 3-step flow: icons + text (Запрос → AI → Подбор)
- Social proof slot
- CTA pill: `btn-honey-pulse`
- Blob background (animated CSS blobs)

### 2. Parent Form (4 steps)

- Progress bar with goal-gradient acceleration
- Step cards with glassmorphism
- Empathetic micro-copy
- «Шаг X из 4»

### 3. Nanny Form

- Same layout as parent, 5 steps
- Document upload section
- Video intro placeholder

### 4. Match Results

- 2-3 candidate cards
- Trust badges: ✓ Документы ✓ Модерация ✓ Soft skills
- AI explanation block (peak moment)
- CTA: «Написать»

### 5. Chat (NannyChatModal)

- Full-screen modal
- Message bubbles: parent=amber-50, nanny=white
- «Забронировать» button in header

### 6. Success Screen

- Celebration animation
- Timeline: «что дальше»
- Reciprocity messaging

### 7. Profile Tab

- Avatar + user info
- Request/profile card
- Referral widget (amber gradient)
- Support + Logout buttons

### 8. Admin Panel (4 tabs)

- Overview: stats cards
- Parents: list + filters
- Nannies: list + approve/reject
- Bookings: stats + status management

### 9. SEO: How We Verify

- 5 verification steps (icon + title + description)
- CTA at bottom

### 10. SEO: Humanity+

- 5 compatibility factors
- «Как это работает» block
- CTA at bottom

### 11. Auth Modal

- Phone input + OTP verification
- Tabbed: login/register

### 12. Booking Flow

- Date selection
- Amount display with anchoring
- Loss aversion copy

---

## Grid & Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 640px | Single column, 16px padding |
| Tablet | 640-1024px | Max-width 640px centered |
| Desktop | > 1024px | Max-width 1024px centered |

---

## Figma Setup Tips

1. **Create Variables**: Map all tokens to Figma Variables (color, spacing, radius)
2. **Auto Layout**: Use for all components (8px gap default)
3. **Components**: Create master components for Button, Card, Badge, Input, ProgressBar
4. **Pages**: 1 page per screen (12 pages)
5. **Frames**: iPhone 15 Pro (393×852) for mobile, 1440×900 for desktop
