-- Correct grinder range/steps_per_unit values that were seeded inaccurately.
--
-- Baratza Vario+: macro dial is A–H (8 positions), not 10.
-- Comandante C40 MK4: range represents rotations (~4 usable), not 40.
-- 1Zpresso J-Ultra / K-Ultra: ~5 usable rotations, not 45.
-- Kinu M47 Classic: ~4 rotations × ~22 clicks each; correct to match community notation.

update public.grinders
set range_max = 8
where brand = 'Baratza' and model = 'Vario+';

update public.grinders
set range_max = 4
where brand = 'Comandante' and model = 'C40 MK4';

update public.grinders
set range_max = 5
where brand = '1Zpresso' and model in ('J-Ultra', 'K-Ultra');

update public.grinders
set range_max = 4, steps_per_unit = 22
where brand = 'Kinu' and model = 'M47 Classic';
