create table support_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  name       text not null,
  email      text not null,
  message    text not null,
  status     text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

-- Anyone (including unauthenticated web visitors) can submit a support request.
-- Only service role can read them (admin dashboard / email notifications).
alter table support_requests enable row level security;

create policy "Anyone can submit a support request"
  on support_requests for insert
  with check (true);
