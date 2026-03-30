export type BrewMethod =
  | 'espresso'
  | 'pour_over'
  | 'aeropress'
  | 'french_press'
  | 'chemex'
  | 'moka_pot'
  | 'cold_brew'
  | 'drip'
  | 'siphon'
  | 'turkish';

export type RoastLevel =
  | 'light'
  | 'medium_light'
  | 'medium'
  | 'medium_dark'
  | 'dark';

export type BurrType = 'flat' | 'conical' | 'hybrid';
export type AdjustmentType = 'stepped' | 'stepless';
export type MachineType = 'espresso' | 'super_automatic' | 'drip' | 'pod';

export interface Grinder {
  id: string;
  brand: string;
  model: string;
  burr_type: BurrType | null;
  adjustment_type: AdjustmentType | null;
  verified: boolean;
  created_at: string;
}

export interface BrewMachine {
  id: string;
  brand: string;
  model: string;
  machine_type: MachineType;
  verified: boolean;
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

export interface RecipeWithJoins extends Recipe {
  grinder: Pick<Grinder, 'brand' | 'model' | 'verified'>;
  bean: Pick<Bean, 'name' | 'roaster'> | null;
  brew_machine: Pick<BrewMachine, 'brand' | 'model'> | null;
}

export const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  espresso:        'Espresso Machine',
  super_automatic: 'Super Automatic',
  drip:            'Drip Machine',
  pod:             'Pod Machine',
};

export const BREW_METHOD_LABELS: Record<BrewMethod, string> = {
  espresso:    'Espresso',
  pour_over:   'Pour Over',
  aeropress:   'AeroPress',
  french_press:'French Press',
  chemex:      'Chemex',
  moka_pot:    'Moka Pot',
  cold_brew:   'Cold Brew',
  drip:        'Drip',
  siphon:      'Siphon',
  turkish:     'Turkish',
};

export const ROAST_LEVEL_LABELS: Record<RoastLevel, string> = {
  light:       'Light',
  medium_light:'Medium Light',
  medium:      'Medium',
  medium_dark: 'Medium Dark',
  dark:        'Dark',
};
