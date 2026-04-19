-- Fix admin RLS policies to use app_metadata (server-controlled) instead of
-- user_metadata (user-editable). user_metadata can be spoofed by any authenticated
-- user via supabase.auth.updateUser(), making it unsafe for security checks.

-- grinder_edits
drop policy "Admins can view grinder edits" on grinder_edits;
create policy "Admins can view grinder edits"
  on grinder_edits for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- machine_edits
drop policy "Admins can view machine edits" on machine_edits;
create policy "Admins can view machine edits"
  on machine_edits for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- support_requests
drop policy "Admins can read support requests" on support_requests;
create policy "Admins can read support requests"
  on support_requests for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

drop policy "Admins can update support requests" on support_requests;
create policy "Admins can update support requests"
  on support_requests for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  with check ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- feature_requests
drop policy "Admins can update feature requests" on feature_requests;
create policy "Admins can update feature requests"
  on feature_requests for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  with check ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- recipes
drop policy "Admins can delete any recipe" on recipes;
create policy "Admins can delete any recipe"
  on recipes for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- reports
drop policy "Admins can read reports" on reports;
create policy "Admins can read reports"
  on reports for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

drop policy "Admins can update reports" on reports;
create policy "Admins can update reports"
  on reports for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  with check ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- admin_push_tokens
drop policy "Admins can upsert own token" on admin_push_tokens;
create policy "Admins can upsert own token"
  on admin_push_tokens for insert to authenticated
  with check (
    user_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

drop policy "Admins can update own token" on admin_push_tokens;
create policy "Admins can update own token"
  on admin_push_tokens for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );
