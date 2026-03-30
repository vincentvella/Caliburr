-- ============================================================
-- SEED USER (anonymous placeholder for seeded recipes)
-- ============================================================

insert into auth.users (
  id,
  email,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  encrypted_password,
  email_confirmed_at,
  role,
  aud
) values (
  '00000000-0000-0000-0000-000000000001',
  'seed@caliburr.coffee',
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  '',
  now(),
  'authenticated',
  'authenticated'
) on conflict (id) do nothing;

-- ============================================================
-- GRINDERS
-- ============================================================

insert into grinders (brand, model, burr_type, adjustment_type, verified) values
  ('Niche', 'Zero', 'conical', 'stepless', true),
  ('1Zpresso', 'JX-Pro', 'conical', 'stepped', true),
  ('Comandante', 'C40 MK4', 'conical', 'stepped', true),
  ('Baratza', 'Encore ESP', 'conical', 'stepped', true),
  ('Baratza', 'Vario+', 'flat', 'stepped', true),
  ('Fellow', 'Ode Gen 2', 'flat', 'stepped', true),
  ('Weber Workshops', 'EG-1', 'flat', 'stepless', true),
  ('Lagom', 'P64', 'flat', 'stepless', true),
  ('Kinu', 'M47 Phoenix', 'conical', 'stepped', true),
  ('Timemore', 'Chestnut C3 Pro', 'conical', 'stepped', true),
  ('Hario', 'Skerton Pro', 'conical', 'stepped', false),
  ('Breville', 'Smart Grinder Pro', 'conical', 'stepped', true)
on conflict (brand, model) do nothing;

-- ============================================================
-- BREW MACHINES
-- ============================================================

insert into brew_machines (brand, model, machine_type, verified) values
  ('La Marzocco', 'Linea Mini', 'espresso', true),
  ('Breville', 'Barista Express', 'espresso', true),
  ('Breville', 'Dual Boiler', 'espresso', true),
  ('ECM', 'Synchronika', 'espresso', true),
  ('Rocket Espresso', 'Appartamento', 'espresso', true),
  ('De''Longhi', 'Dedica Arte', 'espresso', true),
  ('Jura', 'E8', 'super_automatic', true),
  ('De''Longhi', 'Magnifica Evo', 'super_automatic', true),
  ('Technivorm', 'Moccamaster', 'drip', true),
  ('Breville', 'Precision Brewer', 'drip', true),
  ('Nespresso', 'Vertuo Next', 'pod', true),
  ('Nespresso', 'Essenza Mini', 'pod', true)
on conflict (brand, model) do nothing;

-- ============================================================
-- BEANS
-- ============================================================

insert into beans (name, roaster, origin, process, roast_level) values
  ('Ethiopia Yirgacheffe', 'Blue Bottle', 'Ethiopia', 'Washed', 'light'),
  ('Colombia Huila', 'Onyx Coffee Lab', 'Colombia', 'Washed', 'medium_light'),
  ('Guatemala Antigua', 'Intelligentsia', 'Guatemala', 'Washed', 'medium'),
  ('Brazil Cerrado', 'Counter Culture', 'Brazil', 'Natural', 'medium'),
  ('Kenya AA', 'Stumptown', 'Kenya', 'Washed', 'light'),
  ('Panama Geisha', 'George Howell', 'Panama', 'Washed', 'light'),
  ('Sumatra Mandheling', 'Peet''s Coffee', 'Indonesia', 'Wet-Hulled', 'dark'),
  ('Honduras Las Flores', 'Heart Coffee', 'Honduras', 'Natural', 'medium_light'),
  ('Ethiopia Guji', 'Verve Coffee', 'Ethiopia', 'Natural', 'light'),
  ('Costa Rica Tarrazu', 'Equator Coffee', 'Costa Rica', 'Washed', 'medium')
on conflict do nothing;

-- ============================================================
-- RECIPES
-- Linked to grinders by lookup — no hardcoded UUIDs
-- ============================================================

do $$
declare
  niche_zero_id     uuid;
  jx_pro_id         uuid;
  comandante_id     uuid;
  encore_id         uuid;
  ode_id            uuid;
  vario_id          uuid;
  timemore_id       uuid;

  ethiopia_yirg_id  uuid;
  colombia_id       uuid;
  guatemala_id      uuid;
  brazil_id         uuid;
  kenya_id          uuid;
  ethiopia_guji_id  uuid;
  honduras_id       uuid;
  costa_rica_id     uuid;

  -- Seed user — replace with a real user UUID after first sign-up,
  -- or leave as a nil UUID for anonymous seed data display
  seed_user_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  select id into niche_zero_id   from grinders where brand = 'Niche'      and model = 'Zero';
  select id into jx_pro_id       from grinders where brand = '1Zpresso'   and model = 'JX-Pro';
  select id into comandante_id   from grinders where brand = 'Comandante' and model = 'C40 MK4';
  select id into encore_id       from grinders where brand = 'Baratza'    and model = 'Encore ESP';
  select id into ode_id          from grinders where brand = 'Fellow'     and model = 'Ode Gen 2';
  select id into vario_id        from grinders where brand = 'Baratza'    and model = 'Vario+';
  select id into timemore_id     from grinders where brand = 'Timemore'   and model = 'Chestnut C3 Pro';

  select id into ethiopia_yirg_id from beans where name = 'Ethiopia Yirgacheffe';
  select id into colombia_id      from beans where name = 'Colombia Huila';
  select id into guatemala_id     from beans where name = 'Guatemala Antigua';
  select id into brazil_id        from beans where name = 'Brazil Cerrado';
  select id into kenya_id         from beans where name = 'Kenya AA';
  select id into ethiopia_guji_id from beans where name = 'Ethiopia Guji';
  select id into honduras_id      from beans where name = 'Honduras Las Flores';
  select id into costa_rica_id    from beans where name = 'Costa Rica Tarrazu';

  insert into recipes (user_id, grinder_id, bean_id, brew_method, grind_setting, dose_g, yield_g, brew_time_s, water_temp_c, ratio, roast_level, notes, upvotes)
  values
    -- Espresso
    (seed_user_id, niche_zero_id,   ethiopia_yirg_id,  'espresso',   '25',   18.0, 36.0,  28, 93.0, 2.00, 'light',        'Bright and floral. Nudge up a click if sour.', 42),
    (seed_user_id, niche_zero_id,   colombia_id,       'espresso',   '22',   18.0, 38.0,  30, 92.0, 2.11, 'medium_light', 'Caramel sweetness, clean finish.', 31),
    (seed_user_id, vario_id,        brazil_id,         'espresso',   '3B',   18.5, 37.0,  27, 94.0, 2.00, 'medium',       'Chocolatey and smooth. Good milk base.', 28),
    (seed_user_id, encore_id,       guatemala_id,      'espresso',   '8',    17.0, 34.0,  32, 93.0, 2.00, 'medium',       'Nutty, brown sugar. Forgiving on extraction.', 15),

    -- Pour over
    (seed_user_id, comandante_id,   kenya_id,          'pour_over',  '26',   15.0, null,  210, 94.0, 15.0, 'light',       'Bright, juicy, blackcurrant notes. Use 30s bloom.', 37),
    (seed_user_id, jx_pro_id,       ethiopia_yirg_id,  'pour_over',  '3.0',  15.0, null,  195, 93.0, 15.0, 'light',       'Jasmine and bergamot. Long bloom helps.', 29),
    (seed_user_id, niche_zero_id,   ethiopia_guji_id,  'pour_over',  '28',   15.0, null,  200, 93.0, 16.0, 'light',       'Strawberry and wine-like. 4-pour method.', 24),
    (seed_user_id, comandante_id,   honduras_id,       'pour_over',  '24',   15.0, null,  185, 92.0, 15.0, 'medium_light','Stone fruit, honey. Great everyday drinker.', 18),

    -- Aeropress
    (seed_user_id, jx_pro_id,       colombia_id,       'aeropress',  '15',   15.0, 200.0, 120, 85.0, null, 'medium_light','Inverted method, 2min steep. Smooth and rich.', 22),
    (seed_user_id, timemore_id,     ethiopia_guji_id,  'aeropress',  '12',   14.0, 180.0, 90,  80.0, null, 'light',       'Traditional, 1:30 steep. Floral and clean.', 14),

    -- French press
    (seed_user_id, encore_id,       brazil_id,         'french_press','18',  30.0, null,  240, 94.0, 15.0, 'medium',      '4 min steep. Chocolate and nuts, heavy body.', 19),
    (seed_user_id, niche_zero_id,   costa_rica_id,     'french_press','30',  28.0, null,  270, 93.0, 16.0, 'medium',      'Break crust at 4min, decant at 8min.', 11),

    -- Moka pot
    (seed_user_id, encore_id,       guatemala_id,      'moka_pot',   '5',    18.0, null,  null, null, null, 'medium',     'Medium-fine. Low heat, lid open. Stop before splutter.', 16),
    (seed_user_id, timemore_id,     brazil_id,         'moka_pot',   '8',    18.0, null,  null, null, null, 'medium_dark','Classic bittersweet espresso-style shot.', 9)
  ;
end $$;
