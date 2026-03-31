-- ============================================================
-- MACHINE VERIFICATIONS
-- Community-driven: 5 unique user confirmations → verified
-- ============================================================

create table public.machine_verifications (
  brew_machine_id uuid not null references public.brew_machines (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (brew_machine_id, user_id)
);

alter table public.machine_verifications enable row level security;

create policy "machine_verifications_select" on public.machine_verifications
  for select using (true);

create policy "machine_verifications_insert" on public.machine_verifications
  for insert with check (auth.uid() = user_id);

-- Trigger: verify machine once 5 unique users have confirmed
create or replace function public.check_machine_verification()
returns trigger
language plpgsql
security definer
as $$
declare
  confirmation_count integer;
begin
  select count(*)
    into confirmation_count
    from public.machine_verifications
   where brew_machine_id = new.brew_machine_id;

  if confirmation_count >= 5 then
    update public.brew_machines set verified = true where id = new.brew_machine_id;
  end if;

  return new;
end;
$$;

create trigger trg_machine_verification
after insert on public.machine_verifications
for each row execute function public.check_machine_verification();

-- Allow authenticated users to correct machine details
create policy "brew_machines_update" on public.brew_machines
  for update using (auth.role() = 'authenticated');
