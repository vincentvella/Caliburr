-- Point the recipe-try trigger at a Vault secret that the edge function side can
-- actually read.
--
-- 20260820000000 looked up 'SUPABASE_WEBHOOK_SECRET'. That name is unusable on
-- the other half of the handshake: Supabase reserves the SUPABASE_ prefix for
-- its own injected variables and refuses to set a custom secret with it —
--
--   $ supabase secrets set SUPABASE_WEBHOOK_SECRET=...
--   Env name cannot start with SUPABASE_, skipping: SUPABASE_WEBHOOK_SECRET
--
-- so the function could never have had a value to compare against. This is a
-- forward fix rather than an edit to that migration, which is already applied.
--
-- Only the Vault lookup changes. The trigger still points at this function by
-- name, so it does not need recreating.
--
-- Requires a Vault secret named WEBHOOK_SIGNING_SECRET. Until it exists the
-- function logs a warning and sends unsigned, which is the pre-existing
-- behaviour — notifications keep working either way.

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
   where name = 'WEBHOOK_SIGNING_SECRET'
   limit 1;

  if webhook_secret is null then
    -- Don't drop the notification: unsigned is exactly today's behaviour, and
    -- the edge function still accepts it until its own secret is set.
    raise warning 'WEBHOOK_SIGNING_SECRET not found in Vault — sending unsigned';
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

revoke execute on function public.notify_recipe_try() from public;
