-- Drop the FK constraints on verification user_id columns so rows can be
-- repointed to the nil UUID (00000000-...) which has no auth.users entry.
ALTER TABLE public.grinder_verifications
  DROP CONSTRAINT grinder_verifications_user_id_fkey;

ALTER TABLE public.machine_verifications
  DROP CONSTRAINT machine_verifications_user_id_fkey;

-- Anonymise a deleted user's verification rows to the nil UUID.
-- Where a nil UUID row already exists for the same equipment (another deleted
-- user previously verified it), the duplicate is deleted instead — the
-- verification count was already captured when the trigger fired on INSERT.
CREATE OR REPLACE FUNCTION anonymize_verifications_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Grinder verifications
  UPDATE public.grinder_verifications
  SET user_id = '00000000-0000-0000-0000-000000000000'
  WHERE user_id = p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.grinder_verifications AS existing
      WHERE existing.grinder_id = grinder_verifications.grinder_id
        AND existing.user_id = '00000000-0000-0000-0000-000000000000'
    );

  DELETE FROM public.grinder_verifications WHERE user_id = p_user_id;

  -- Machine verifications
  UPDATE public.machine_verifications
  SET user_id = '00000000-0000-0000-0000-000000000000'
  WHERE user_id = p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.machine_verifications AS existing
      WHERE existing.brew_machine_id = machine_verifications.brew_machine_id
        AND existing.user_id = '00000000-0000-0000-0000-000000000000'
    );

  DELETE FROM public.machine_verifications WHERE user_id = p_user_id;
END;
$$;
