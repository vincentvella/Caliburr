-- Grinders are a shared community resource with no individual owner.
-- Any authenticated user may correct specs (brand, model, burr type, etc.).
-- The verified flag is protected separately by the trigger and admin role.
create policy "grinders_update" on grinders
  for update using (auth.role() = 'authenticated');
