-- Add image approval status to equipment tables
alter table grinders
  add column image_status text check (image_status in ('pending', 'approved', 'rejected'));

alter table brew_machines
  add column image_status text check (image_status in ('pending', 'approved', 'rejected'));

-- Storage bucket for approved equipment images (downloaded + resized at approval time)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'equipment-images',
  'equipment-images',
  true,
  5242880, -- 5 MB
  array['image/webp']
)
on conflict (id) do nothing;

-- Public read
create policy "Public read equipment images"
  on storage.objects for select
  using (bucket_id = 'equipment-images');

-- Only service role can write (Edge Function uses service role key)
create policy "Service role manages equipment images"
  on storage.objects for all
  using (bucket_id = 'equipment-images' and auth.role() = 'service_role')
  with check (bucket_id = 'equipment-images' and auth.role() = 'service_role');
