-- Public bucket for equipment images (served via CDN, admin-reviewed before display)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'equipment-images',
  'equipment-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Authenticated users can upload
create policy "Authenticated users can upload equipment images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'equipment-images');

-- Users can delete their own uploads (by user_id prefix in path)
create policy "Users can delete own equipment images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'equipment-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
