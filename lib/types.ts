import type { Enums, Tables } from './database.types';

export type BrewMethod = Enums<'brew_method'>;
export type RoastLevel = Enums<'roast_level'>;
export type BurrType = Enums<'burr_type'>;
export type AdjustmentType = Enums<'adjustment_type'>;
export type MachineType = Enums<'machine_type'>;

/**
 * Row shapes come straight from the generated types.
 *
 * They used to be hand-written interfaces alongside the generated file, which
 * is the same drift problem VEL-71 removed from lib/db.ts — a column added by a
 * migration would not appear here until someone remembered to add it, with
 * nothing to catch the gap. Deriving them makes that impossible by
 * construction. Add a column, regenerate, and it is here.
 *
 * Note that `grinders.image_status` and `brew_machines.image_status` are
 * `text` with a CHECK constraint rather than a Postgres enum, so they derive as
 * `string | null` and not as a union. The previous hand-written types claimed a
 * union by pointing at the unrelated `equipment_edit_status` enum, which was
 * never what the column actually held. Tracked separately.
 */
export type Grinder = Tables<'grinders'>;

export type BrewMachine = Tables<'brew_machines'>;

export type Bean = Tables<'beans'>;

export type Recipe = Tables<'recipes'>;

export type RecipeHistory = Tables<'recipe_history'>;

export interface RecipeWithJoins extends Recipe {
  grinder: Pick<Grinder, 'brand' | 'model' | 'verified' | 'burr_type' | 'adjustment_type'>;
  bean: Pick<
    Bean,
    'name' | 'roaster' | 'origin' | 'process' | 'roast_level' | 'tasting_notes'
  > | null;
  brew_machine: Pick<BrewMachine, 'brand' | 'model' | 'machine_type' | 'verified'> | null;
}

export interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  backer_tier: 'monthly' | 'annual' | null;
}

export type RecipeTry = Tables<'recipe_tries'>;

export interface RecipeTryWithAuthor extends RecipeTry {
  profile: Pick<Profile, 'display_name' | 'avatar_url'> | null;
}

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  espresso: 'Espresso Machine',
  super_automatic: 'Super Automatic',
  drip: 'Drip Machine',
  pod: 'Pod Machine',
};

export const BURR_TYPE_LABELS: Record<BurrType, string> = {
  flat: 'Flat',
  conical: 'Conical',
  hybrid: 'Hybrid',
};

export const ADJUSTMENT_TYPE_LABELS: Record<AdjustmentType, string> = {
  stepped: 'Stepped',
  stepless: 'Stepless',
  micro_stepped: 'Micro Stepped',
};

export const BREW_METHOD_LABELS: Record<BrewMethod, string> = {
  espresso: 'Espresso',
  pour_over: 'Pour Over',
  aeropress: 'AeroPress',
  french_press: 'French Press',
  chemex: 'Chemex',
  moka_pot: 'Moka Pot',
  cold_brew: 'Cold Brew',
  drip: 'Drip',
  siphon: 'Siphon',
  turkish: 'Turkish',
  v60: 'V60',
  kalita_wave: 'Kalita Wave',
  clever_dripper: 'Clever Dripper',
  ristretto: 'Ristretto',
  vietnamese_phin: 'Vietnamese Phin',
};

export const BREW_METHOD_DESCRIPTIONS: Record<BrewMethod, string> = {
  espresso:
    'High-pressure extraction producing a concentrated shot with crema. Basis for lattes, cappuccinos, and flat whites.',
  pour_over:
    'Manual hot water poured slowly over grounds in a filter. Highlights clarity, brightness, and delicate flavours.',
  aeropress:
    'Pressure brewed in 1–2 min. Versatile, forgiving, and great for travel — produces a clean, smooth cup.',
  french_press:
    'Full immersion for 4 min with no filter paper. Rich, full-bodied, and slightly textured from fine sediment.',
  chemex:
    'Pour-over with a thick paper filter that removes oils and fines. Exceptionally clean, bright, and tea-like.',
  moka_pot:
    'Stovetop brewer that forces steam through grounds. Strong and bold — not espresso, but espresso-adjacent.',
  cold_brew:
    'Coarse grounds steeped in cold water 12–24 h. Low acidity, naturally sweet, smooth concentrate.',
  drip: 'Automatic hot water over a paper filter. Convenient and consistent — the everyday classic.',
  siphon:
    'Vacuum brewer using vapour pressure and gravity. Theatre-worthy process with a remarkably clean, rounded result.',
  turkish:
    'Unfiltered, finely ground coffee simmered in a cezve. Intensely strong with a thick layer of grounds in the cup.',
  v60: "Hario's conical dripper with spiral ribs for maximum airflow. Rewards precise pouring technique with exceptional clarity.",
  kalita_wave:
    'Flat-bed dripper with three small holes for even extraction. More forgiving than a V60 with a fuller, rounder cup.',
  clever_dripper:
    'Immersion brewer with a valve — steep like french press, drain through a filter for a clean, full-flavoured result.',
  ristretto:
    'A shorter, more restricted espresso pull — typically half the yield at the same dose. Sweeter, more concentrated, less bitter.',
  vietnamese_phin:
    'Small metal filter that drip-brews slowly over 4–5 min. Rich and bold, traditionally served over condensed milk or ice.',
};

export type FeatureRequestStatus = Enums<'feature_request_status'>;

export interface FeatureRequest {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  status: FeatureRequestStatus;
  upvotes: number;
  created_at: string;
}

export const FEATURE_REQUEST_STATUS_LABELS: Record<FeatureRequestStatus, string> = {
  open: 'Open',
  planned: 'Planned',
  done: 'Done',
};

export const ROAST_LEVEL_LABELS: Record<RoastLevel, string> = {
  light: 'Light',
  medium_light: 'Medium Light',
  medium: 'Medium',
  medium_dark: 'Medium Dark',
  dark: 'Dark',
};
