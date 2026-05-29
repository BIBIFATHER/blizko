-- Fix matching_outcomes 400 (BLI-64): recordMatchOutcome / shadowScoring делают
-- upsert(..., { onConflict: 'parent_id,nanny_id' }), но unique-constraint на пару
-- (parent_id, nanny_id) не было — только PK по id и FK. Postgres отклонял upsert
-- ("no unique or exclusion constraint matching the ON CONFLICT specification") → 400.
-- Следствие: ни один исход подбора никогда не записывался (таблица пустая),
-- learning loop собирал ноль данных.
--
-- Фикс: добавить unique (parent_id, nanny_id) — ровно то, на что ссылается onConflict.
-- Таблица пустая, дублей нет → constraint добавляется чисто.

alter table public.matching_outcomes
  add constraint matching_outcomes_parent_nanny_key unique (parent_id, nanny_id);
