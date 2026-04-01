-- Snapshot of a recipe's editable fields before each edit.
-- Only the recipe owner can read their own history.

CREATE TABLE public.recipe_history (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id     uuid        NOT NULL REFERENCES public.recipes (id) ON DELETE CASCADE,
  edited_by     uuid        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  edited_at     timestamptz NOT NULL DEFAULT now(),

  -- Snapshot of all user-editable fields at the time of the edit
  grind_setting text        NOT NULL,
  dose_g        numeric,
  yield_g       numeric,
  brew_time_s   integer,
  water_temp_c  numeric,
  ratio         numeric,
  roast_level   roast_level,
  roast_date    date,
  notes         text,
  bean_id       uuid        REFERENCES public.beans (id) ON DELETE SET NULL,
  brew_machine_id uuid      REFERENCES public.brew_machines (id) ON DELETE SET NULL
);

ALTER TABLE public.recipe_history ENABLE ROW LEVEL SECURITY;

-- Only the recipe owner can view history
CREATE POLICY "recipe_history_select" ON public.recipe_history
  FOR SELECT USING (
    edited_by = auth.uid()
  );

CREATE POLICY "recipe_history_insert" ON public.recipe_history
  FOR INSERT WITH CHECK (edited_by = auth.uid());
