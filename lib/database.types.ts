export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      beans: {
        Row: {
          created_at: string
          id: string
          name: string
          origin: string | null
          process: string | null
          roast_level: Database["public"]["Enums"]["roast_level"] | null
          roaster: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          origin?: string | null
          process?: string | null
          roast_level?: Database["public"]["Enums"]["roast_level"] | null
          roaster: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          origin?: string | null
          process?: string | null
          roast_level?: Database["public"]["Enums"]["roast_level"] | null
          roaster?: string
        }
        Relationships: []
      }
      brew_machines: {
        Row: {
          brand: string
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          machine_type: Database["public"]["Enums"]["machine_type"]
          model: string
          verified: boolean
        }
        Insert: {
          brand: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          machine_type: Database["public"]["Enums"]["machine_type"]
          model: string
          verified?: boolean
        }
        Update: {
          brand?: string
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          machine_type?: Database["public"]["Enums"]["machine_type"]
          model?: string
          verified?: boolean
        }
        Relationships: []
      }
      grinder_verifications: {
        Row: {
          created_at: string
          grinder_id: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          grinder_id: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          grinder_id?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grinder_verifications_grinder_id_fkey"
            columns: ["grinder_id"]
            isOneToOne: false
            referencedRelation: "grinders"
            referencedColumns: ["id"]
          },
        ]
      }
      grinders: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["adjustment_type"] | null
          brand: string
          burr_type: Database["public"]["Enums"]["burr_type"] | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          model: string
          range_max: number | null
          range_min: number | null
          steps_per_unit: number | null
          verified: boolean
        }
        Insert: {
          adjustment_type?:
            | Database["public"]["Enums"]["adjustment_type"]
            | null
          brand: string
          burr_type?: Database["public"]["Enums"]["burr_type"] | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          model: string
          range_max?: number | null
          range_min?: number | null
          steps_per_unit?: number | null
          verified?: boolean
        }
        Update: {
          adjustment_type?:
            | Database["public"]["Enums"]["adjustment_type"]
            | null
          brand?: string
          burr_type?: Database["public"]["Enums"]["burr_type"] | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          model?: string
          range_max?: number | null
          range_min?: number | null
          steps_per_unit?: number | null
          verified?: boolean
        }
        Relationships: []
      }
      machine_verifications: {
        Row: {
          brew_machine_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          brew_machine_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          brew_machine_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "machine_verifications_brew_machine_id_fkey"
            columns: ["brew_machine_id"]
            isOneToOne: false
            referencedRelation: "brew_machines"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_history: {
        Row: {
          bean_id: string | null
          brew_machine_id: string | null
          brew_time_s: number | null
          dose_g: number | null
          edited_at: string
          edited_by: string
          grind_setting: string
          id: string
          notes: string | null
          ratio: number | null
          recipe_id: string
          roast_date: string | null
          roast_level: Database["public"]["Enums"]["roast_level"] | null
          water_temp_c: number | null
          yield_g: number | null
        }
        Insert: {
          bean_id?: string | null
          brew_machine_id?: string | null
          brew_time_s?: number | null
          dose_g?: number | null
          edited_at?: string
          edited_by: string
          grind_setting: string
          id?: string
          notes?: string | null
          ratio?: number | null
          recipe_id: string
          roast_date?: string | null
          roast_level?: Database["public"]["Enums"]["roast_level"] | null
          water_temp_c?: number | null
          yield_g?: number | null
        }
        Update: {
          bean_id?: string | null
          brew_machine_id?: string | null
          brew_time_s?: number | null
          dose_g?: number | null
          edited_at?: string
          edited_by?: string
          grind_setting?: string
          id?: string
          notes?: string | null
          ratio?: number | null
          recipe_id?: string
          roast_date?: string | null
          roast_level?: Database["public"]["Enums"]["roast_level"] | null
          water_temp_c?: number | null
          yield_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_history_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_history_brew_machine_id_fkey"
            columns: ["brew_machine_id"]
            isOneToOne: false
            referencedRelation: "brew_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_history_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_upvotes: {
        Row: {
          created_at: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_upvotes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          bean_id: string | null
          brew_machine_id: string | null
          brew_method: Database["public"]["Enums"]["brew_method"]
          brew_time_s: number | null
          created_at: string
          dose_g: number | null
          grind_setting: string
          grinder_id: string
          id: string
          notes: string | null
          ratio: number | null
          roast_date: string | null
          roast_level: Database["public"]["Enums"]["roast_level"] | null
          updated_at: string
          upvotes: number
          user_id: string | null
          water_temp_c: number | null
          yield_g: number | null
        }
        Insert: {
          bean_id?: string | null
          brew_machine_id?: string | null
          brew_method: Database["public"]["Enums"]["brew_method"]
          brew_time_s?: number | null
          created_at?: string
          dose_g?: number | null
          grind_setting: string
          grinder_id: string
          id?: string
          notes?: string | null
          ratio?: number | null
          roast_date?: string | null
          roast_level?: Database["public"]["Enums"]["roast_level"] | null
          updated_at?: string
          upvotes?: number
          user_id?: string | null
          water_temp_c?: number | null
          yield_g?: number | null
        }
        Update: {
          bean_id?: string | null
          brew_machine_id?: string | null
          brew_method?: Database["public"]["Enums"]["brew_method"]
          brew_time_s?: number | null
          created_at?: string
          dose_g?: number | null
          grind_setting?: string
          grinder_id?: string
          id?: string
          notes?: string | null
          ratio?: number | null
          roast_date?: string | null
          roast_level?: Database["public"]["Enums"]["roast_level"] | null
          updated_at?: string
          upvotes?: number
          user_id?: string | null
          water_temp_c?: number | null
          yield_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_bean_id_fkey"
            columns: ["bean_id"]
            isOneToOne: false
            referencedRelation: "beans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_brew_machine_id_fkey"
            columns: ["brew_machine_id"]
            isOneToOne: false
            referencedRelation: "brew_machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_grinder_id_fkey"
            columns: ["grinder_id"]
            isOneToOne: false
            referencedRelation: "grinders"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_brew_machines: {
        Row: {
          brew_machine_id: string
          created_at: string
          is_default: boolean
          user_id: string
        }
        Insert: {
          brew_machine_id: string
          created_at?: string
          is_default?: boolean
          user_id: string
        }
        Update: {
          brew_machine_id?: string
          created_at?: string
          is_default?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_brew_machines_brew_machine_id_fkey"
            columns: ["brew_machine_id"]
            isOneToOne: false
            referencedRelation: "brew_machines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_grinders: {
        Row: {
          created_at: string
          grinder_id: string
          is_default: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          grinder_id: string
          is_default?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          grinder_id?: string
          is_default?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_grinders_grinder_id_fkey"
            columns: ["grinder_id"]
            isOneToOne: false
            referencedRelation: "grinders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_upvotes_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      adjustment_type: "stepped" | "stepless" | "micro_stepped"
      brew_method:
        | "espresso"
        | "pour_over"
        | "aeropress"
        | "french_press"
        | "chemex"
        | "moka_pot"
        | "cold_brew"
        | "drip"
        | "siphon"
        | "turkish"
      burr_type: "flat" | "conical" | "hybrid"
      machine_type: "espresso" | "super_automatic" | "drip" | "pod"
      roast_level: "light" | "medium_light" | "medium" | "medium_dark" | "dark"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      adjustment_type: ["stepped", "stepless", "micro_stepped"],
      brew_method: [
        "espresso",
        "pour_over",
        "aeropress",
        "french_press",
        "chemex",
        "moka_pot",
        "cold_brew",
        "drip",
        "siphon",
        "turkish",
      ],
      burr_type: ["flat", "conical", "hybrid"],
      machine_type: ["espresso", "super_automatic", "drip", "pod"],
      roast_level: ["light", "medium_light", "medium", "medium_dark", "dark"],
    },
  },
} as const
