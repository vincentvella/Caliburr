-- Allow users to mark one machine as their default for recipe pre-selection
ALTER TABLE public.user_brew_machines
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- Allow users to update their own rows (to toggle is_default)
CREATE POLICY "user_brew_machines_update" ON public.user_brew_machines
  FOR UPDATE USING (auth.uid() = user_id);
