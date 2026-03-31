-- Physical range for stepless grinders (e.g. 0.0 – 7.0 turns on a Niche Zero)
ALTER TABLE public.grinders
  ADD COLUMN IF NOT EXISTS range_min numeric,
  ADD COLUMN IF NOT EXISTS range_max numeric;
