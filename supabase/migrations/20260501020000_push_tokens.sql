-- General-purpose push token registry. Used by the notify-recipe-try edge
-- function to push to recipe authors when someone tries their recipe.
-- (admin_push_tokens predates this and is kept separate for now.)

create table push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null,
  platform    text not null check (platform in ('ios', 'android', 'web')),
  updated_at  timestamptz not null default now(),
  unique (user_id, token)
);

create index push_tokens_user_id_idx on push_tokens (user_id);

alter table push_tokens enable row level security;

-- Service role (edge functions) can read/write everything.
create policy "Service role manages push_tokens"
  on push_tokens for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Users can register / refresh / clear their own tokens.
create policy "Users insert own push_tokens"
  on push_tokens for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users update own push_tokens"
  on push_tokens for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users delete own push_tokens"
  on push_tokens for delete
  to authenticated
  using (user_id = auth.uid());
