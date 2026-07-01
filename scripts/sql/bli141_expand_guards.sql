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

DO $$
DECLARE b_oid oid; nannies_oid oid; expect text;
BEGIN
  SELECT c.oid INTO b_oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='bookings';
  SELECT c.oid INTO nannies_oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='nannies';
  -- ТОЧНЫЕ тип+nullability каждой из 5 колонок (format 'name:type:notnull')
  expect := 'idempotency_key:text:false|idempotency_fingerprint:text:false|nanny_profile_id:text:false|'
         || 'parent_erased_at:timestamp with time zone:false|nanny_erased_at:timestamp with time zone:false';
  ASSERT (SELECT string_agg(attname||':'||format_type(atttypid,atttypmod)||':'||attnotnull::text,'|'
                            ORDER BY array_position(ARRAY['idempotency_key','idempotency_fingerprint',
                              'nanny_profile_id','parent_erased_at','nanny_erased_at'], attname))
          FROM pg_attribute WHERE attrelid=b_oid AND NOT attisdropped
            AND attname IN ('idempotency_key','idempotency_fingerprint',
                            'nanny_profile_id','parent_erased_at','nanny_erased_at')) = expect,
         'bookings expand columns: wrong type/nullability set';
  -- named UNIQUE constraint именно на (idempotency_key), имя = §4 дизайна
  ASSERT EXISTS (SELECT 1 FROM pg_constraint
          WHERE conrelid=b_oid AND conname='bookings_idempotency_key_key' AND contype='u'
            AND (SELECT string_agg(a.attname,',' ORDER BY a.attnum)
                 FROM pg_attribute a WHERE a.attrelid=b_oid AND a.attnum=ANY(pg_constraint.conkey))='idempotency_key'),
         'bookings_idempotency_key_key must be UNIQUE(idempotency_key)';
  -- ПОЛНЫЙ FK-контракт: local col=nanny_profile_id, confrelid=public.nannies,
  --   ref col=id, ON DELETE SET NULL
  ASSERT EXISTS (SELECT 1 FROM pg_constraint con
          WHERE con.conrelid=b_oid AND con.conname='bookings_nanny_profile_id_fkey' AND con.contype='f'
            AND con.confrelid=nannies_oid AND con.confdeltype='n'
            AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid=b_oid AND a.attnum=con.conkey[1])='nanny_profile_id'
            AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid=nannies_oid AND a.attnum=con.confkey[1])='id'),
         'nanny_profile_id FK contract wrong (col/ref/ondelete)';
  RAISE NOTICE 'Task2 guards passed';
END $$;
