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

1) **Пользователи (Parents / Nannies / Admin)**
- **Зачем:** три роли, три потока ценности.
- **Как:** три UX‑пути → родитель (заявка/матч), няня (анкета/доки), админ (модерация/статусы).

2) **Client (Vite/React)**
- **Зачем:** быстрый MVP + контроль UX.
- **Как:**
  - ParentForm → сбор запроса
  - NannyForm → анкета + документы
  - AuthModal/UserProfile → вход/профиль
  - Match Result → объяснимые рекомендации
  - DocumentUploadModal → доки
  - AdminPanel → статусы/модерация

3) **API (Vercel)**
- **Зачем:** серверный контур для AI, OTP, данных и платежей.
- **Как:**
  - send/verify‑otp‑phone → SMSAero
  - /api/ai → matching/document AI
  - /api/data/parents|nannies → чтение/запись
  - /api/notify → операционные уведомления
  - /api/payments → ЮKassa (create + webhook)

4) **Supabase (DB/Auth/Storage)**
- **Зачем:** хранение заявок, анкет и статусов.
- **Как:**
  - таблицы parents, nannies, payments
  - RLS для безопасности доступа

5) **AI & Verification**
- **Зачем:** отличаться качеством и объяснимостью.
- **Как:**
  - NLP‑анализ (стиль, эмпатия, структура)
  - Скоринг → features
  - Explainability (почему этот матч)
  - OCR/MRZ + face‑match
  - OSINT/правовой след

6) **Ops & Comms**
- **Зачем:** управляемый запуск и стабильность сделок.
- **Как:**
  - SMSAero (OTP)
  - Resend (email)
  - Push (напоминания T‑24ч/T‑3–4ч)
  - Telegram ops (ручной контроль)

7) **Observability**
- **Зачем:** ловить ошибки и видеть воронку.
- **Как:**
  - Sentry для ошибок
  - Product analytics для метрик

8) **Payments**
- **Зачем:** закрепить экономику.
- **Как:**
  - ЮKassa (create payment + webhook)
  - payments table в DB

9) **Master Roles (Owners)**
- **Зачем:** у каждого блока есть владелец.
- **Как:**
  - Product Lead → UX/roadmap/фокус
  - Ops Lead → модерация/SLA/сделки
  - Engineering Lead → API/DB/AI
  - Legal + DPO → privacy/terms/RLS

## 7) Services (Connected & Planned) + Why

**Уже подключено**
- **Supabase (DB/Auth/Storage)** — быстрый запуск без devops, Postgres + RLS + auth.
- **Vercel (API/Hosting)** — быстрый деплой фронта и serverless‑API.
- **SMSAero (OTP)** — надёжная/дешёвая SMS‑верификация.
- **Resend (Email)** — удобные транзакционные письма.
- **Sentry (Ошибки)** — мгновенный контроль качества.
- **AI Provider (matching/document)** — ядро дифференциации.

**Подключаем**
- **ЮKassa (Payments)** — лучший локальный платёжный контур + webhooks.
- **OCR/MRZ + Face‑match** — усиление доверия, контроль качества базы.
- **OSINT checks** — hard‑фильтры безопасности.
- **Push notifications** — снижение срывов (T‑24ч/T‑3–4ч).
- **Product analytics** — управление ростом и метриками.
