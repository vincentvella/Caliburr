-- Called by the delete-account Edge Function before auth.users is deleted.
-- Decrements the denormalized upvotes counter on every recipe the user has
-- upvoted so the counter stays accurate after the recipe_upvotes rows cascade.
create or replace function decrement_upvotes_for_user(p_user_id uuid)
returns void
language sql
security definer
as $$
  update recipes
  set upvotes = greatest(upvotes - 1, 0)
  where id in (
    select recipe_id from recipe_upvotes where user_id = p_user_id
  );
$$;
