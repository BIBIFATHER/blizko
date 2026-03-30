---
name: blizko-design-system
description: "Дизайн-система Blizko v2: Editorial Trust & Curated Calm. Используй при создании/модификации UI компонентов, стилей, анимаций. Trust-first, not premium-first. Шрифты: Newsreader + Manrope."
---

# Blizko Design System v2 — Editorial Trust & Curated Calm

## Философия

Blizko = «рядом». Trust-first with premium signals, not premium-first.
Ощущение: тёплый, курированный, безопасный, спокойный, обнадёживающий.
Премиальность через spacing, деталь, типографику и консистентность — не через глянец или статусность.

**НЕ luxury hotel. НЕ fashion brand. НЕ elite concierge.**
Это курированный, заслуживающий доверия сервис заботы о детях.

## Stitch Project

- **Project ID:** `11247695526138188471`
- **Preview:** https://stitch.withgoogle.com/project/11247695526138188471

## Цветовые токены

```css
:root {
  /* Surface hierarchy — "стопка бумаги" */
  --surface:                 #fcf9f4;  /* база / фон */
  --surface-container-low:   #f6f3ee;  /* секции контента */
  --surface-container:       #f0ede9;  /* вторичные поверхности */
  --surface-container-high:  #ebe8e3;  /* inputs unfocused */
  --surface-container-lowest:#ffffff;  /* карточки — чистый белый на кремовом */

  /* Text */
  --on-surface:          #1c1c19;  /* основной текст */
  --on-surface-variant:  #4d4635;  /* вторичный текст */
  --on-secondary-container: #66625e; /* muted текст */

  /* Brand — Curated Gold */
  --primary:             #735c00;  /* тёмное золото */
  --primary-container:   #d4af37;  /* мягкое золото CTA */
  --on-primary:          #ffffff;

  /* Trust & Status */
  --tertiary:            #006e1c;  /* верифицировано */
  --tertiary-container:  #65c865;  /* мягкий зелёный фон для бейджей */

  /* Secondary — Warm Stone */
  --secondary:           #625d5a;
  --secondary-container: #e6deda;

  /* Error */
  --error:               #ba1a1a;
  --error-container:     #ffdad6;

  /* Outline */
  --outline:             #7f7663;
  --outline-variant:     #d0c5af; /* используй на 15% opacity для ghost borders */
}
```

### Правило "No-Line"

**Запрещено** использовать 1px solid borders для разделения контента. Границы определяются только через смену фонового цвета или тональные переходы.

## Типографика

- **Display:** Newsreader (serif) — только для hero-заголовков, имён, section headings
- **UI:** Manrope — body, кнопки, labels, tabs, фильтры, inputs, метадата, дашборды
- **Logo:** Newsreader Italic

### Scale

| Role | Font | Size | Letter-spacing | When |
|------|------|------|----------------|------|
| **Display-LG** | Newsreader | 3.5rem | -0.02em | Hero moments |
| **Display-MD** | Newsreader | 2rem | -0.01em | Section headings |
| **Title-MD** | Manrope | 1.125rem | 0 | Card titles, nav |
| **Body** | Manrope | 1rem | 0 | Body text |
| **Label-SM** | Manrope | 0.6875rem | +0.05em, UPPERCASE | Metadata, badges |

### Line Heights

- Headings: 1.1–1.3
- Body: 1.5–1.7
- UI labels: 1.2–1.4

## Spacing (8pt grid)

```
4px  → gap-1   (icon-text)
8px  → gap-2   (внутри компонентов)
12px → gap-3   (между связанными)
16px → gap-4   (padding карточки)
24px → gap-6   (секции внутри карточки)
32px → gap-8   (между секциями)
44px → gap-11  (breathing room)
48px → gap-12  (между блоками)
56px → gap-14  (section breathing)
64px → gap-16  (hero spacing)
```

## Elevation & Depth — Тональная слоистость

Глубина через свет и тон, НЕ через тени.

- `surface-container-lowest` карточка на `surface-container-low` фоне = естественный lift
- **Ambient Shadow** (для модалок, FAB): `0px 20px 40px` blur, цвет `on-surface` на **4% opacity**
- **Ghost Border** (для accessibility): `outline-variant` на **15% opacity**
- Никогда: drop-shadow, жёсткие границы

## Компоненты

### Button

| Variant | Стиль | Когда |
|---------|-------|-------|
| **primary** | Pill (`rounded-full`), `primary` → `primary-container` gradient, white text | Главное действие (1 на экран) |
| **secondary** | Pill, `secondary-container` bg, dark text | Вторичное |
| **tertiary** | Без фона, underline, Manrope | Ссылки, отмена |

### Card

- `rounded-lg` (2rem) — мягкий, дружелюбный
- `surface-container-lowest` (white) на `surface` (cream) фоне
- **Без borders** — тональный контраст вместо линий
- Vertical white space (2.75rem) между блоками

### Input

- Soft-filled: `surface-container-high` bg, без border
- Focus: `surface-container-highest` bg + 2px `primary` bottom-bar
- **Без outline** в default state

### Trust Badge

```html
<span class="trust-badge">✓ Проверена</span>
```
- `tertiary-container` фон (#65c865), `on-tertiary-container` текст
- **Всегда pill** (`rounded-full`)
- Уменьшает "alert" harshness с мягким зелёным

### Curator's Note (фирменный)

Карточка для рекомендаций платформы:
- Асимметричный padding (больше top/bottom)
- Newsreader Italic типографика
- `surface-tint` фон на 5% opacity

## Анимации

- **Принцип:** Медленные и «весомые» — как переворачивание тяжёлой страницы
- **Transitions:** 300ms ease-out
- **Никогда:** bounce, spring, aggressive easing
- **`prefers-reduced-motion`:** обязательно

## Do's & Don'ts

### ✅ Do
- Embrace whitespace — если экран кажется «пустым», вероятно всё правильно
- Layer tones — `surface` → `surface-container` для направления взгляда
- Human imagery — тёплое, candid, не stock
- Single CTA per screen

### ❌ Don't
- 1px dividers — visual noise, ломает editorial flow
- Pure black — всегда `on-surface` (#1c1c19)
- Sharp corners — ничего острее `rounded-sm` (0.5rem)
- Over-animate — transitions slow and weighted
- Luxury/concierge aesthetics — мы про доверие, не про статус
- «Кандидат», «клиент», «пользователь» — используй «няня», «семья», «родитель»

## Product Structure

### Для семей
Home → Search → Match Results → Nanny Profile → Favorites → Booking → Messages → Dashboard → Settings

### Для нянь
Landing → Onboarding → Profile Editor → Availability → Requests → Messages → Dashboard → Settings

### Shared
Auth → Success States → Empty States → Error States → Notifications → Support
