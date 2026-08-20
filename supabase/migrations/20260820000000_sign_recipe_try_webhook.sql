-- Sign the notify-recipe-try webhook.
--
-- The original trigger called supabase_functions.http_request with a static
-- header string, which meant it could only ever send Content-Type. The edge
-- function's secret check was therefore unenforceable: with
-- SUPABASE_WEBHOOK_SECRET unset it skipped auth entirely, and setting it would
-- have started rejecting the trigger's unsigned requests.
--
-- Replace it with a trigger function that reads the shared secret from Vault and
-- sends it as x-supabase-signature. The secret's value lives only in Vault, so
-- it never lands in git. It must already exist under this exact name — see
-- Integrations > Vault > Secrets.
--
-- The body deliberately reproduces the payload shape supabase_functions
-- .http_request produced, since notify-recipe-try reads type/table/record.
--
-- Ordering note: applying this alone changes nothing observable. The deployed
-- function ignores the header until SUPABASE_WEBHOOK_SECRET is set in the edge
-- function secrets, which is the step that actually turns enforcement on.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_recipe_try()
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
   where name = 'SUPABASE_WEBHOOK_SECRET'
   limit 1;

  if webhook_secret is null then
    -- Don't drop the notification: unsigned is exactly today's behaviour, and
    -- the edge function still accepts it until its own secret is set.
    raise warning 'SUPABASE_WEBHOOK_SECRET not found in Vault — sending unsigned';
  else
    request_headers := request_headers
      || jsonb_build_object('x-supabase-signature', webhook_secret);
  end if;

  perform net.http_post(
    url := 'https://rmudbcyozoddlsxklxhq.supabase.co/functions/v1/notify-recipe-try',
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

-- Postgres does not check EXECUTE on trigger functions, so nothing needs this
-- grant; dropping it keeps a security definer function from being callable
-- directly by anyone who finds it.
revoke execute on function public.notify_recipe_try() from public;

drop trigger if exists on_recipe_try_insert on recipe_tries;

create trigger on_recipe_try_insert
  after insert on recipe_tries
  for each row
  execute function public.notify_recipe_try();
