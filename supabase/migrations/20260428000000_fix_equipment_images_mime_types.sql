-- The 20260410 migration intended to broaden allowed_mime_types but used
-- `on conflict do nothing`, leaving the bucket stuck on the original webp-only
-- list and breaking JPEG uploads from the client. Apply the intended set now.
update storage.buckets
set
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  file_size_limit = 5242880
where id = 'equipment-images';
