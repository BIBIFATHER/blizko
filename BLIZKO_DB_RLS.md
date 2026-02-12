# Blizko DB / RLS (Draft)

## Goal
Зафиксировать схему Supabase и политики доступа (RLS), чтобы ускорять изменения и избегать регрессов.

## Таблицы (минимум)
- **parents** — заявки родителей (payload JSON, created_at, user_id)
- **nannies** — профили нянь (payload JSON, created_at, user_id)
- **phone_otps** — OTP коды (server‑side only)

## Расширения (предложение)
- **nanny_verifications** — факт‑проверки документов/личности (кто/когда/статус)
- **nanny_risk_flags** — структурированные red flags
- **matches** — история подборов (parent_id, nanny_id, status)

## Ключевые поля
- `id` (text/uuid) — primary key
- `user_id` (uuid) — владелец записи (auth.uid)
- `payload` (jsonb) — основная бизнес‑структура
- `created_at` (timestamptz)
- `status` — хранится внутри payload (ParentRequest.status)
- `verification_status` (text) — Draft/Submitted/AI Precheck/Needs Fix/Approved/Manual Verified/Recommended
- `trust_score` (int) — сводный Trust Score (0–100)
- `profile_completeness` (int) — заполненность анкеты (0–100)
- `response_time_hours` (numeric) — среднее время ответа (для A/B/C)
- `risk_flags` (jsonb) — red flags/риски

## Связи
- `parents.user_id` ↔ `auth.users.id`
- `nannies.user_id` ↔ `auth.users.id`
- `phone_otps` — отдельная, deny‑all RLS

## RLS политики (per‑user)
- **parents**: select/insert/update/delete только `user_id = auth.uid()`
- **nannies**: select/insert/update/delete только `user_id = auth.uid()`
- **phone_otps**: deny‑all (доступ только через service role)

## Миграции / порядок
1) Создание таблиц (parents/nannies/phone_otps)
2) Добавить `user_id` + default `auth.uid()`
3) Включить RLS
4) Создать per‑user policies
5) Заполнить NULL‑ы и поставить `NOT NULL` на `user_id`

## Вопросы к Антону (требуется подтверждение)
- Где хранится схема? (SQL/миграции/ручной редактор Supabase)
- Нужны ли отдельные таблицы: `matches`, `docs`, `payments`?
- Подтверждаем ли отдельные таблицы `nanny_verifications` и `nanny_risk_flags`?
- Кто и как получает админ‑доступ (role/claim) кроме service role?
