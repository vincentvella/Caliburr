alter table profiles add column if not exists stripe_customer_id text;

create index if not exists profiles_stripe_customer_id_idx on profiles (stripe_customer_id)
  where stripe_customer_id is not null;
