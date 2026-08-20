-- Bring the notify-admins webhooks into code, signed from Vault.
--
-- These five were created through the dashboard's Database Webhooks UI, so they
-- existed only in the database: invisible to code review, and with their HTTP
-- headers stored as a literal string inside each trigger definition. Adding the
-- shared secret there would have written it in plaintext into five trigger
-- definitions readable by anyone who can inspect the schema.
--
-- Replace them with one trigger function that reads the secret from Vault, the
-- same shape as notify_recipe_try (20260820010000). The value stays in Vault and
-- out of both git and the schema.
--
-- The five replaced triggers, as they existed:
--   "Machine Edited"       after insert on public.machine_edits
--   "Grinder Edited"       after insert on public.grinder_edits
--   "New Support Request"  after insert on public.support_requests
--   "New Report"           after insert on public.reports
--   "New Feature Request"  after insert on public.feature_requests
--
-- All were AFTER INSERT FOR EACH ROW with no WHEN clause — the webhooks UI
-- offers only table and event, so there was no condition to preserve. They are
-- renamed to the repo's snake_case convention; the dashboard list is derived
-- from pg_trigger, so it will show the new names.
--
-- The body reproduces the payload shape supabase_functions.http_request
-- produced, since notify-admins reads type/table/record and skips anything that
-- isn't an INSERT.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_admins()
returns trigger
language plpgsql
security definer
-- security definer: the invoking role can't read vault.decrypted_secrets.
-- Pin search_path so the definer rights can't be abused via a shadowed name.
set search_path = public, extensions, vault
as $$
declare
  webhook_secret text;
  request_headers jsonb := '{"Content-Type":"application/json"}'::jsonb;
begin
  select decrypted_secret
    into webhook_secret
    from vault.decrypted_secrets
   where name = 'WEBHOOK_SIGNING_SECRET'
   limit 1;

  if webhook_secret is null then
    -- Don't drop the notification: unsigned matches the previous behaviour, and
    -- the edge function still accepts it until its own secret is set.
    raise warning 'WEBHOOK_SIGNING_SECRET not found in Vault — sending unsigned';
  else
    request_headers := request_headers
      || jsonb_build_object('x-supabase-signature', webhook_secret);
  end if;

  perform net.http_post(
    url := 'https://rmudbcyozoddlsxklxhq.supabase.co/functions/v1/notify-admins',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', null
    ),
    headers := request_headers,
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

revoke execute on function public.notify_admins() from public;

drop trigger if exists "Machine Edited" on public.machine_edits;
drop trigger if exists "Grinder Edited" on public.grinder_edits;
drop trigger if exists "New Support Request" on public.support_requests;
drop trigger if exists "New Report" on public.reports;
drop trigger if exists "New Feature Request" on public.feature_requests;

create trigger on_machine_edit_insert
  after insert on public.machine_edits
  for each row
  execute function public.notify_admins();

create trigger on_grinder_edit_insert
  after insert on public.grinder_edits
  for each row
  execute function public.notify_admins();

create trigger on_support_request_insert
  after insert on public.support_requests
  for each row
  execute function public.notify_admins();

create trigger on_report_insert
  after insert on public.reports
  for each row
  execute function public.notify_admins();

create trigger on_feature_request_insert
  after insert on public.feature_requests
  for each row
  execute function public.notify_admins();
