-- ============================================================
-- ENUMS
-- ============================================================

create type machine_type as enum (
  'espresso',
  'super_automatic',
  'drip',
  'pod'
);

-- ============================================================
-- BREW MACHINES
-- ============================================================

create table brew_machines (
  id           uuid primary key default gen_random_uuid(),
  brand        text not null,
  model        text not null,
  machine_type machine_type not null,
  verified     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (brand, model)
);

-- ============================================================
-- USER EQUIPMENT JUNCTIONS
-- ============================================================

create table user_grinders (
  user_id    uuid not null references auth.users (id) on delete cascade,
  grinder_id uuid not null references grinders (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, grinder_id)
);

create table user_brew_machines (
  user_id         uuid not null references auth.users (id) on delete cascade,
  brew_machine_id uuid not null references brew_machines (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (user_id, brew_machine_id)
);

-- ============================================================
-- ADD brew_machine_id TO RECIPES
-- ============================================================

alter table recipes
  add column brew_machine_id uuid references brew_machines (id) on delete set null;

create index idx_recipes_brew_machine_id on recipes (brew_machine_id);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_user_grinders_user_id       on user_grinders (user_id);
create index idx_user_brew_machines_user_id  on user_brew_machines (user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table brew_machines      enable row level security;
alter table user_grinders      enable row level security;
alter table user_brew_machines enable row level security;

-- Brew machines: anyone can read; authenticated users can insert
create policy "brew_machines_select" on brew_machines
  for select using (true);

create policy "brew_machines_insert" on brew_machines
  for insert with check (auth.role() = 'authenticated');

-- User grinders: users manage their own
create policy "user_grinders_select" on user_grinders
  for select using (auth.uid() = user_id);

create policy "user_grinders_insert" on user_grinders
  for insert with check (auth.uid() = user_id);

create policy "user_grinders_delete" on user_grinders
  for delete using (auth.uid() = user_id);

-- User brew machines: users manage their own
create policy "user_brew_machines_select" on user_brew_machines
  for select using (auth.uid() = user_id);

create policy "user_brew_machines_insert" on user_brew_machines
  for insert with check (auth.uid() = user_id);

create policy "user_brew_machines_delete" on user_brew_machines
  for delete using (auth.uid() = user_id);
