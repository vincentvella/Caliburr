create type feature_request_status as enum ('open', 'planned', 'done');

create table feature_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  title       text not null,
  description text,
  status      feature_request_status not null default 'open',
  upvotes     int not null default 0,
  created_at  timestamptz not null default now()
);

create table feature_request_upvotes (
  request_id uuid not null references feature_requests(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  primary key (request_id, user_id)
);

-- Maintain upvote count via trigger (same pattern as recipe_upvotes)
create or replace function update_feature_request_upvote_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update feature_requests set upvotes = upvotes + 1 where id = new.request_id;
  elsif tg_op = 'DELETE' then
    update feature_requests set upvotes = upvotes - 1 where id = old.request_id;
  end if;
  return null;
end;
$$;

create trigger feature_request_upvotes_count
after insert or delete on feature_request_upvotes
for each row execute function update_feature_request_upvote_count();

-- RLS
alter table feature_requests enable row level security;
alter table feature_request_upvotes enable row level security;

create policy "Anyone can view feature requests"
  on feature_requests for select using (true);

create policy "Authenticated users can submit feature requests"
  on feature_requests for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own open requests"
  on feature_requests for delete to authenticated
  using (auth.uid() = user_id and status = 'open');

create policy "Anyone can view upvotes"
  on feature_request_upvotes for select using (true);

create policy "Authenticated users can upvote"
  on feature_request_upvotes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can remove their own upvote"
  on feature_request_upvotes for delete to authenticated
  using (auth.uid() = user_id);
