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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      body_scans: {
        Row: {
          bust_max: number | null
          bust_min: number | null
          chest_max: number
          chest_min: number
          confidence: string
          created_at: string
          front_photo_used: boolean
          height_cm: number
          hip_max: number
          hip_min: number
          id: string
          inseam_max: number
          inseam_min: number
          recommended_size: string | null
          reference_object: string | null
          session_id: string | null
          shoulder_max: number
          shoulder_min: number
          side_photo_used: boolean
          sleeve_max: number | null
          sleeve_min: number | null
          user_id: string | null
          waist_max: number
          waist_min: number
        }
        Insert: {
          bust_max?: number | null
          bust_min?: number | null
          chest_max: number
          chest_min: number
          confidence?: string
          created_at?: string
          front_photo_used?: boolean
          height_cm: number
          hip_max: number
          hip_min: number
          id?: string
          inseam_max: number
          inseam_min: number
          recommended_size?: string | null
          reference_object?: string | null
          session_id?: string | null
          shoulder_max: number
          shoulder_min: number
          side_photo_used?: boolean
          sleeve_max?: number | null
          sleeve_min?: number | null
          user_id?: string | null
          waist_max: number
          waist_min: number
        }
        Update: {
          bust_max?: number | null
          bust_min?: number | null
          chest_max?: number
          chest_min?: number
          confidence?: string
          created_at?: string
          front_photo_used?: boolean
          height_cm?: number
          hip_max?: number
          hip_min?: number
          id?: string
          inseam_max?: number
          inseam_min?: number
          recommended_size?: string | null
          reference_object?: string | null
          session_id?: string | null
          shoulder_max?: number
          shoulder_min?: number
          side_photo_used?: boolean
          sleeve_max?: number | null
          sleeve_min?: number | null
          user_id?: string | null
          waist_max?: number
          waist_min?: number
        }
        Relationships: []
      }
      brand_requests: {
        Row: {
          brand_name: string
          id: string
          requested_at: string | null
          requested_by: string | null
          status: string | null
        }
        Insert: {
          brand_name: string
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Update: {
          brand_name?: string
          id?: string
          requested_at?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      brand_size_charts: {
        Row: {
          brand_name: string
          brand_slug: string
          category: string
          confidence: number | null
          id: string
          is_active: boolean | null
          notes: string | null
          region: string
          scraped_at: string | null
          size_data: Json
          size_system: string
          source_url: string | null
        }
        Insert: {
          brand_name: string
          brand_slug: string
          category: string
          confidence?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          region?: string
          scraped_at?: string | null
          size_data?: Json
          size_system?: string
          source_url?: string | null
        }
        Update: {
          brand_name?: string
          brand_slug?: string
          category?: string
          confidence?: number | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          region?: string
          scraped_at?: string | null
          size_data?: Json
          size_system?: string
          source_url?: string | null
        }
        Relationships: []
      }
      clothing_wardrobe: {
        Row: {
          brand: string | null
          category: string
          created_at: string
          id: string
          image_url: string
          notes: string | null
          product_link: string | null
          retailer: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url: string
          notes?: string | null
          product_link?: string | null
          retailer?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          notes?: string | null
          product_link?: string | null
          retailer?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_votes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
          vote_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
          vote_key: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
          vote_key?: string
        }
        Relationships: []
      }
      fit_feedback: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          item_description: string | null
          outcome: string
          recommended_size: string | null
          retailer: string
          session_id: string | null
          size_worn: string
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          item_description?: string | null
          outcome: string
          recommended_size?: string | null
          retailer: string
          session_id?: string | null
          size_worn: string
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          item_description?: string | null
          outcome?: string
          recommended_size?: string | null
          retailer?: string
          session_id?: string | null
          size_worn?: string
          user_id?: string | null
        }
        Relationships: []
      }
      premium_testimonials: {
        Row: {
          attribution: string
          created_at: string
          id: string
          is_active: boolean
          quote_text: string
          star_rating: number
        }
        Insert: {
          attribution: string
          created_at?: string
          id?: string
          is_active?: boolean
          quote_text: string
          star_rating?: number
        }
        Update: {
          attribution?: string
          created_at?: string
          id?: string
          is_active?: boolean
          quote_text?: string
          star_rating?: number
        }
        Relationships: []
      }
      product_catalog: {
        Row: {
          brand: string
          category: string
          created_at: string
          currency: string | null
          id: string
          image_confidence: number | null
          image_url: string
          is_active: boolean
          name: string
          presentation: string | null
          price_cents: number | null
          product_url: string | null
          retailer: string
          scrape_source: string | null
          scraped_at: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          brand: string
          category: string
          created_at?: string
          currency?: string | null
          id?: string
          image_confidence?: number | null
          image_url: string
          is_active?: boolean
          name: string
          presentation?: string | null
          price_cents?: number | null
          product_url?: string | null
          retailer: string
          scrape_source?: string | null
          scraped_at?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string
          currency?: string | null
          id?: string
          image_confidence?: number | null
          image_url?: string
          is_active?: boolean
          name?: string
          presentation?: string | null
          price_cents?: number | null
          product_url?: string | null
          retailer?: string
          scrape_source?: string | null
          scraped_at?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          instagram_handle: string | null
          scan_confidence: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instagram_handle?: string | null
          scan_confidence?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instagram_handle?: string | null
          scan_confidence?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      retailers: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          website_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          website_url: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          website_url?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          brand: string | null
          category: string | null
          confidence: string | null
          created_at: string
          id: string
          product_image_url: string | null
          product_link: string | null
          retailer: string | null
          session_id: string | null
          size_recommendation: string | null
          user_id: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          confidence?: string | null
          created_at?: string
          id?: string
          product_image_url?: string | null
          product_link?: string | null
          retailer?: string | null
          session_id?: string | null
          size_recommendation?: string | null
          user_id?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          confidence?: string | null
          created_at?: string
          id?: string
          product_image_url?: string | null
          product_link?: string | null
          retailer?: string | null
          session_id?: string | null
          size_recommendation?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seed_posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_public: boolean
          like_count: number
          username: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_public?: boolean
          like_count?: number
          username: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_public?: boolean
          like_count?: number
          username?: string
        }
        Relationships: []
      }
      size_chart_rows: {
        Row: {
          bust_max: number | null
          bust_min: number | null
          chart_id: string
          chest_max: number | null
          chest_min: number | null
          hip_max: number | null
          hip_min: number | null
          id: string
          inseam_max: number | null
          inseam_min: number | null
          shoulder_max: number | null
          shoulder_min: number | null
          size_label: string
          waist_max: number | null
          waist_min: number | null
        }
        Insert: {
          bust_max?: number | null
          bust_min?: number | null
          chart_id: string
          chest_max?: number | null
          chest_min?: number | null
          hip_max?: number | null
          hip_min?: number | null
          id?: string
          inseam_max?: number | null
          inseam_min?: number | null
          shoulder_max?: number | null
          shoulder_min?: number | null
          size_label: string
          waist_max?: number | null
          waist_min?: number | null
        }
        Update: {
          bust_max?: number | null
          bust_min?: number | null
          chart_id?: string
          chest_max?: number | null
          chest_min?: number | null
          hip_max?: number | null
          hip_min?: number | null
          id?: string
          inseam_max?: number | null
          inseam_min?: number | null
          shoulder_max?: number | null
          shoulder_min?: number | null
          size_label?: string
          waist_max?: number | null
          waist_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "size_chart_rows_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "size_charts"
            referencedColumns: ["id"]
          },
        ]
      }
      size_charts: {
        Row: {
          brand: string
          category: string
          created_at: string
          gender: string
          id: string
          retailer: string
          source_url: string | null
          units: string
        }
        Insert: {
          brand: string
          category: string
          created_at?: string
          gender: string
          id?: string
          retailer: string
          source_url?: string | null
          units?: string
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string
          gender?: string
          id?: string
          retailer?: string
          source_url?: string | null
          units?: string
        }
        Relationships: []
      }
      size_recommendations_cache: {
        Row: {
          brand_slug: string
          category: string
          chart_id: string | null
          confidence: number
          created_at: string | null
          expires_at: string | null
          fit_notes: string | null
          fit_status: string
          id: string
          measurements_snapshot: Json
          recommended_size: string
          second_option: string | null
          user_id: string
        }
        Insert: {
          brand_slug: string
          category: string
          chart_id?: string | null
          confidence: number
          created_at?: string | null
          expires_at?: string | null
          fit_notes?: string | null
          fit_status: string
          id?: string
          measurements_snapshot: Json
          recommended_size: string
          second_option?: string | null
          user_id: string
        }
        Update: {
          brand_slug?: string
          category?: string
          chart_id?: string | null
          confidence?: number
          created_at?: string | null
          expires_at?: string | null
          fit_notes?: string | null
          fit_status?: string
          id?: string
          measurements_snapshot?: Json
          recommended_size?: string
          second_option?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "size_recommendations_cache_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "brand_size_charts"
            referencedColumns: ["id"]
          },
        ]
      }
      tryon_posts: {
        Row: {
          caption: string | null
          clothing_photo_url: string
          created_at: string
          id: string
          is_public: boolean
          product_url: string | null
          result_photo_url: string
          user_id: string
          user_photo_url: string
        }
        Insert: {
          caption?: string | null
          clothing_photo_url: string
          created_at?: string
          id?: string
          is_public?: boolean
          product_url?: string | null
          result_photo_url: string
          user_id: string
          user_photo_url: string
        }
        Update: {
          caption?: string | null
          clothing_photo_url?: string
          created_at?: string
          id?: string
          is_public?: boolean
          product_url?: string | null
          result_photo_url?: string
          user_id?: string
          user_photo_url?: string
        }
        Relationships: []
      }
      tryon_ratings: {
        Row: {
          buy_score: number
          color_score: number
          comment: string | null
          created_at: string
          id: string
          post_id: string
          rater_user_id: string
          style_score: number
          suitability_score: number
        }
        Insert: {
          buy_score: number
          color_score: number
          comment?: string | null
          created_at?: string
          id?: string
          post_id: string
          rater_user_id: string
          style_score: number
          suitability_score: number
        }
        Update: {
          buy_score?: number
          color_score?: number
          comment?: string | null
          created_at?: string
          id?: string
          post_id?: string
          rater_user_id?: string
          style_score?: number
          suitability_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "tryon_ratings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tryon_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_retailers: {
        Row: {
          created_at: string
          id: string
          retailer_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          retailer_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          retailer_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          calibration_brand: string | null
          calibration_size: string | null
          created_at: string
          fit_preference: string
          id: string
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          calibration_brand?: string | null
          calibration_size?: string | null
          created_at?: string
          fit_preference?: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          calibration_brand?: string | null
          calibration_size?: string | null
          created_at?: string
          fit_preference?: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferred_brands: {
        Row: {
          brand_name: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          brand_name: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          brand_name?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
