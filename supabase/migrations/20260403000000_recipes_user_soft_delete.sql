-- Change recipes.user_id to nullable with ON DELETE SET NULL so that
-- deleting a user's auth account anonymises their recipes rather than
-- removing them from the community pool.

ALTER TABLE public.recipes
  DROP CONSTRAINT recipes_user_id_fkey;

ALTER TABLE public.recipes
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;
