import type { Enums } from './database.types';

export type BrewMethod = Enums<'brew_method'>;
export type RoastLevel = Enums<'roast_level'>;
export type BurrType = Enums<'burr_type'>;
export type AdjustmentType = Enums<'adjustment_type'>;
export type MachineType = Enums<'machine_type'>;

export type ImageStatus = 'pending' | 'approved' | 'rejected';

export interface Grinder {
  id: string;
  brand: string;
  model: string;
  burr_type: BurrType | null;
  adjustment_type: AdjustmentType | null;
  steps_per_unit: number | null;
  range_min: number | null;
  range_max: number | null;
  verified: boolean;
  image_url: string | null;
  image_status: ImageStatus | null;
  created_by: string | null;
  created_at: string;
}

export interface BrewMachine {
  id: string;
  brand: string;
  model: string;
  machine_type: MachineType;
  verified: boolean;
  image_url: string | null;
  image_status: ImageStatus | null;
  created_by: string | null;
  created_at: string;
}

export interface Bean {
  id: string;
  name: string;
  roaster: string;
  origin: string | null;
  process: string | null;
  roast_level: RoastLevel | null;
  tasting_notes: string[];
  created_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  grinder_id: string;
  bean_id: string | null;
  brew_method: BrewMethod;
  grind_setting: string;
  dose_g: number | null;
  yield_g: number | null;
  brew_time_s: number | null;
  water_temp_c: number | null;
  ratio: number | null;
  brew_machine_id: string | null;
  roast_date: string | null;
  roast_level: RoastLevel | null;
  notes: string | null;
  upvotes: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeHistory {
  id: string;
  recipe_id: string;
  edited_by: string;
  edited_at: string;
  grind_setting: string;
  dose_g: number | null;
  yield_g: number | null;
  brew_time_s: number | null;
  water_temp_c: number | null;
  ratio: number | null;
  roast_level: RoastLevel | null;
  roast_date: string | null;
  notes: string | null;
  bean_id: string | null;
  brew_machine_id: string | null;
}

export interface RecipeWithJoins extends Recipe {
  grinder: Pick<Grinder, 'brand' | 'model' | 'verified' | 'burr_type' | 'adjustment_type'>;
  bean: Pick<Bean, 'name' | 'roaster' | 'origin' | 'process' | 'roast_level' | 'tasting_notes'> | null;
  brew_machine: Pick<BrewMachine, 'brand' | 'model' | 'machine_type' | 'verified'> | null;
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
  espresso: 'High-pressure extraction producing a concentrated shot with crema. Basis for lattes, cappuccinos, and flat whites.',
  pour_over: 'Manual hot water poured slowly over grounds in a filter. Highlights clarity, brightness, and delicate flavours.',
  aeropress: 'Pressure brewed in 1–2 min. Versatile, forgiving, and great for travel — produces a clean, smooth cup.',
  french_press: 'Full immersion for 4 min with no filter paper. Rich, full-bodied, and slightly textured from fine sediment.',
  chemex: 'Pour-over with a thick paper filter that removes oils and fines. Exceptionally clean, bright, and tea-like.',
  moka_pot: 'Stovetop brewer that forces steam through grounds. Strong and bold — not espresso, but espresso-adjacent.',
  cold_brew: 'Coarse grounds steeped in cold water 12–24 h. Low acidity, naturally sweet, smooth concentrate.',
  drip: 'Automatic hot water over a paper filter. Convenient and consistent — the everyday classic.',
  siphon: 'Vacuum brewer using vapour pressure and gravity. Theatre-worthy process with a remarkably clean, rounded result.',
  turkish: 'Unfiltered, finely ground coffee simmered in a cezve. Intensely strong with a thick layer of grounds in the cup.',
  v60: "Hario's conical dripper with spiral ribs for maximum airflow. Rewards precise pouring technique with exceptional clarity.",
  kalita_wave: 'Flat-bed dripper with three small holes for even extraction. More forgiving than a V60 with a fuller, rounder cup.',
  clever_dripper: 'Immersion brewer with a valve — steep like french press, drain through a filter for a clean, full-flavoured result.',
  ristretto: 'A shorter, more restricted espresso pull — typically half the yield at the same dose. Sweeter, more concentrated, less bitter.',
  vietnamese_phin: 'Small metal filter that drip-brews slowly over 4–5 min. Rich and bold, traditionally served over condensed milk or ice.',
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
