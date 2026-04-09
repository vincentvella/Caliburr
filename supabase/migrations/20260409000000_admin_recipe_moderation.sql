-- Allow admins to delete any recipe (including anonymised ones where user_id is NULL)
create policy "Admins can delete any recipe"
  on recipes for delete to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
