-- Correct inaccurate bean seed data found during review.
--
-- Issues fixed:
--   Stumptown "Founder's Blend" → "Trapper Creek" (real product; Indonesian-heavy blend)
--   Intelligentsia "El Diablo" → "House Blend" (real product; El Diablo is not an Intelligentsia blend)
--   Blue Bottle "Kenya Kianda" → "Kenya Thiriku" (Thiriku is a real Murang'a washing station Blue Bottle has featured)
--   Counter Culture "Equilibrium" → "Forty-Six" (real CC espresso blend; Equilibrium is not a CC product)
--   Counter Culture "Hologram" → "Toscano" (real seasonal CC blend; Hologram unverified)
--   Counter Culture "Slow Motion" roast: medium_dark → medium (Slow Motion is a medium roast)
--   Coava "Ethiopia Kuja" → "Ethiopia Hambela" (Hambela is a real origin Coava has sourced; Kuja unverified)
--   Ceremony Coffee "Black Dog" → "Resolute" (Resolute is a real Ceremony blend)
--   Sightglass BHKN roast: medium_dark → medium (BHKN is a medium espresso blend)
--   Segfault (terminal.shop) origin: 'Colombia' → null (terminal.shop describes it as a peaberry but does not specify origin)
--   Cafe Grumpy "Peru Asproagrop" tasting notes: differentiated from Heartbreaker Espresso

update public.beans
set name = 'Trapper Creek', tasting_notes = ARRAY['chocolate', 'earth', 'spice']
where roaster = 'Stumptown' and name = 'Founder''s Blend';

update public.beans
set name = 'House Blend'
where roaster = 'Intelligentsia' and name = 'El Diablo';

update public.beans
set name = 'Kenya Thiriku'
where roaster = 'Blue Bottle' and name = 'Kenya Kianda';

update public.beans
set name = 'Forty-Six', roast_level = 'medium', tasting_notes = ARRAY['chocolate', 'caramel', 'dried fruit']
where roaster = 'Counter Culture' and name = 'Equilibrium';

update public.beans
set name = 'Toscano', roast_level = 'medium_light', tasting_notes = ARRAY['stone fruit', 'citrus', 'brown sugar']
where roaster = 'Counter Culture' and name = 'Hologram';

update public.beans
set roast_level = 'medium'
where roaster = 'Counter Culture' and name = 'Slow Motion';

update public.beans
set name = 'Ethiopia Hambela'
where roaster = 'Coava' and name = 'Ethiopia Kuja';

update public.beans
set name = 'Resolute', tasting_notes = ARRAY['chocolate', 'toffee', 'almond']
where roaster = 'Ceremony Coffee' and name = 'Black Dog';

update public.beans
set roast_level = 'medium'
where roaster = 'Sightglass' and name = 'BHKN Espresso';

update public.beans
set origin = null
where roaster = 'terminal.shop' and name = 'Segfault';

update public.beans
set tasting_notes = ARRAY['chocolate', 'caramel', 'honey']
where roaster = 'Cafe Grumpy' and name = 'Peru Asproagrop';
