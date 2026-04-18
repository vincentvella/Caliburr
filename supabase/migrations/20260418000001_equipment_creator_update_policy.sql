-- Allow the creator to update their own equipment, but only while unverified.
-- Once verified, all changes must go through the proposal queue (service role applies approved edits).
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
