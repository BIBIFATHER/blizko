-- Fix launch-blocker (BLI-55 smoke): любой UPDATE на nannies/parents падал с
-- "record \"new\" has no field \"updated_at\"". Причина: BEFORE UPDATE триггер
-- update_updated_at() пишет NEW.updated_at = now(), но колонка updated_at не была
-- добавлена ни в одну из таблиц. Симптом: повторный submit анкеты няни (UPDATE
-- существующего профиля) → 400; parent edit упал бы так же.
--
-- Фикс: добавить колонку, которую ожидает триггер. INSERT берёт DEFAULT now(),
-- UPDATE — значение из триггера. Не деструктивно, idempotent.

alter table public.nannies add column if not exists updated_at timestamptz not null default now();
alter table public.parents add column if not exists updated_at timestamptz not null default now();
