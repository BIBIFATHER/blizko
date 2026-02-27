# BLIZKO — MASTER PLAN (Source of Truth)

> Источник: /Users/anton/Desktop/blizko 3/PROJECT_MASTER_DOC.md
> Canon: core/BLIZKO_MASTER_PLAN.md отвечает за приоритеты, фазу и стратегический фокус.

---

## 1) North Star
**Самый безопасный и предсказуемый сервис подбора нянь.**
Мы продаём доверие, стабильность и объяснимость — не просто список нянь.

---

## Architecture Decision — Single App, Two Roles
Decision:
- Один backend
- Один frontend
- Role-based routing
- Feature flags
- Guarded routes
- No second nanny app until PMF validated

Justification:
- Снижение tech debt
- Централизованный tracking
- Упрощение growth
- Быстрее итерации

---

## 2) Execution Timeline (Weeks 1–8)

### Weeks 1–2: Запуск сделок (Days 1–14)
- Day 1–7: верификация MVP, рекомендации, OSINT‑hard, триаж 30–50 нянь, первые сделки
- Day 8–14: стабилизация воронки, фидбэк после визита, ядро 30–50 verified
**Результат:** первые сделки + стабильная воронка

### Weeks 3–4: Платежи и масштаб (Days 15–28)
- Day 15–21: ЮKassa (create payment + webhook + payments table)
- Day 22–28: 100+ нянь в пуле, регулярные сделки, улучшение SLA
**Результат:** платежи в работе + устойчивый поток

### Weeks 5–6: App Store readiness (Days 29–42)
- Day 29–35: финальный UX‑полиш, удаление аккаунта/данных, privacy/terms
- Day 36–42: Capacitor wrapper + TestFlight (internal → external)
**Результат:** TestFlight готов

### Weeks 7–8: Релиз (Days 43–56)
- Day 43–49: App Store Connect, скриншоты, metadata
- Day 50–56: Review + релиз
**Результат:** App Store релиз

---

## 3) AI Roadmap (Phases A–C)

### Фаза A (1–2 месяца)
- NLP‑анализ анкет/ответов (стиль, эмпатия, структура)
- Умный скоринг (перевод в features)
- Авто‑объяснимость матча

### Фаза B (2–3 месяца)
- Видео‑интервью + CV‑сигналы (с согласия)
- Risk‑engine 2.0 (конфликтные сочетания)
- Поведенческие микрокейсы

### Фаза C (3–4 месяца)
- Ранжирование на фидбэке (ML‑ranking)
- Персональные сценарии под семью
- Авто‑оптимизация стабильности (предиктивный резерв)

---

## 4) Product Blocks (Roadmap)
1) **Качество базы**
- Верификация документов (OCR/MRZ + face‑match)
- Рекомендации (2 контакта)
- OSINT/правовой след + Trust‑score 2

2) **Совместимость (Mirror+/PCM)**
- Анкеты + поведенческие вопросы
- Объяснимый мэтчинг
- Фидбэк после визита

3) **Стабильность/гарантия прихода**
- Soft‑hold + приоритетные окна + двойной резерв
- Подтверждения T‑24ч / T‑3–4ч
- Календарь (родитель/няня/админ)

4) **Платежи и экономика**
- Комиссия с нянь
- Контроль выплат / стабильность

5) **Операционный запуск**
- Онбординг нянь
- Модерация
- Первый пул семей/нянь

6) **Мобильная упаковка**
- PWA / моб‑UX
- Быстрые сценарии бронирования

### Phase PMF — Nanny Role Mode
Deliverables:
**Product:**
- Nanny funnel mapping
- Nanny dashboard logic
- Status states (applied → verified → matched)

**Tech:**
- Role-based routing
- Route guards
- Feature flags system
- Event tracking:
  - nanny_registered
  - nanny_verified
  - nanny_profile_completed
  - nanny_matched
  - deal_done

**Design:**
- Nanny onboarding screens
- Nanny dashboard
- Status states
- Error states

**Trust:**
- Verification state logic
- Abuse risk modelling
- Escalation triggers

**Ops:**
- Manual review process
- SLA for nanny verification

**Growth:**
- Funnel metrics per stage
- Drop-off tracking

**KPI control (Nanny Mode):**
Primary:
- nanny onboarding completion %
- verified nanny %
- matched %
- deal_done %

Secondary:
- time to verification
- drop-off per screen
