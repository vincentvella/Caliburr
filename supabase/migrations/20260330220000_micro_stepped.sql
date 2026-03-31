-- Add micro_stepped variant and per-grinder step resolution
ALTER TYPE public.adjustment_type ADD VALUE IF NOT EXISTS 'micro_stepped';

ALTER TABLE public.grinders
  ADD COLUMN IF NOT EXISTS steps_per_unit integer;

COMMENT ON COLUMN public.grinders.steps_per_unit IS
  'For micro_stepped grinders: number of discrete sub-steps between each whole-number position (e.g. 10 for 1Zpresso JX-Pro). NULL for stepped/stepless.';
