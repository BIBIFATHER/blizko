# Blizko — Master Project Document

**Legend:** 🟩 exists • 🟦 planned

## 1) North Star
Самый безопасный и предсказуемый сервис подбора нянь. Мы продаём доверие, стабильность и объяснимость — не просто список нянь.

## 2) Execution Timeline (Weeks 1–8)

**Weeks 1–2: Запуск сделок (Days 1–14)**
- Day 1–7: верификация MVP, рекомендации, OSINT‑hard, триаж 30–50 нянь, первые сделки
- Day 8–14: стабилизация воронки, фидбэк после визита, ядро 30–50 verified

**Результат:** первые сделки + стабильная воронка

**Weeks 3–4: Платежи и масштаб (Days 15–28)**
- Day 15–21: ЮKassa (create payment + webhook + payments table)
- Day 22–28: 100+ нянь в пуле, регулярные сделки, улучшение SLA

**Результат:** платежи в работе + устойчивый поток

**Weeks 5–6: App Store readiness (Days 29–42)**
- Day 29–35: финальный UX‑полиш, удаление аккаунта/данных, privacy/terms
- Day 36–42: Capacitor wrapper + TestFlight (internal → external)

**Результат:** TestFlight готов

**Weeks 7–8: Релиз (Days 43–56)**
- Day 43–49: App Store Connect, скриншоты, metadata
- Day 50–56: Review + релиз

**Результат:** App Store релиз

## 3) AI Roadmap (Phases A–C)

**Фаза A (1–2 месяца)**
- NLP‑анализ анкет/ответов (стиль, эмпатия, структура)
- Умный скоринг (перевод в features)
- Авто‑объяснимость матча

**Фаза B (2–3 месяца)**
- Видео‑интервью + CV‑сигналы (с согласия)
- Risk‑engine 2.0 (конфликтные сочетания)
- Поведенческие микрокейсы

**Фаза C (3–4 месяца)**
- Ранжирование на фидбэке (ML‑ranking)
- Персональные сценарии под семью
- Авто‑оптимизация стабильности (предиктивный резерв)

## 4) Product Blocks (Roadmap)

1. **Качество базы**
   - Верификация документов (OCR/MRZ + face‑match)
   - Рекомендации (2 контакта)
   - OSINT/правовой след + Trust‑score 2

2. **Совместимость (Mirror+/PCM)**
   - Анкеты + поведенческие вопросы
   - Объяснимый мэтчинг
   - Фидбэк после визита

3. **Стабильность/гарантия прихода**
   - Soft‑hold + приоритетные окна + двойной резерв
   - Подтверждения T‑24ч / T‑3–4ч
   - Календарь (родитель/няня/админ)

4. **Платежи и экономика**
   - Комиссия с нянь
   - Контроль выплат / стабильность

5. **Операционный запуск**
   - Онбординг нянь
   - Модерация
   - Первый пул семей/нянь

6. **Мобильная упаковка**
   - PWA / моб‑UX
   - Быстрые сценарии бронирования

## 5) Canonical System Block Diagram

```mermaid
flowchart TB
  %% USERS
  subgraph Users[Пользователи]
    PARENT[Родитель]
    NANNY[Няня]
    ADMIN[Админ/Операции]
  end

  %% CLIENT
  subgraph Client[Client — Vite/React]
    PF[ParentForm]
    NF[NannyForm]
    AUTH[AuthModal / UserProfile]
    MATCH[Match Result Screen]
    UPLOAD[DocumentUploadModal]
    ADMIN_UI[AdminPanel]
  end

  %% API
  subgraph API[Vercel API]
    OTP1[/api/auth/send-otp-phone/]
    OTP2[/api/auth/verify-otp-phone/]
    AI[/api/ai (matching/document)/]
    DATA_P[/api/data/parents/]
    DATA_N[/api/data/nannies/]
    NOTIF[/api/notify/]
    PAY[/api/payments (create+webhook) 🟦]
  end

  %% CORE DATA
  subgraph DB[Supabase]
    PDB[(parents table)]
    NDB[(nannies table)]
    PAYDB[(payments table 🟦)]
    RLS[[RLS policies 🟦]]
  end

  %% AI/VERIFICATION
  subgraph AIBlock[AI & Verification]
    NLP[NLP‑analysis (style/empathy/structure) 🟦]
    SCORE[Smart scoring → features 🟦]
    EXPLAIN[Auto‑explainable match 🟦]
    OCR[OCR/MRZ + face‑match 🟦]
    OSINT[OSINT / legal trace 🟦]
  end

  %% OPS / COMMS
  subgraph OPS[Ops & Comms]
    SMS[SMSAero (OTP)]
    RESEND[Resend (email)]
    PUSH[Push notifications 🟦]
    TG[Telegram Ops]
  end

  %% ANALYTICS
  subgraph OBS[Observability]
    SENTRY[Sentry]
    ANALYTICS[Product analytics 🟦]
  end

  %% PAYMENTS
  subgraph PAYMENTS[Payments]
    YK[ЮKassa 🟦]
  end

  %% FLOWS
  PARENT --> PF --> MATCH
  NANNY --> NF --> UPLOAD
  ADMIN --> ADMIN_UI
  AUTH --> OTP1 --> SMS
  OTP2 --> DB
  PF --> AI --> AIBlock --> MATCH
  NF --> DATA_N --> DB
  PF --> DATA_P --> DB
  ADMIN_UI --> DATA_P
  ADMIN_UI --> DATA_N
  AI --> DB
  NOTIF --> OPS
  SENTRY --> OBS
  ANALYTICS --> OBS
  PAY --> PAYMENTS --> PAYDB
  DB --> RLS

  %% OWNERS
  subgraph Owners[Master Roles]
    PL[Product Lead]
    OPSL[Ops Lead]
    ENG[Engineering Lead]
    LEG[Legal Owner]
    DPO[DPO/Privacy]
  end

  PL -.-> Client
  ENG -.-> API
  ENG -.-> DB
  OPSL -.-> OPS
  LEG -.-> PAYMENTS
  DPO -.-> RLS
```

## 6) Section Explanations (Why + How)

Blizko, [17.02.2026 15:12]
1) Пользователи (Parents / Nannies / Admin)
