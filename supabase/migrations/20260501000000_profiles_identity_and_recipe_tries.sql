-- Identity columns on profiles + auto-create on sign-up + recipe_tries table.

-- ── profiles: identity columns ────────────────────────────────────────────
alter table profiles
  add column if not exists display_name text,
  add column if not exists avatar_url   text;

-- Users update their own profile (display_name, avatar_url). Backer columns
-- remain service-role only via the existing policy.
create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── auto-create profile row on sign-up ────────────────────────────────────
-- Default display_name = email handle. Existing service-role policy still
-- allows the backer webhook to upsert backer_tier without conflict.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill: every existing user without a profile row gets one with their
-- email handle as the default display_name.
insert into profiles (user_id, display_name)
select u.id, split_part(u.email, '@', 1)
from auth.users u
left join profiles p on p.user_id = u.id
where p.user_id is null
on conflict (user_id) do nothing;

-- And for users who already had a profile row (backers) but no display_name yet:
update profiles p
   set display_name = split_part(u.email, '@', 1)
  from auth.users u
 where p.user_id = u.id
   and p.display_name is null;

-- ── avatars bucket ────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB; avatars compressed below this in client
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── recipe_tries ──────────────────────────────────────────────────────────
create table recipe_tries (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references recipes(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  worked        boolean not null,
  grind_delta   text,
  yield_delta_g numeric,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (recipe_id, user_id)
);

create index recipe_tries_recipe_id_idx on recipe_tries (recipe_id);
create index recipe_tries_user_id_idx on recipe_tries (user_id);

alter table recipe_tries enable row level security;

create policy "Public read recipe_tries"
  on recipe_tries for select
  using (true);

create policy "Users insert own recipe_tries"
  on recipe_tries for insert
  with check (auth.uid() = user_id);

create policy "Users update own recipe_tries"
  on recipe_tries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own recipe_tries"
  on recipe_tries for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh on row updates.
create or replace function set_recipe_tries_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger recipe_tries_updated_at
  before update on recipe_tries
  for each row execute function set_recipe_tries_updated_at();

-- ── recipes: notification debounce column ────────────────────────────────
-- Used by the Phase 2 push notification trigger; harmless to add now.
alter table recipes
  add column if not exists last_try_notification_at timestamptz;
