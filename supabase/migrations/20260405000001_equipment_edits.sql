create type equipment_edit_status as enum ('pending', 'approved', 'rejected');

create table grinder_edits (
  id          uuid primary key default gen_random_uuid(),
  grinder_id  uuid not null references grinders(id) on delete cascade,
  proposed_by uuid references auth.users(id) on delete set null,
  payload     jsonb not null,
  status      equipment_edit_status not null default 'pending',
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create table machine_edits (
  id          uuid primary key default gen_random_uuid(),
  machine_id  uuid not null references brew_machines(id) on delete cascade,
  proposed_by uuid references auth.users(id) on delete set null,
  payload     jsonb not null,
  status      equipment_edit_status not null default 'pending',
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table grinder_edits enable row level security;
alter table machine_edits enable row level security;

-- Authenticated users can queue their own edits
create policy "Authenticated users can submit grinder edits"
  on grinder_edits for insert to authenticated
  with check (auth.uid() = proposed_by);

create policy "Authenticated users can submit machine edits"
  on machine_edits for insert to authenticated
  with check (auth.uid() = proposed_by);

-- Users can read their own edits (so they can see pending review status)
create policy "Users can view their own grinder edits"
  on grinder_edits for select to authenticated
  using (auth.uid() = proposed_by);

create policy "Users can view their own machine edits"
  on machine_edits for select to authenticated
  using (auth.uid() = proposed_by);

-- Admins can read all edits (approve/reject is handled via service-role edge function)
create policy "Admins can view grinder edits"
  on grinder_edits for select to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

create policy "Admins can view machine edits"
  on machine_edits for select to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
