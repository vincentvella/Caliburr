-- Make display_name case-insensitively unique. The earlier backfill defaulted
-- display_name to the email handle, which can collide across email providers
-- (vince@gmail.com and vince@outlook.com both become "vince"). Dedupe first
-- by appending a short suffix to all-but-the-oldest collision, then add the
-- unique index.

with collisions as (
  select user_id,
         display_name,
         row_number() over (
           partition by lower(display_name)
           order by updated_at asc, user_id asc
         ) as rn
    from profiles
   where display_name is not null
)
update profiles p
   set display_name = c.display_name || '_' || substr(replace(p.user_id::text, '-', ''), 1, 4)
  from collisions c
 where p.user_id = c.user_id
   and c.rn > 1;

create unique index profiles_display_name_lower_idx
  on profiles (lower(display_name))
  where display_name is not null;
