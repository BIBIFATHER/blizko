# AGENT_SKILL_MAP.md

Явная карта для Antigravity: какую роль запускать и какие skills подтягивать под тип задачи.

## Как использовать

Перед началом нетривиальной задачи:

1. Определи `task class`
2. Выбери `lead agent`
3. Подключи `support agents`
4. Для каждого агента подтяни указанные `skills`

Не импровизируй без причины, если задача уже попадает в одну из схем ниже.

---

## 1. Product Feature

**Когда:**
- новая фича
- новый flow
- onboarding / matching / profile / booking logic

**Lead agent:**
- `product-lead`

**Support agents:**
- `tech-arch`
- `frontend-vibe-engineer`
- `qa-release`

**Skills:**
- `track-management`
- `strategy-advisor`
- `react-dev`
- `frontend-patterns`
- `coding-standards`
- `webapp-testing`

**Если UI важен:**
- добавить `joe`
- добавить skills:
  - `blizko-design-system`
  - `responsive-design`
  - `blizko-ux-writing`

---

## 2. UI / Design Feature

**Когда:**
- новый экран
- redesign
- onboarding step
- visual polish
- mobile UX fix

**Lead agent:**
- `joe`

**Support agents:**
- `frontend-vibe-engineer`
- `product-lead`
- `qa-release`

**Skills:**
- `blizko-design-system`
- `frontend-design`
- `responsive-design`
- `blizko-ux-writing`
- `accessibility-compliance`
- `react-dev`

**Special rule for onboarding/forms:**
- `joe` is mandatory
- `product-lead` owns KPI and scope
- `joe` owns UX hierarchy and copy direction
- `frontend-vibe-engineer` owns implementation
- `qa-release` validates conversion-critical states

---

## 3. Backend / Data / Supabase

**Когда:**
- schema changes
- RLS
- auth
- chat / bookings / moderation data
- edge functions

**Lead agent:**
- `tech-arch`

**Support agents:**
- `qa-release`
- `trust-safety` if sensitive

**Skills:**
- `blizko-supabase`
- `postgres-patterns`
- `supabase-postgres-best-practices`
- `backend-patterns`
- `security-review`
- `database-migrations`

---

## 4. Bugfix / Root Cause

**Когда:**
- баг
- regression
- flaky behavior
- broken flow

**Lead agent:**
- `tech-arch`

**Support agents:**
- `product-lead`
- `qa-release`

**Skills:**
- `debugger`
- `debugging-strategies`
- `react-useeffect`
- `error-handling-patterns`
- `webapp-testing`

**Правило:**
- сначала root cause
- потом fix
- потом validation

---

## 5. Trust / Moderation / Verification

**Когда:**
- policy
- verification flow
- moderation statuses
- incident handling
- sensitive decision logic

**Lead agent:**
- `trust-safety`

**Support agents:**
- `tech-arch`
- `product-lead`
- `qa-release`

**Skills:**
- `security-review`
- `blizko-supabase`
- `content-design`
- `blizko-ux-writing`

---

## 6. Research / Competitors / Market

**Когда:**
- competitors
- pricing
- market size
- latest trends
- current tools/vendors

**Lead agent:**
- `research-analyst`

**Support agents:**
- `product-lead`
- `blizko-growth-director` if GTM impact

**Skills:**
- `perplexity-search`
- `market-research`
- `seo-audit` if acquisition/SEO angle
- `marketing-demand-acquisition` if GTM angle

**Model preference:**
- `Perplexity`
- `Gemini 3.1 Pro (High)`

---

## 7. Growth / Messaging / Funnel

**Когда:**
- acquisition
- conversion
- CRM copy
- funnel leaks
- lead gen tests

**Lead agent:**
- `blizko-growth-director`

**Support agents:**
- `product-lead`
- `joe` if landing/UX impact

**Skills:**
- `marketing-demand-acquisition`
- `marketing-ideas`
- `marketing-psychology`
- `content-design`
- `blizko-ux-writing`

**Model preference:**
- `Gemini 3.1 Pro (High)` for strategy
- `GPT 5.3` for copy

---

## 8. QA / Release / Validation

**Когда:**
- before ship
- after significant refactor
- regression sweep
- release confidence

**Lead agent:**
- `qa-release`

**Support agents:**
- `tech-arch`
- `frontend-vibe-engineer` if UI-heavy

**Skills:**
- `webapp-testing`
- `e2e-testing-patterns`
- `accessibility-compliance`
- `screen-reader-testing`

---

## 9. Documentation / Specs / Decision Memos

**Когда:**
- PRD
- implementation plan
- docs
- ADR
- founder memo

**Lead agent:**
- `product-lead`

**Support agents:**
- `tech-arch`
- `research-analyst`

**Skills:**
- `doc-coauthoring`
- `technical-writer`
- `internal-comms`
- `strategy-advisor`

---

## Hard Rules

- `agents` отвечают за разделение ролей
- `skills` отвечают за качество метода
- `workflows` отвечают за порядок исполнения
- для нетривиальных задач не использовать один агент без причины
- если задача маленькая, не устраивать faux-multi-agent theater
- сначала использовать `Preferred Skills` агента, если они определены в его профиле
