-- Per-user upvote tracking; trigger maintains the denormalised count on recipes
CREATE TABLE public.recipe_upvotes (
  recipe_id  uuid NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recipe_id, user_id)
);

ALTER TABLE public.recipe_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_upvotes_select" ON public.recipe_upvotes
  FOR SELECT USING (true);

CREATE POLICY "recipe_upvotes_insert" ON public.recipe_upvotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recipe_upvotes_delete" ON public.recipe_upvotes
  FOR DELETE USING (auth.uid() = user_id);

-- Keep recipes.upvotes in sync
CREATE OR REPLACE FUNCTION public.sync_recipe_upvotes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.recipes SET upvotes = upvotes + 1 WHERE id = NEW.recipe_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.recipes SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.recipe_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recipe_upvotes
AFTER INSERT OR DELETE ON public.recipe_upvotes
FOR EACH ROW EXECUTE FUNCTION public.sync_recipe_upvotes();
