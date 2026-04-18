-- Replace open authenticated UPDATE policies with creator-only, unverified-only policies.
-- Once equipment is verified it is locked; all changes must go through the
-- grinder_edits / machine_edits proposal queue and be approved by an admin
-- via the service role (which bypasses RLS).
drop policy if exists "grinders_update" on public.grinders;
drop policy if exists "brew_machines_update" on public.brew_machines;

create policy "grinders_update" on public.grinders
  for update using (
    auth.uid() = created_by
    and verified = false
  );

create policy "brew_machines_update" on public.brew_machines
  for update using (
    auth.uid() = created_by
    and verified = false
  );
