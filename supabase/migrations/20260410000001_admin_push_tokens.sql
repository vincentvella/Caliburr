create table admin_push_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null,
  platform    text not null check (platform in ('ios', 'android', 'web')),
  updated_at  timestamptz not null default now(),
  unique (user_id, token)
);

alter table admin_push_tokens enable row level security;

-- Only service role can read/write (edge function uses service role)
create policy "Service role manages push tokens"
  on admin_push_tokens for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Admins can upsert their own token (needed from the app)
create policy "Admins can upsert own token"
  on admin_push_tokens for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

create policy "Admins can update own token"
  on admin_push_tokens for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );
