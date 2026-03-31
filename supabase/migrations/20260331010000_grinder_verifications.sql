-- Track who created each piece of equipment so they can't self-verify
ALTER TABLE public.grinders     ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id);
ALTER TABLE public.brew_machines ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id);

-- ============================================================
-- GRINDER VERIFICATIONS
-- Community-driven: 5 unique user confirmations → verified
-- (in addition to the existing recipe-submission path)
-- ============================================================

CREATE TABLE public.grinder_verifications (
  grinder_id uuid NOT NULL REFERENCES public.grinders (id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (grinder_id, user_id)
);

ALTER TABLE public.grinder_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grinder_verifications_select" ON public.grinder_verifications
  FOR SELECT USING (true);

CREATE POLICY "grinder_verifications_insert" ON public.grinder_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger: verify grinder once 5 unique explicit confirmations are recorded
CREATE OR REPLACE FUNCTION public.check_grinder_explicit_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  confirmation_count integer;
BEGIN
  SELECT COUNT(*) INTO confirmation_count
    FROM public.grinder_verifications
   WHERE grinder_id = NEW.grinder_id;

  IF confirmation_count >= 5 THEN
    UPDATE public.grinders SET verified = true WHERE id = NEW.grinder_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grinder_explicit_verification
AFTER INSERT ON public.grinder_verifications
FOR EACH ROW EXECUTE FUNCTION public.check_grinder_explicit_verification();
