-- BLI-141 expand-фаза постусловия. Точные ассерты (DB-протокол: IF NOT EXISTS
-- мог бы оставить несовместимый объект — проверяем каталог явно). Каждый DO падает с ASSERT.
DO $$
DECLARE t_oid oid;
BEGIN
  SELECT c.oid INTO t_oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='account_deletions';
  ASSERT t_oid IS NOT NULL, 'account_deletions missing';
  -- точные колонки/типы/nullability
  ASSERT (SELECT format_type(atttypid,atttypmod) FROM pg_attribute
          WHERE attrelid=t_oid AND attname='user_id') = 'uuid', 'user_id not uuid';
  ASSERT (SELECT attnotnull FROM pg_attribute WHERE attrelid=t_oid AND attname='state'), 'state must be NOT NULL';
  ASSERT (SELECT attnotnull FROM pg_attribute WHERE attrelid=t_oid AND attname='attempts'), 'attempts must be NOT NULL';
  -- PK именно на user_id
  ASSERT (SELECT string_agg(a.attname,',' ORDER BY a.attnum)
          FROM pg_constraint con JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=ANY(con.conkey)
          WHERE con.conrelid=t_oid AND con.contype='p') = 'user_id', 'PK must be (user_id)';
  -- state CHECK структурно: нормализованное определение равно ожидаемому
  ASSERT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t_oid AND contype='c' AND conname='account_deletions_state_check'
          AND pg_get_constraintdef(oid) =
          E'CHECK ((state = ANY (ARRAY[''deleting''::text, ''db_done''::text, ''deleted''::text, ''failed''::text])))'),
         'state CHECK not exactly the 4 expected states';
  -- НЕТ FK (переживает удаление auth.users)
  ASSERT NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t_oid AND contype='f'), 'account_deletions must NOT have FK';
  -- RLS включён
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid=t_oid), 'RLS not enabled on account_deletions';
  -- EFFECTIVE привилегии (покрывает PUBLIC + членство, не только прямые grants):
  --   anon/authenticated не имеют НИ ОДНОЙ табличной привилегии
  ASSERT NOT (has_table_privilege('anon','public.account_deletions','SELECT')
           OR has_table_privilege('anon','public.account_deletions','INSERT')
           OR has_table_privilege('anon','public.account_deletions','UPDATE')
           OR has_table_privilege('anon','public.account_deletions','DELETE')),
         'anon must have NO effective privileges';
  ASSERT NOT (has_table_privilege('authenticated','public.account_deletions','SELECT')
           OR has_table_privilege('authenticated','public.account_deletions','INSERT')
           OR has_table_privilege('authenticated','public.account_deletions','UPDATE')
           OR has_table_privilege('authenticated','public.account_deletions','DELETE')),
         'authenticated must have NO effective privileges';
  --   service_role сохраняет доступ (сервер пишет через него; RLS он обходит, grants — НЕТ)
  ASSERT has_table_privilege('service_role','public.account_deletions','INSERT')
     AND has_table_privilege('service_role','public.account_deletions','SELECT')
     AND has_table_privilege('service_role','public.account_deletions','UPDATE'),
         'service_role must retain access';
  RAISE NOTICE 'Task1 guards passed';
END $$;
