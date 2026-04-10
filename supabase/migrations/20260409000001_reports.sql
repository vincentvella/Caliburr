create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('recipe', 'grinder', 'machine')),
  target_id   uuid not null,
  reason      text not null check (reason in ('spam', 'incorrect', 'inappropriate', 'duplicate', 'other')),
  status      text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now(),
  -- One report per user per target
  unique (reporter_id, target_type, target_id)
);

alter table reports enable row level security;

-- Authenticated users can submit reports
create policy "Authenticated users can submit reports"
  on reports for insert to authenticated
  with check (auth.uid() = reporter_id);

-- Admins can read and update all reports
create policy "Admins can read reports"
  on reports for select to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

create policy "Admins can update reports"
  on reports for update to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  with check ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
