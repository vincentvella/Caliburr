-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type brew_method as enum (
  'espresso',
  'pour_over',
  'aeropress',
  'french_press',
  'chemex',
  'moka_pot',
  'cold_brew',
  'drip',
  'siphon',
  'turkish'
);

create type roast_level as enum (
  'light',
  'medium_light',
  'medium',
  'medium_dark',
  'dark'
);

create type burr_type as enum (
  'flat',
  'conical',
  'hybrid'
);

create type adjustment_type as enum (
  'stepped',
  'stepless'
);

-- ============================================================
-- TABLES
-- ============================================================

create table grinders (
  id              uuid primary key default gen_random_uuid(),
  brand           text not null,
  model           text not null,
  burr_type       burr_type,
  adjustment_type adjustment_type,
  verified        boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (brand, model)
);

create table beans (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  roaster     text not null,
  origin      text,
  process     text,
  roast_level roast_level,
  created_at  timestamptz not null default now()
);

create table recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  grinder_id    uuid not null references grinders (id) on delete restrict,
  bean_id       uuid references beans (id) on delete set null,
  brew_method   brew_method not null,
  grind_setting text not null,
  dose_g        numeric(5, 1),
  yield_g       numeric(5, 1),
  brew_time_s   integer,
  water_temp_c  numeric(4, 1),
  ratio         numeric(5, 2),
  roast_date    date,
  roast_level   roast_level,
  notes         text,
  upvotes       integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- GRINDER VERIFICATION (consensus-based)
-- Verified when a grinder reaches 5 unique user submissions
-- ============================================================

create or replace function check_grinder_verification()
returns trigger
language plpgsql
security definer
as $$
declare
  unique_users integer;
begin
  select count(distinct user_id)
    into unique_users
    from recipes
   where grinder_id = new.grinder_id;

  if unique_users >= 5 then
    update grinders set verified = true where id = new.grinder_id;
  end if;

  return new;
end;
$$;

create trigger trg_grinder_verification
after insert on recipes
for each row execute function check_grinder_verification();

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_recipes_updated_at
before update on recipes
for each row execute function set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_recipes_grinder_id  on recipes (grinder_id);
create index idx_recipes_bean_id     on recipes (bean_id);
create index idx_recipes_user_id     on recipes (user_id);
create index idx_recipes_brew_method on recipes (brew_method);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table grinders enable row level security;
alter table beans     enable row level security;
alter table recipes   enable row level security;

-- Grinders: anyone can read; authenticated users can insert
create policy "grinders_select" on grinders
  for select using (true);

create policy "grinders_insert" on grinders
  for insert with check (auth.role() = 'authenticated');

-- Beans: anyone can read; authenticated users can insert
create policy "beans_select" on beans
  for select using (true);

create policy "beans_insert" on beans
  for insert with check (auth.role() = 'authenticated');

-- Recipes: anyone can read; owners can insert/update/delete
create policy "recipes_select" on recipes
  for select using (true);

create policy "recipes_insert" on recipes
  for insert with check (auth.uid() = user_id);

create policy "recipes_update" on recipes
  for update using (auth.uid() = user_id);

create policy "recipes_delete" on recipes
  for delete using (auth.uid() = user_id);
