alter table beans
  add column if not exists tasting_notes text[] not null default '{}';
