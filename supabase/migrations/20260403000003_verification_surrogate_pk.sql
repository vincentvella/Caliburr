-- Replace the composite PK (equipment_id, user_id) on verification tables with
-- a surrogate PK so rows survive account deletion. user_id becomes nullable with
-- ON DELETE SET NULL — the DB anonymises rows automatically when auth.users is
-- deleted, and every verification is preserved as a community signal.
--
-- Postgres treats NULLs as distinct in unique constraints, so multiple
-- anonymised rows for the same equipment are all kept.

-- ── Grinder verifications ─────────────────────────────────────────────────────

ALTER TABLE public.grinder_verifications
  ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.grinder_verifications
  DROP CONSTRAINT grinder_verifications_pkey;

ALTER TABLE public.grinder_verifications
  ADD PRIMARY KEY (id);

ALTER TABLE public.grinder_verifications
  ALTER COLUMN user_id DROP NOT NULL;

-- FK was already dropped in 20260403000002; re-add with ON DELETE SET NULL.
ALTER TABLE public.grinder_verifications
  ADD CONSTRAINT grinder_verifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;

-- Prevent the same live user from verifying the same grinder twice.
-- NULLs are distinct so multiple anonymised rows for the same grinder are fine.
ALTER TABLE public.grinder_verifications
  ADD CONSTRAINT grinder_verifications_unique_live
  UNIQUE (grinder_id, user_id);

-- ── Machine verifications ─────────────────────────────────────────────────────

ALTER TABLE public.machine_verifications
  ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE public.machine_verifications
  DROP CONSTRAINT machine_verifications_pkey;

ALTER TABLE public.machine_verifications
  ADD PRIMARY KEY (id);

ALTER TABLE public.machine_verifications
  ALTER COLUMN user_id DROP NOT NULL;

-- FK was already dropped in 20260403000002; re-add with ON DELETE SET NULL.
ALTER TABLE public.machine_verifications
  ADD CONSTRAINT machine_verifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.machine_verifications
  ADD CONSTRAINT machine_verifications_unique_live
  UNIQUE (brew_machine_id, user_id);

-- ── Clean up ──────────────────────────────────────────────────────────────────

-- The anonymize_verifications_for_user function is no longer needed —
-- ON DELETE SET NULL handles anonymisation automatically.
DROP FUNCTION IF EXISTS anonymize_verifications_for_user(uuid);
