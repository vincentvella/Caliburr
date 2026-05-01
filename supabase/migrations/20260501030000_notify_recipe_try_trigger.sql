-- Fire the notify-recipe-try edge function on every recipe_tries insert.
-- This is what Supabase's "Database Webhooks" UI builds under the hood;
-- we keep it in a migration so the wiring is reviewable in code.
--
-- The function itself decides whether to actually push (cooldown, self-try,
-- token presence). It's safe to fire on every insert.

create extension if not exists pg_net with schema extensions;

create trigger on_recipe_try_insert
  after insert on recipe_tries
  for each row
  execute function supabase_functions.http_request(
    'https://rmudbcyozoddlsxklxhq.supabase.co/functions/v1/notify-recipe-try',
    'POST',
    '{"Content-Type":"application/json"}',
    '{}',
    '5000'
  );
