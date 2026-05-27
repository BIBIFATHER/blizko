-- BLI-54: Storage buckets для онбординга нянь.
-- photos/videos — public (профильный контент); documents — PRIVATE (PII паспорт/медкнижка),
-- отдаётся только через signed URLs.
-- Идемпотентно: повторный прогон обновляет конфиг бакетов и пересоздаёт политики.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('nanny-photos',    'nanny-photos',    true,  10485760, array['image/jpeg','image/png','image/webp','image/heic']),
  ('nanny-videos',    'nanny-videos',    true,  52428800, array['video/mp4','video/quicktime','video/webm']),
  ('nanny-documents', 'nanny-documents', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Путь загрузки: "<auth_uid>/<file>" — ограничиваем запись своей папкой.

-- nanny-photos: public read + owner insert
drop policy if exists "nanny_photos_owner_insert" on storage.objects;
create policy "nanny_photos_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'nanny-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "nanny_photos_public_read" on storage.objects;
create policy "nanny_photos_public_read" on storage.objects for select to public
  using (bucket_id = 'nanny-photos');

-- nanny-videos: public read + owner insert
drop policy if exists "nanny_videos_owner_insert" on storage.objects;
create policy "nanny_videos_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'nanny-videos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "nanny_videos_public_read" on storage.objects;
create policy "nanny_videos_public_read" on storage.objects for select to public
  using (bucket_id = 'nanny-videos');

-- nanny-documents: PRIVATE. owner insert + owner read.
-- Куратор/админ читает через server (service_role обходит RLS) + signed URL — см. Phase 2.
drop policy if exists "nanny_documents_owner_insert" on storage.objects;
create policy "nanny_documents_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'nanny-documents' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "nanny_documents_owner_read" on storage.objects;
create policy "nanny_documents_owner_read" on storage.objects for select to authenticated
  using (bucket_id = 'nanny-documents' and (storage.foldername(name))[1] = auth.uid()::text);
