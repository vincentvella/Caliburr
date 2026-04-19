-- Seed 100 well-known coffee beans.
-- Includes terminal.shop roasts + offerings from major specialty roasters.

insert into public.beans (name, roaster, origin, process, roast_level, tasting_notes)
values

  -- ── terminal.shop ────────────────────────────────────────────────────────
  ('Las Cochitas',      'terminal.shop', 'Colombia',  'washed',        'light',       ARRAY['citrus', 'stone fruit', 'complex']),
  ('Segfault',         'terminal.shop', 'Colombia',  'natural',       'medium',      ARRAY['savory', 'sweet', 'brown sugar']),
  ('Dark Mode',        'terminal.shop', 'Brazil',    null,            'dark',        ARRAY['dark chocolate', 'almond']),
  ('404',              'terminal.shop', 'Brazil',    'mountain water','medium_dark', ARRAY['dark chocolate', 'molasses']),

  -- ── Stumptown ────────────────────────────────────────────────────────────
  ('Hair Bender',           'Stumptown', null,        null,      'medium',      ARRAY['chocolate', 'citrus', 'brown sugar']),
  ('Holler Mountain',       'Stumptown', null,        null,      'medium_light',ARRAY['citrus', 'caramel', 'hazelnut']),
  ('Founder''s Blend',      'Stumptown', null,        null,      'medium',      ARRAY['chocolate', 'caramel', 'almond']),
  ('Colombia El Jordon',    'Stumptown', 'Colombia',  'washed',  'light',       ARRAY['red apple', 'caramel', 'honey']),
  ('Ethiopia Duromina',     'Stumptown', 'Ethiopia',  'washed',  'light',       ARRAY['lemon', 'jasmine', 'peach']),

  -- ── Blue Bottle ──────────────────────────────────────────────────────────
  ('Three Africas',         'Blue Bottle', null,      null,      'medium',      ARRAY['citrus', 'stone fruit', 'caramel']),
  ('Giant Steps',           'Blue Bottle', null,      null,      'medium',      ARRAY['chocolate', 'hazelnut', 'brown sugar']),
  ('Hayes Valley Espresso', 'Blue Bottle', null,      null,      'medium_dark', ARRAY['chocolate', 'toffee', 'dried fruit']),
  ('Kenya Kianda',          'Blue Bottle', 'Kenya',   'washed',  'light',       ARRAY['blackcurrant', 'tomato', 'citrus']),
  ('Ethiopia Guji',         'Blue Bottle', 'Ethiopia','natural',  'light',       ARRAY['blueberry', 'jasmine', 'lemon']),

  -- ── Intelligentsia ───────────────────────────────────────────────────────
  ('Black Cat Classic Espresso', 'Intelligentsia', null,       null,     'medium_dark', ARRAY['chocolate', 'caramel', 'stone fruit']),
  ('El Diablo',                  'Intelligentsia', null,       null,     'medium',      ARRAY['chocolate', 'dried fruit', 'almond']),
  ('Yirgacheffe Korate',         'Intelligentsia', 'Ethiopia', 'washed', 'light',       ARRAY['bergamot', 'lemon', 'jasmine']),
  ('Guatemala Los Injertos',     'Intelligentsia', 'Guatemala','washed', 'medium_light',ARRAY['stone fruit', 'brown sugar', 'chocolate']),

  -- ── Counter Culture ──────────────────────────────────────────────────────
  ('Big Trouble',   'Counter Culture', null,      null,     'medium',      ARRAY['chocolate', 'almond', 'brown sugar']),
  ('Fast Forward',  'Counter Culture', null,      null,     'medium_light',ARRAY['floral', 'citrus', 'caramel']),
  ('Apollo',        'Counter Culture', null,      null,     'light',       ARRAY['stone fruit', 'caramel', 'floral']),
  ('Equilibrium',   'Counter Culture', null,      null,     'medium',      ARRAY['chocolate', 'fruit', 'brown sugar']),
  ('Hologram',      'Counter Culture', null,      null,     'light',       ARRAY['tropical fruit', 'citrus', 'honey']),
  ('Slow Motion',   'Counter Culture', null,      null,     'medium_dark', ARRAY['chocolate', 'caramel', 'almond']),

  -- ── La Colombe ───────────────────────────────────────────────────────────
  ('Corsica',       'La Colombe', null,       null,    'medium_dark', ARRAY['dark chocolate', 'dried fruit', 'hazelnut']),
  ('Nizza',         'La Colombe', null,       null,    'medium',      ARRAY['chocolate', 'caramel', 'almond']),
  ('Toulon',        'La Colombe', null,       null,    'dark',        ARRAY['bittersweet chocolate', 'walnut']),
  ('Colombia Huila','La Colombe', 'Colombia', 'washed','medium_light',ARRAY['apple', 'caramel', 'brown sugar']),

  -- ── Verve ────────────────────────────────────────────────────────────────
  ('Street Level',       'Verve', null,       null,    'medium',      ARRAY['chocolate', 'caramel', 'brown sugar']),
  ('Sermon',             'Verve', null,       null,    'medium',      ARRAY['stone fruit', 'chocolate', 'citrus']),
  ('Ethiopia Dimtu Tero','Verve', 'Ethiopia', 'washed','light',       ARRAY['lemon', 'jasmine', 'peach']),
  ('Colombia La Loma',   'Verve', 'Colombia', 'washed','medium_light',ARRAY['apple', 'caramel', 'almond']),

  -- ── Onyx Coffee Lab ──────────────────────────────────────────────────────
  ('Southern Weather',      'Onyx Coffee Lab', null,       null,     'medium',      ARRAY['chocolate', 'caramel', 'berry']),
  ('Geometry',              'Onyx Coffee Lab', null,       null,     'medium_light',ARRAY['tropical fruit', 'caramel', 'citrus']),
  ('Kenya Kagumoini',       'Onyx Coffee Lab', 'Kenya',   'washed', 'light',       ARRAY['blackcurrant', 'citrus', 'brown sugar']),
  ('Ethiopia Kayon Mountain','Onyx Coffee Lab','Ethiopia', 'natural','light',       ARRAY['blueberry', 'strawberry', 'jasmine']),

  -- ── Heart Coffee ─────────────────────────────────────────────────────────
  ('Stereo',            'Heart Coffee', null,       null,    'medium_light',ARRAY['stone fruit', 'citrus', 'caramel']),
  ('Ethiopia Konga',    'Heart Coffee', 'Ethiopia', 'natural','light',      ARRAY['blueberry', 'chocolate', 'floral']),
  ('Colombia El Paraiso','Heart Coffee','Colombia', 'washed', 'light',      ARRAY['citrus', 'apple', 'caramel']),

  -- ── Coava ────────────────────────────────────────────────────────────────
  ('Ethiopia Kuja',   'Coava', 'Ethiopia', 'washed', 'light', ARRAY['blueberry', 'jasmine', 'lemon']),
  ('Colombia Huila',  'Coava', 'Colombia', 'washed', 'light', ARRAY['apple', 'citrus', 'honey']),
  ('Coava Blend',     'Coava', null,       null,     'medium',ARRAY['chocolate', 'caramel', 'hazelnut']),

  -- ── George Howell ────────────────────────────────────────────────────────
  ('Terroir',                   'George Howell', null,          null,    'medium_light',ARRAY['citrus', 'apple', 'caramel']),
  ('Finca Mauritania',          'George Howell', 'El Salvador', 'washed','light',       ARRAY['apricot', 'caramel', 'honey']),
  ('Yirgacheffe Worka',         'George Howell', 'Ethiopia',    'washed','light',       ARRAY['lemon', 'jasmine', 'floral']),

  -- ── Madcap ───────────────────────────────────────────────────────────────
  ('Perennial',                'Madcap', null,       null,    'medium_light',ARRAY['stone fruit', 'chocolate', 'caramel']),
  ('Ethiopia Worka Sakaro',    'Madcap', 'Ethiopia', 'natural','light',      ARRAY['blueberry', 'raspberry', 'chocolate']),
  ('Colombia Finca El Limoncillo','Madcap','Colombia','washed','light',      ARRAY['peach', 'apple', 'honey']),

  -- ── Ritual ───────────────────────────────────────────────────────────────
  ('Brightside',     'Ritual', null,          null,    'medium_light',ARRAY['citrus', 'caramel', 'stone fruit']),
  ('San Cristobal',  'Ritual', 'El Salvador', 'washed','medium',      ARRAY['chocolate', 'brown sugar', 'almond']),
  ('Ethiopia Jarso', 'Ritual', 'Ethiopia',    'natural','light',      ARRAY['blueberry', 'citrus', 'chocolate']),

  -- ── PT's Coffee ──────────────────────────────────────────────────────────
  ('Anniversary Blend',    'PT''s Coffee', null,       null,    'medium',      ARRAY['chocolate', 'caramel', 'brown sugar']),
  ('Colombia Monserrate',  'PT''s Coffee', 'Colombia', 'washed','medium_light',ARRAY['apple', 'caramel', 'citrus']),
  ('Kenya Kiambu AB',      'PT''s Coffee', 'Kenya',    'washed','light',       ARRAY['blackcurrant', 'citrus', 'brown sugar']),

  -- ── 49th Parallel ────────────────────────────────────────────────────────
  ('Epic Espresso',     '49th Parallel', null,    null,    'medium_dark', ARRAY['chocolate', 'hazelnut', 'caramel']),
  ('Old School Espresso','49th Parallel', null,   null,    'medium',      ARRAY['chocolate', 'caramel', 'almond']),
  ('Rwanda Hingakawa',  '49th Parallel', 'Rwanda','washed','medium_light',ARRAY['orange', 'brown sugar', 'caramel']),

  -- ── Phil & Sebastian ─────────────────────────────────────────────────────
  ('Founder''s Blend',        'Phil & Sebastian', null,       null,    'medium',ARRAY['chocolate', 'hazelnut', 'caramel']),
  ('Ethiopia Benti Nenka',    'Phil & Sebastian', 'Ethiopia', 'washed','light', ARRAY['lemon', 'jasmine', 'peach']),
  ('Colombia La Esperanza',   'Phil & Sebastian', 'Colombia', 'washed','light', ARRAY['apple', 'citrus', 'honey']),

  -- ── Olympia Coffee ───────────────────────────────────────────────────────
  ('Olympia Blend',           'Olympia Coffee', null,       null,     'medium',ARRAY['chocolate', 'caramel', 'almond']),
  ('Ethiopia Guji Gololcha',  'Olympia Coffee', 'Ethiopia', 'natural','light', ARRAY['blueberry', 'raspberry', 'jasmine']),
  ('Colombia Huila',          'Olympia Coffee', 'Colombia', 'washed', 'light', ARRAY['apple', 'citrus', 'caramel']),

  -- ── Sightglass ───────────────────────────────────────────────────────────
  ('BHKN Espresso',   'Sightglass', null,       null,    'medium_dark', ARRAY['chocolate', 'toffee', 'almond']),
  ('Owl''s Howl',     'Sightglass', null,       null,    'medium_light',ARRAY['stone fruit', 'citrus', 'caramel']),
  ('Ethiopia Shakiso','Sightglass', 'Ethiopia', 'washed','light',       ARRAY['lemon', 'jasmine', 'tea']),

  -- ── Bird Rock ────────────────────────────────────────────────────────────
  ('El Injerto',            'Bird Rock', 'Guatemala', 'washed','medium_light',ARRAY['citrus', 'stone fruit', 'honey']),
  ('Kenya Kiambu Peaberry', 'Bird Rock', 'Kenya',     'washed','light',       ARRAY['blackcurrant', 'citrus', 'tomato']),
  ('Ethiopia Yirgacheffe',  'Bird Rock', 'Ethiopia',  'washed','light',       ARRAY['lemon', 'floral', 'bergamot']),

  -- ── Joe Coffee ───────────────────────────────────────────────────────────
  ('The Daily',              'Joe Coffee', null,       null,    'medium',      ARRAY['chocolate', 'caramel', 'almond']),
  ('Colombia Huila El Paraiso','Joe Coffee','Colombia','washed','medium_light',ARRAY['apple', 'citrus', 'caramel']),
  ('Ethiopia Idido',         'Joe Coffee', 'Ethiopia', 'washed','light',       ARRAY['jasmine', 'lemon', 'citrus']),

  -- ── Proud Mary ───────────────────────────────────────────────────────────
  ('El Fenomeno',             'Proud Mary', 'Colombia', 'natural','light', ARRAY['tropical fruit', 'citrus', 'honey']),
  ('Ethiopia Bensa Shantawene','Proud Mary','Ethiopia', 'natural','light', ARRAY['blueberry', 'strawberry', 'chocolate']),
  ('Foundation',              'Proud Mary', null,       null,    'medium', ARRAY['chocolate', 'caramel', 'brown sugar']),

  -- ── Passenger Coffee ─────────────────────────────────────────────────────
  ('Ephemera',               'Passenger Coffee', null,       null,    'medium_light',ARRAY['stone fruit', 'caramel', 'citrus']),
  ('Colombia Santa Barbara', 'Passenger Coffee', 'Colombia', 'washed','light',       ARRAY['apple', 'honey', 'caramel']),
  ('Ethiopia Kayon Mountain','Passenger Coffee', 'Ethiopia', 'natural','light',      ARRAY['blueberry', 'jasmine', 'lemon']),

  -- ── Dogwood Coffee ───────────────────────────────────────────────────────
  ('Brazil Santos',              'Dogwood Coffee', 'Brazil',   'natural','medium',ARRAY['chocolate', 'almond', 'caramel']),
  ('Colombia Finca La Esperanza','Dogwood Coffee', 'Colombia', 'washed', 'light', ARRAY['apple', 'citrus', 'honey']),
  ('Ethiopia Shantawene',        'Dogwood Coffee', 'Ethiopia', 'natural','light', ARRAY['blueberry', 'chocolate', 'jasmine']),

  -- ── Ceremony Coffee ──────────────────────────────────────────────────────
  ('Black Dog',           'Ceremony Coffee', null,       null,    'medium_dark', ARRAY['chocolate', 'caramel', 'brown sugar']),
  ('Colombia El Mirador', 'Ceremony Coffee', 'Colombia', 'washed','medium_light',ARRAY['apple', 'citrus', 'caramel']),
  ('Ethiopia Kochere',    'Ceremony Coffee', 'Ethiopia', 'washed','light',       ARRAY['lemon', 'jasmine', 'bergamot']),

  -- ── Chromatic Coffee ─────────────────────────────────────────────────────
  ('Brazil Cerrado',     'Chromatic Coffee', 'Brazil',   'natural','medium',ARRAY['chocolate', 'almond', 'brown sugar']),
  ('Ethiopia Shakiso',   'Chromatic Coffee', 'Ethiopia', 'natural','light', ARRAY['blueberry', 'tropical fruit', 'jasmine']),

  -- ── Equator Coffees ──────────────────────────────────────────────────────
  ('Mayan Blend',  'Equator Coffees', null,    null,    'medium',      ARRAY['chocolate', 'caramel', 'brown sugar']),
  ('Tigerwong',    'Equator Coffees', 'Myanmar','washed','medium_light',ARRAY['citrus', 'stone fruit', 'honey']),

  -- ── Brandywine Coffee ────────────────────────────────────────────────────
  ('Ethiopia Bule Natural',  'Brandywine Coffee', 'Ethiopia', 'natural','light',ARRAY['strawberry', 'blueberry', 'chocolate']),
  ('Colombia El Paraiso',    'Brandywine Coffee', 'Colombia', 'washed', 'light',ARRAY['apple', 'peach', 'caramel']),

  -- ── Cafe Grumpy ──────────────────────────────────────────────────────────
  ('Heartbreaker Espresso', 'Cafe Grumpy', null,    null,    'medium_dark', ARRAY['chocolate', 'caramel', 'almond']),
  ('Peru Asproagrop',       'Cafe Grumpy', 'Peru',  'washed','medium_light',ARRAY['chocolate', 'caramel', 'almond']),

  -- ── Panther Coffee ───────────────────────────────────────────────────────
  ('Panther Blend',   'Panther Coffee', null,       null,     'medium',ARRAY['chocolate', 'caramel', 'citrus']),
  ('Ethiopia Uraga',  'Panther Coffee', 'Ethiopia', 'natural','light', ARRAY['blueberry', 'tropical fruit', 'floral']),

  -- ── Toby''s Estate ───────────────────────────────────────────────────────
  ('Balmain Blend',         'Toby''s Estate', null,               null,    'medium',ARRAY['chocolate', 'caramel', 'almond']),
  ('Papua New Guinea Goroka','Toby''s Estate','Papua New Guinea',  'washed','medium',ARRAY['chocolate', 'earth', 'brown sugar']),

  -- ── Go Get Em Tiger ──────────────────────────────────────────────────────
  ('Colombia La Palma y El Tucan','Go Get Em Tiger','Colombia', 'washed','light',ARRAY['citrus', 'stone fruit', 'honey']),
  ('Ethiopia Duromina',           'Go Get Em Tiger','Ethiopia', 'washed','light',ARRAY['lemon', 'jasmine', 'bergamot']),

  -- ── Drip Coffee Roasters ─────────────────────────────────────────────────
  ('House Blend',         'Drip Coffee Roasters', null,       null,    'medium',ARRAY['chocolate', 'caramel', 'hazelnut']),
  ('Colombia La Palma',   'Drip Coffee Roasters', 'Colombia', 'washed','light', ARRAY['apple', 'citrus', 'honey'])

on conflict do nothing;
