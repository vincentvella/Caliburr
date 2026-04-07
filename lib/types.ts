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
  bean: Pick<Bean, 'name' | 'roaster' | 'origin' | 'process' | 'roast_level'> | null;
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
