-- Fix mutable search_path on all security-definer and trigger functions.
-- Without SET search_path, a malicious user could shadow public schema objects.

create or replace function public.check_grinder_verification()
returns trigger
language plpgsql
security definer
set search_path = public
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.check_machine_verification()
returns trigger
language plpgsql
security definer
set search_path = public
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

create or replace function public.check_grinder_explicit_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmation_count integer;
begin
  select count(*) into confirmation_count
    from public.grinder_verifications
   where grinder_id = new.grinder_id;

  if confirmation_count >= 5 then
    update public.grinders set verified = true where id = new.grinder_id;
  end if;

  return new;
end;
$$;

create or replace function public.sync_recipe_upvotes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.recipes set upvotes = upvotes + 1 where id = new.recipe_id;
  elsif tg_op = 'DELETE' then
    update public.recipes set upvotes = greatest(0, upvotes - 1) where id = old.recipe_id;
  end if;
  return null;
end;
$$;

create or replace function public.decrement_upvotes_for_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update recipes
  set upvotes = greatest(upvotes - 1, 0)
  where id in (
    select recipe_id from recipe_upvotes where user_id = p_user_id
  );
$$;

create or replace function public.update_feature_request_upvote_count()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update feature_requests set upvotes = upvotes + 1 where id = new.request_id;
  elsif tg_op = 'DELETE' then
    update feature_requests set upvotes = upvotes - 1 where id = old.request_id;
  end if;
  return null;
end;
$$;

-- Drop the broad SELECT policy on the equipment-images bucket.
-- The bucket is public=true so objects are served by CDN URL without RLS;
-- this policy only enabled full directory listing via the Storage API.
drop policy if exists "Public read equipment images" on storage.objects;
