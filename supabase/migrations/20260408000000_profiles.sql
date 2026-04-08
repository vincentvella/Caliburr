create table profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  backer_tier text check (backer_tier in ('monthly', 'annual')),
  backer_since timestamptz,
  updated_at  timestamptz not null default now()
);

alter table profiles enable row level security;

-- Anyone can read (needed to show backer badges on other users' recipes)
create policy "Public read profiles"
  on profiles for select
  using (true);

-- Only service role (webhook) can write
create policy "Service role manages profiles"
  on profiles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
