-- Server-side helpers that replace four client-side queries which were either
-- unbounded or silently truncated. In every case the client was fetching a set
-- whose size grows with the data, then filtering or counting it locally.
--
--   VEL-87  profile stats     fetched every recipe id, then passed them into an
--                             .in() predicate — a URL parameter. At ~250 recipes
--                             that URL exceeds common header limits, the request
--                             fails, and `count ?? 0` swallows it, so the tab
--                             silently reads 0 forever.
--   VEL-78  grinder stats     capped at 200 recipes ordered by upvotes, so the
--                             dial-in median/IQR was computed from a biased
--                             sample once a grinder passed 200 brews.
--   VEL-69  admin user lookup listUsers() returns one page (~100) for `grant`
--                             and caps at 1000 for `search`, so both silently
--                             stop finding real users as the base grows.

-- ── Profile stats ─────────────────────────────────────────────────────────
-- One round-trip instead of "fetch all recipe ids, then count tries against
-- them". security invoker so both counts respect the caller's RLS view;
-- recipes and recipe_tries are both public-read.
create or replace function get_profile_stats(p_user_id uuid)
returns table (recipe_count bigint, tries_received bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from recipes r where r.user_id = p_user_id),
    (select count(*)
       from recipe_tries rt
       join recipes r on r.id = rt.recipe_id
      where r.user_id = p_user_id
        and rt.worked);
$$;

-- ── Grinder dial-in rows ──────────────────────────────────────────────────
-- Returns the FULL population for a grinder, not a top-200 slice, and folds in
-- the worked-try weighting that the client previously did with a second .in()
-- query. Only the three columns the stats actually need, so removing the cap
-- does not blow up the payload — the display list stays paginated separately.
--
-- grind_setting stays text and is parsed client-side: it is free-form by
-- product design, so the median/IQR maths cannot move into SQL without
-- imposing a format the app deliberately does not enforce.
create or replace function get_grinder_stat_rows(p_grinder_id uuid)
returns table (brew_method brew_method, grind_setting text, worked_tries bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select r.brew_method,
         r.grind_setting,
         count(rt.id) filter (where rt.worked) as worked_tries
    from recipes r
    left join recipe_tries rt on rt.recipe_id = r.id
   where r.grinder_id = p_grinder_id
   group by r.id, r.brew_method, r.grind_setting;
$$;

-- ── Admin user lookup ─────────────────────────────────────────────────────
-- supabase-js v2 has no admin.getUserByEmail — the admin API exposes only
-- getUserById, listUsers, createUser, updateUserById and deleteUser. So an
-- email lookup had to page through listUsers, which is what broke. These do it
-- in SQL against the indexed column instead.
--
-- security definer because auth.users is not reachable through PostgREST.
-- Execute is revoked from every client-facing role and granted only to
-- service_role, so these are callable exclusively from the admin edge
-- functions, which already gate on their own admin check.
create or replace function admin_find_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = auth, public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

-- Wildcards are escaped so an admin typing an underscore searches for an
-- underscore rather than a single-character wildcard.
create or replace function admin_search_users(p_query text)
returns table (id uuid, email text, created_at timestamptz, banned_until timestamptz)
language sql
stable
security definer
set search_path = auth, public
as $$
  select u.id, u.email::text, u.created_at, u.banned_until
    from auth.users u
   where u.email ilike '%' ||
         replace(replace(replace(p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%'
   order by u.created_at desc
   limit 20;
$$;

revoke all on function admin_find_user_id_by_email(text) from public, anon, authenticated;
revoke all on function admin_search_users(text) from public, anon, authenticated;
grant execute on function admin_find_user_id_by_email(text) to service_role;
grant execute on function admin_search_users(text) to service_role;
