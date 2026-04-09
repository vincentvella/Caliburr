-- Allow admins to read and update support requests
create policy "Admins can read support requests"
  on support_requests for select to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

create policy "Admins can update support requests"
  on support_requests for update to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  with check ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- Allow admins to update feature request status
create policy "Admins can update feature requests"
  on feature_requests for update to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  with check ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);
