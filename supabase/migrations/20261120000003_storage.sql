-- ════════════════════════════════════════════════════════════════════
-- VoltageAfrica CMS · 003 · Storage
--   media   — public bucket for website images, video and documents
--   private — private bucket for restricted files (admin only, signed URLs)
-- SVG is intentionally not allowed (it can carry script).
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf']),
  ('private', 'private', false, 52428800, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "VA media: public read" on storage.objects;
drop policy if exists "VA private: admins read" on storage.objects;
drop policy if exists "VA media: admins insert" on storage.objects;
drop policy if exists "VA media: admins update" on storage.objects;
drop policy if exists "VA media: admins delete" on storage.objects;

create policy "VA media: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

create policy "VA private: admins read" on storage.objects
  for select to authenticated
  using (bucket_id = 'private' and (select public.is_admin()));

create policy "VA media: admins insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('media', 'private') and (select public.is_admin()));

create policy "VA media: admins update" on storage.objects
  for update to authenticated
  using (bucket_id in ('media', 'private') and (select public.is_admin()))
  with check (bucket_id in ('media', 'private') and (select public.is_admin()));

create policy "VA media: admins delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('media', 'private') and (select public.is_admin()));
