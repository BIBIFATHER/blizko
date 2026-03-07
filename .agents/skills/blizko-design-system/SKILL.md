---
name: blizko-design-system
description: "Дизайн-система Blizko: Cloud Design System. Используй при создании/модификации UI компонентов, стилей, анимаций. Включает токены, компоненты, психологические паттерны визуального дизайна."
---

# Blizko Design System — Cloud Concept

## Философия

Blizko = «рядом». Визуальная метафора: **облако** — мягкое, тёплое, защищённое.
Палитра: тёплые нейтральные + honey accents. Ощущение: premium, уютно, безопасно.

## Цветовые токены

```css
:root {
  /* Основа */
  --cloud-bg: #F9F6F1;              /* milk — фон приложения */
  --cloud-surface: rgba(255,255,255,0.85); /* карточки, glassmorphism */
  --cloud-text: #44403C;            /* основной текст */
  --cloud-text-muted: #A8A29E;      /* вторичный текст */
  --cloud-brand: #5D4E37;           /* бренд, логотип */

  /* Accent — Honey */
  --cloud-honey: linear-gradient(135deg, #E8D5A3, #F2E6C5);
  --cloud-honey-solid: #E8D5A3;

  /* Trust & Status */
  --cloud-trust-green: #16a34a;     /* верифицировано */
  --cloud-trust-blue: #0891b2;      /* безопасность */
  --cloud-warning: #ca8a04;         /* внимание */
  --cloud-error: #dc2626;           /* ошибка */

  /* Shadows */
  --cloud-shadow: 0 8px 32px rgba(120,113,108,0.06);
  --cloud-shadow-hover: 0 12px 40px rgba(120,113,108,0.1);

  /* Radii */
  --cloud-radius-card: 24px;
  --cloud-radius-btn: 9999px;       /* pill buttons */
  --cloud-radius-input: 16px;
}
```

## Типографика

- **Font:** Inter (body) + Quicksand (логотип)
- **Scale (fluid):**

```css
--text-xs:   clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
--text-sm:   clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
--text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
--text-lg:   clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
--text-xl:   clamp(1.25rem, 1rem + 1.25vw, 1.5rem);
--text-2xl:  clamp(1.5rem, 1.25rem + 1.25vw, 2rem);
--text-3xl:  clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem);
```

- **Line heights:** headings 1.2, body 1.6, UI labels 1.3
- **Weights:** 400 (body), 500 (labels), 600 (buttons), 700 (headings)

## Spacing (8pt grid)

```
4px  → gap-1   (icon-text)
8px  → gap-2   (внутри компонентов)
12px → gap-3   (между связанными элементами)
16px → gap-4   (padding карточки, gap между полями)
24px → gap-6   (секции внутри карточки)
32px → gap-8   (между секциями)
48px → gap-12  (между блоками страницы)
```

## Компоненты

### Button

| Variant | Стиль | Когда |
|---------|-------|-------|
| **primary** | `btn-honey` gradient, pill, shadow | Главное действие (1 на экран) |
| **secondary** | transparent + border, pill | Вторичное действие |
| **ghost** | text only, no border | Третичное (ссылки, отмена) |
| **danger** | red accent | Деструктивное (удалить, отменить) |

```css
.btn-honey {
  background: var(--cloud-honey);
  color: var(--cloud-brand);
  font-weight: 600;
  border-radius: var(--cloud-radius-btn);
  box-shadow: 0 8px 24px rgba(232,213,163,0.35);
  transition: all 0.2s ease;
}
.btn-honey:hover { filter: brightness(1.03); transform: translateY(-1px); }
.btn-honey:active { transform: scale(0.98); }
```

### Card

```css
.card-cloud {
  background: var(--cloud-surface);
  backdrop-filter: blur(12px);
  border-radius: var(--cloud-radius-card);
  box-shadow: var(--cloud-shadow);
  transition: box-shadow 0.3s ease, transform 0.2s ease;
}
.card-cloud:hover {
  box-shadow: var(--cloud-shadow-hover);
  transform: translateY(-2px);
}
```

### Input (Glass)

```css
.input-glass {
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(12px);
  border: none;
  border-radius: var(--cloud-radius-input);
  box-shadow: inset 0 2px 6px rgba(120,113,108,0.08);
}
.input-glass:focus {
  background: rgba(255,255,255,0.9);
  box-shadow: inset 0 2px 6px rgba(120,113,108,0.04),
              0 0 0 4px rgba(232,213,163,0.35);
}
```

### Trust Badge

```html
<span class="trust-badge">✓ Документы проверены</span>
```

```css
.trust-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: var(--text-xs);
  font-weight: 500;
  background: rgba(22,163,74,0.1);
  color: var(--cloud-trust-green);
}
```

### Progress Bar (Goal-Gradient)

```css
.progress-bar {
  height: 6px;
  border-radius: 9999px;
  background: rgba(0,0,0,0.06);
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  border-radius: 9999px;
  background: var(--cloud-honey);
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
```

## Анимации

| Анимация | Длительность | Easing | Когда |
|----------|-------------|--------|-------|
| Hover lift | 200ms | ease-out | Карточки, кнопки |
| Focus glow | 300ms | ease | Input focus |
| Fade up | 500ms | cubic-bezier(0.16,1,0.3,1) | Появление карточек |
| Slide in | 350ms | cubic-bezier(0.16,1,0.3,1) | Шаги формы |
| Scale tap | 100ms | spring | Нажатие кнопки |
| Pulse CTA | 2s infinite | ease-in-out | Готовая к отправке кнопка |

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Психология в дизайне

| Элемент | Паттерн | Реализация |
|---------|---------|------------|
| Прогресс-бар | Goal-Gradient | Ускоряется к концу (bar шире на последних шагах) |
| Один CTA | Hick's Law | Primary button всегда один, остальные ghost/secondary |
| Trust badges | Authority Bias | Зелёный check + текст верификации рядом с действием |
| Пустое состояние | Activation Energy | Один CTA + мотивирующий текст |
| Карточки нянь | Paradox of Choice | Максимум 2–3 карточки, не больше |
| Success screen | Peak-End Rule | Яркая анимация, celebration, timeline |

## Cloud Background (Signature)

Фирменный фон — 3 плавающих блоба:

```
Peach:    #FFD090 → top-right
Mint:     #ADF0D1 → center-left  
Lavender: #C5B9F0 → bottom-right
```

Blur: 60px, opacity: 0.7, animation: 20s float.

## Правила

1. **Один primary CTA** на экран — всегда
2. **Glassmorphism** для карточек и инпутов — фирменный стиль
3. **Pill buttons** (border-radius: 9999px) — везде
4. **8pt grid** — никаких произвольных значений spacing
5. **Fluid typography** — `clamp()` вместо фиксированных размеров
6. **Mobile-first** — base стили для mobile, расширение через `sm:`/`md:`
7. **Trust-first** — trust badge рядом с каждым ключевым действием
8. **Тёплые тени** — stone-based shadows, не чёрные
