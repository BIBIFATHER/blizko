# Blizko DB / RLS (Draft)

## Goal
Зафиксировать схему Supabase и политики доступа (RLS), чтобы ускорять изменения и избегать регрессов.

## Таблицы (минимум)
- **parents** — заявки родителей (payload JSON, created_at, user_id)
- **nannies** — профили нянь (payload JSON, created_at, user_id)
- **phone_otps** — OTP коды (server‑side only)

## Ключевые поля
- `id` (text/uuid) — primary key
- `user_id` (uuid) — владелец записи (auth.uid)
- `payload` (jsonb) — основная бизнес‑структура
- `created_at` (timestamptz)
- `status` — хранится внутри payload (ParentRequest.status)

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
- Кто и как получает админ‑доступ (role/claim) кроме service role?
