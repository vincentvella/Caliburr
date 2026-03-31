ALTER TABLE public.user_grinders
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE POLICY "user_grinders_update" ON public.user_grinders
  FOR UPDATE USING (auth.uid() = user_id);
