-- Seed well-known grinders and espresso machines.
-- verified = true so they appear as read-only community entries.
-- created_by = null since these are system-seeded.

insert into public.grinders (brand, model, burr_type, adjustment_type, steps_per_unit, range_min, range_max, verified)
values
  ('Baratza',          'Encore ESP',          'conical', 'stepped',       null, 1,  40,  true),
  ('Baratza',          'Virtuoso+',            'conical', 'stepped',       null, 1,  40,  true),
  ('Baratza',          'Sette 270Wi',          'conical', 'micro_stepped', 30,   1,  9,   true),
  ('Baratza',          'Vario+',               'flat',    'micro_stepped', 10,   1,  10,  true),
  ('Eureka',           'Mignon Specialita',    'flat',    'stepless',      null, 0,  10,  true),
  ('Eureka',           'Mignon Libra',         'flat',    'stepless',      null, 0,  10,  true),
  ('Eureka',           'Mignon Filtro',        'flat',    'stepless',      null, 0,  10,  true),
  ('Niche',            'Zero',                 'conical', 'stepless',      null, 0,  10,  true),
  ('Niche',            'Duo',                  'conical', 'stepless',      null, 0,  10,  true),
  ('Fellow',           'Ode Gen 2',            'flat',    'stepped',       null, 1,  11,  true),
  ('Fellow',           'Opus',                 'conical', 'stepped',       null, 1,  11,  true),
  ('Comandante',       'C40 MK4',              'conical', 'micro_stepped', 12,   1,  40,  true),
  ('1Zpresso',         'J-Ultra',              'conical', 'micro_stepped', 12,   1,  45,  true),
  ('1Zpresso',         'K-Ultra',              'conical', 'micro_stepped', 12,   1,  45,  true),
  ('1Zpresso',         'Q2 S',                 'conical', 'micro_stepped', 18,   0,  10,  true),
  ('Weber Workshops',  'Key',                  'flat',    'stepless',      null, 0,  10,  true),
  ('DF',               'DF64 Gen 2',           'flat',    'stepless',      null, 0,  10,  true),
  ('DF',               'DF83',                 'flat',    'stepless',      null, 0,  10,  true),
  ('Lagom',            'P64',                  'flat',    'stepless',      null, 0,  10,  true),
  ('Lagom',            'P100',                 'flat',    'stepless',      null, 0,  10,  true),
  ('Kinu',             'M47 Classic',          'conical', 'micro_stepped', 10,   0,  85,  true),
  ('Mahlkonig',        'EK43 S',               'flat',    'stepped',       null, 1,  11,  true),
  ('Rancilio',         'Rocky',                'flat',    'stepped',       null, 1,  50,  true),
  ('Breville',         'Smart Grinder Pro',    'conical', 'stepped',       null, 1,  60,  true),
  ('Lelit',            'Fred PL043',           'flat',    'micro_stepped', 10,   1,  7,   true)
on conflict do nothing;

insert into public.brew_machines (brand, model, machine_type, verified)
values
  ('Breville',        'Bambino Plus',                'espresso',        true),
  ('Breville',        'Barista Express',             'espresso',        true),
  ('Breville',        'Barista Pro',                 'espresso',        true),
  ('Breville',        'Oracle Touch',                'espresso',        true),
  ('Breville',        'Precision Brewer',            'drip',            true),
  ('De''Longhi',      'Dedica Arte EC885',           'espresso',        true),
  ('De''Longhi',      'La Specialista Arte EC9155',  'espresso',        true),
  ('De''Longhi',      'Magnifica Evo',               'super_automatic', true),
  ('De''Longhi',      'Dinamica Plus',               'super_automatic', true),
  ('Rancilio',        'Silvia Pro X',                'espresso',        true),
  ('Rancilio',        'Silvia V6',                   'espresso',        true),
  ('Lelit',           'Bianca V3',                   'espresso',        true),
  ('Lelit',           'Mara X V2',                   'espresso',        true),
  ('ECM',             'Synchronika',                 'espresso',        true),
  ('Profitec',        'Pro 600',                     'espresso',        true),
  ('La Marzocco',     'Linea Mini',                  'espresso',        true),
  ('La Marzocco',     'GS/3',                        'espresso',        true),
  ('Decent Espresso', 'DE1Pro',                      'espresso',        true),
  ('Jura',            'E8',                          'super_automatic', true),
  ('Jura',            'Z10',                         'super_automatic', true),
  ('Philips',         'EP3347 Series 3300',          'super_automatic', true),
  ('Nespresso',       'Vertuo Next',                 'pod',             true),
  ('Nespresso',       'Essenza Mini',                'pod',             true),
  ('Technivorm',      'Moccamaster KBT',             'drip',            true),
  ('Bonavita',        'BV1901TS',                    'drip',            true)
on conflict do nothing;
