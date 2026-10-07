-- Optional profile avatar/banner uploads.
-- Safe to run after the existing profiles migrations.

alter table public.profiles
  add column if not exists banner_url text;

-- Public URLs are intentional: profile media is public profile data, just
-- like avatar_url. Uploads are still scoped to the authenticated user's
-- folder by the storage policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile media is publicly readable" on storage.objects;
create policy "Profile media is publicly readable"
on storage.objects for select
to public
using (bucket_id = 'profile-media');

drop policy if exists "Users can upload their profile media" on storage.objects;
create policy "Users can upload their profile media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can replace their profile media" on storage.objects;
create policy "Users can replace their profile media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can remove their profile media" on storage.objects;
create policy "Users can remove their profile media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
