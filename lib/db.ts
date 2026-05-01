/**
 * Extended Supabase client typed with tables added after the last type generation.
 * Use `db` instead of `supabase` when accessing these tables:
 *   - reports
 *   - profiles
 *   - admin_push_tokens
 *   - recipe_tries
 *
 * When types are regenerated (bunx supabase gen types typescript --local > lib/database.types.ts)
 * these tables will move into the generated types and this file can be simplified.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { supabase } from './supabase';

type ExtendedTables = {
  reports: {
    Row: {
      id: string;
      reporter_id: string | null;
      target_type: string;
      target_id: string;
      reason: string;
      status: string;
      created_at: string;
    };
    Insert: {
      reporter_id?: string | null;
      target_type: string;
      target_id: string;
      reason: string;
      status?: string;
    };
    Update: { status?: string };
    Relationships: [];
  };
  profiles: {
    Row: {
      user_id: string;
      backer_tier: string | null;
      backer_since: string | null;
      display_name: string | null;
      avatar_url: string | null;
      updated_at: string;
    };
    Insert: {
      user_id: string;
      backer_tier?: string | null;
      backer_since?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
      updated_at?: string;
    };
    Update: {
      backer_tier?: string | null;
      backer_since?: string | null;
      display_name?: string | null;
      avatar_url?: string | null;
      updated_at?: string;
    };
    Relationships: [];
  };
  recipe_tries: {
    Row: {
      id: string;
      recipe_id: string;
      user_id: string;
      worked: boolean;
      grind_delta: string | null;
      yield_delta_g: number | null;
      notes: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      recipe_id: string;
      user_id: string;
      worked: boolean;
      grind_delta?: string | null;
      yield_delta_g?: number | null;
      notes?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      worked?: boolean;
      grind_delta?: string | null;
      yield_delta_g?: number | null;
      notes?: string | null;
      updated_at?: string;
    };
    Relationships: [];
  };
  admin_push_tokens: {
    Row: {
      id: string;
      user_id: string;
      token: string;
      platform: string;
      updated_at: string;
    };
    Insert: {
      user_id: string;
      token: string;
      platform: string;
      updated_at?: string;
    };
    Update: { token?: string; platform?: string; updated_at?: string };
    Relationships: [];
  };
};

type ExtendedDatabase = {
  public: {
    Tables: Database['public']['Tables'] & ExtendedTables;
    Views: Database['public']['Views'];
    Functions: Database['public']['Functions'];
    Enums: Database['public']['Enums'];
    CompositeTypes: Record<string, never>;
  };
};

// Cast via unknown — necessary here because SupabaseClient<Database> and
// SupabaseClient<ExtendedDatabase> are not directly compatible via structural subtyping,
// even though ExtendedDatabase extends Database. No runtime cost; purely type-level.
// eslint-disable-next-line local/no-as-unknown-as
export const db = supabase as unknown as SupabaseClient<ExtendedDatabase>;
