# Current WIP

Date: 2026-02-26
Stage: 0 — Фундамент (инфраструктура, AI-proxy, анализ анкет v1, базовый подбор, чат-объяснитель)
Active Goal: Weeks 1–2 запуск сделок — верификация MVP, рекомендации, OSINT-hard, триаж 30–50 нянь, первые сделки; стабилизация воронки
Deal_done: нет зафиксированных сделок в файлах
App Doing: SMSAero (OTP) — ждём договор
Ops Doing: Airtable/Google Sheets — воронка откликов + SLA; Notion Kanban — перенос Done/Doing/To‑Do карточек (in progress)
Bottleneck: SMSAero (OTP) — ожидание договора
Notes: Done/in place — Supabase (DB/Auth/Storage), Vercel (API/Hosting), Resend (Email + домен), Sentry, AI provider, Telegram Ops канал, базовые UI-модули и API /api/notify, /api/notify-test, /api/auth/send-otp-phone, /api/auth/verify-otp-phone

INCIDENT: core drift detected (AI_ROADMAP.md, METRICS_GLOSSARY.md edited without APPROVED RFC). Status: APPROVED and applied via RFC 2026-02-26_core_drift_fix.
RFC APPLIED: 2026-02-26_single_app_two_roles (Architecture Decision + Nanny Mode roadmap + KPI control)
P0: Tech spec created — Nanny Role MVP (role routing, guards, feature flags, minimal nanny dashboard)
MODE: PMF WAR MODE (30 days) — focus onboarding→verification→match→deal_done; metrics per war mode.
P0: Implement event tracking baseline export (simple SQL/dashboard export within 24h)
P0: Create tracking spec in tech/tracking/* (nanny funnel events + SQL/dashboard export)
RFC applied: 2026-02-26_enforce_approved_content (CORE_CHANGE_PROTOCOL updated with Approved content requirement).
