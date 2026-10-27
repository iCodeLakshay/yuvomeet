-- Storage buckets and policies (S-21, S-22, S-24) and Realtime publication.
-- All buckets are private; images are served through 60-second signed URLs.
-- The app re-encodes every upload to JPEG; moderate-image re-encodes again to strip EXIF (S-24).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('quarantine', 'quarantine', false, 8388608, array['image/jpeg']),
  ('media', 'media', false, 8388608, array['image/jpeg']),
  ('exports', 'exports', false, 8388608, array['application/json'])
on conflict (id) do update
set public = excluded.public, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Quarantine: uploader writes and previews only inside their own folder.
create policy quarantine_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'quarantine' and (storage.foldername(name))[1] = auth.uid()::text);
create policy quarantine_read_own on storage.objects for select to authenticated
  using (bucket_id = 'quarantine' and (storage.foldername(name))[1] = auth.uid()::text);
create policy quarantine_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'quarantine' and (storage.foldername(name))[1] = auth.uid()::text);

-- Media: written only by moderate-image (service role); read per app.can_read_media.
create policy media_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and app.can_read_media(name));
create policy media_delete_own_profile on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'profiles'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Exports: owner may read their own file (signed link from export-data).
create policy exports_read_own on storage.objects for select to authenticated
  using (bucket_id = 'exports' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime delivers rows through the same select policies.
alter publication supabase_realtime add table public.messages, public.plan_members, public.notifications;
