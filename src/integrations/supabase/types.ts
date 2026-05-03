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
      access_codes: {
        Row: {
          allocated_to: string | null
          claimed_at: string | null
          code: string
          created_at: string
          is_used: boolean
          used_by_email: string | null
        }
        Insert: {
          allocated_to?: string | null
          claimed_at?: string | null
          code: string
          created_at?: string
          is_used?: boolean
          used_by_email?: string | null
        }
        Update: {
          allocated_to?: string | null
          claimed_at?: string | null
          code?: string
          created_at?: string
          is_used?: boolean
          used_by_email?: string | null
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_provider: string | null
          created_at: string
          destination_url: string
          id: string
          monetization_mode: string
          retailer: string
          retailer_used: string | null
          session_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          affiliate_provider?: string | null
          created_at?: string
          destination_url: string
          id?: string
          monetization_mode?: string
          retailer: string
          retailer_used?: string | null
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          affiliate_provider?: string | null
          created_at?: string
          destination_url?: string
          id?: string
          monetization_mode?: string
          retailer?: string
          retailer_used?: string | null
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      background_categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_seasonal: boolean | null
          name: string
          season_end: string | null
          season_start: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_seasonal?: boolean | null
          name: string
          season_end?: string | null
          season_start?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_seasonal?: boolean | null
          name?: string
          season_end?: string | null
          season_start?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      backgrounds: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          name: string
          photographer: string | null
          source: string | null
          source_id: string | null
          storage_path: string
          tags: string[] | null
          thumbnail_path: string | null
          usage_count: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name: string
          photographer?: string | null
          source?: string | null
          source_id?: string | null
          storage_path: string
          tags?: string[] | null
          thumbnail_path?: string | null
          usage_count?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          name?: string
          photographer?: string | null
          source?: string | null
          source_id?: string | null
          storage_path?: string
          tags?: string[] | null
          thumbnail_path?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "backgrounds_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "background_categories"
            referencedColumns: ["id"]
          },
        ]
      }
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
          gender: string
          id: string
          is_active: boolean | null
          notes: string | null
          region: string
          scraped_at: string | null
          size_data: Json
          size_system: string
          size_type: string
          source_url: string | null
        }
        Insert: {
          brand_name: string
          brand_slug: string
          category: string
          confidence?: number | null
          gender?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          region?: string
          scraped_at?: string | null
          size_data?: Json
          size_system?: string
          size_type?: string
          source_url?: string | null
        }
        Update: {
          brand_name?: string
          brand_slug?: string
          category?: string
          confidence?: number | null
          gender?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          region?: string
          scraped_at?: string | null
          size_data?: Json
          size_system?: string
          size_type?: string
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
          is_liked: boolean
          is_saved: boolean
          notes: string | null
          product_link: string | null
          retailer: string | null
          source_post_id: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url: string
          is_liked?: boolean
          is_saved?: boolean
          notes?: string | null
          product_link?: string | null
          retailer?: string | null
          source_post_id?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url?: string
          is_liked?: boolean
          is_saved?: boolean
          notes?: string | null
          product_link?: string | null
          retailer?: string | null
          source_post_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "fk_community_votes_post"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tryon_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_commissions: {
        Row: {
          amount_cents: number
          approved_at: string | null
          created_at: string
          creator_id: string
          currency: string
          id: string
          month_key: string
          notes: string | null
          paid_at: string | null
          referee_id: string
          referral_id: string | null
          status: string
          tier_label: string
        }
        Insert: {
          amount_cents?: number
          approved_at?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          id?: string
          month_key: string
          notes?: string | null
          paid_at?: string | null
          referee_id: string
          referral_id?: string | null
          status?: string
          tier_label?: string
        }
        Update: {
          amount_cents?: number
          approved_at?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          id?: string
          month_key?: string
          notes?: string | null
          paid_at?: string | null
          referee_id?: string
          referral_id?: string | null
          status?: string
          tier_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
      guest_sessions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          guest_uuid: string
          id: string
          migrated_to_user: string | null
          session_data: Json | null
          tryon_count: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          guest_uuid: string
          id?: string
          migrated_to_user?: string | null
          session_data?: Json | null
          tryon_count?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          guest_uuid?: string
          id?: string
          migrated_to_user?: string | null
          session_data?: Json | null
          tryon_count?: number | null
        }
        Relationships: []
      }
      outfit_editorial_templates: {
        Row: {
          background_prompt: string
          color_grade: string | null
          created_at: string
          id: string
          is_active: boolean
          model_prompt: string
          mood: string | null
          occasion: string
          season: string | null
        }
        Insert: {
          background_prompt: string
          color_grade?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          model_prompt: string
          mood?: string | null
          occasion: string
          season?: string | null
        }
        Update: {
          background_prompt?: string
          color_grade?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          model_prompt?: string
          mood?: string | null
          occasion?: string
          season?: string | null
        }
        Relationships: []
      }
      outfit_items: {
        Row: {
          created_at: string
          id: string
          outfit_id: string
          slot: string
          sort_order: number
          wardrobe_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          outfit_id: string
          slot?: string
          sort_order?: number
          wardrobe_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          outfit_id?: string
          slot?: string
          sort_order?: number
          wardrobe_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_items_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outfit_items_wardrobe_item_id_fkey"
            columns: ["wardrobe_item_id"]
            isOneToOne: false
            referencedRelation: "clothing_wardrobe"
            referencedColumns: ["id"]
          },
        ]
      }
      outfits: {
        Row: {
          cover_image_url: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      partnership_leads: {
        Row: {
          company_name: string
          created_at: string
          email: string
          id: string
          message: string | null
          return_rate: string | null
          role: string
          source: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          return_rate?: string | null
          role: string
          source?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          return_rate?: string | null
          role?: string
          source?: string | null
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount_cents: number
          creator_id: string
          currency: string
          id: string
          notes: string | null
          payout_email: string | null
          payout_method: string | null
          processed_at: string | null
          requested_at: string
          status: string
        }
        Insert: {
          amount_cents: number
          creator_id: string
          currency?: string
          id?: string
          notes?: string | null
          payout_email?: string | null
          payout_method?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          amount_cents?: number
          creator_id?: string
          currency?: string
          id?: string
          notes?: string | null
          payout_email?: string | null
          payout_method?: string | null
          processed_at?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "tryon_posts"
            referencedColumns: ["id"]
          },
        ]
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
      price_drop_notifications: {
        Row: {
          created_at: string
          drop_percent: number
          id: string
          is_read: boolean
          new_price_cents: number
          old_price_cents: number
          user_id: string
          watch_id: string
        }
        Insert: {
          created_at?: string
          drop_percent: number
          id?: string
          is_read?: boolean
          new_price_cents: number
          old_price_cents: number
          user_id: string
          watch_id: string
        }
        Update: {
          created_at?: string
          drop_percent?: number
          id?: string
          is_read?: boolean
          new_price_cents?: number
          old_price_cents?: number
          user_id?: string
          watch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_drop_notifications_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "price_watches"
            referencedColumns: ["id"]
          },
        ]
      }
      price_watches: {
        Row: {
          brand: string | null
          created_at: string
          currency: string
          current_price_cents: number
          id: string
          last_checked_at: string | null
          lowest_price_cents: number
          original_price_cents: number
          product_id: string | null
          product_name: string | null
          product_url: string | null
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          currency?: string
          current_price_cents: number
          id?: string
          last_checked_at?: string | null
          lowest_price_cents: number
          original_price_cents: number
          product_id?: string | null
          product_name?: string | null
          product_url?: string | null
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          currency?: string
          current_price_cents?: number
          id?: string
          last_checked_at?: string | null
          lowest_price_cents?: number
          original_price_cents?: number
          product_id?: string | null
          product_name?: string | null
          product_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_watches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      product_catalog: {
        Row: {
          additional_images: string[] | null
          brand: string
          category: string
          created_at: string
          currency: string | null
          description: string | null
          fabric_composition: string[] | null
          fit_profile: string[] | null
          gender: string | null
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
          style_genre: string | null
          tags: string[] | null
          tryon_ready: boolean | null
          updated_at: string
        }
        Insert: {
          additional_images?: string[] | null
          brand: string
          category: string
          created_at?: string
          currency?: string | null
          description?: string | null
          fabric_composition?: string[] | null
          fit_profile?: string[] | null
          gender?: string | null
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
          style_genre?: string | null
          tags?: string[] | null
          tryon_ready?: boolean | null
          updated_at?: string
        }
        Update: {
          additional_images?: string[] | null
          brand?: string
          category?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          fabric_composition?: string[] | null
          fit_profile?: string[] | null
          gender?: string | null
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
          style_genre?: string | null
          tags?: string[] | null
          tryon_ready?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          instagram_handle: string | null
          preferred_shoe_size: string | null
          referral_code: string | null
          referral_credits: number
          referred_by: string | null
          scan_confidence: number | null
          shopping_region: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          instagram_handle?: string | null
          preferred_shoe_size?: string | null
          referral_code?: string | null
          referral_credits?: number
          referred_by?: string | null
          scan_confidence?: number | null
          shopping_region?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          instagram_handle?: string | null
          preferred_shoe_size?: string | null
          referral_code?: string | null
          referral_credits?: number
          referred_by?: string | null
          scan_confidence?: number | null
          shopping_region?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          bonus_tryons: number
          code: string
          created_at: string
          creator_id: string
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
        }
        Insert: {
          bonus_tryons?: number
          code: string
          created_at?: string
          creator_id: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
        }
        Update: {
          bonus_tryons?: number
          code?: string
          created_at?: string
          creator_id?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_granted: boolean | null
          created_at: string | null
          id: string
          referee_id: string
          referrer_id: string
        }
        Insert: {
          bonus_granted?: boolean | null
          created_at?: string | null
          id?: string
          referee_id: string
          referrer_id: string
        }
        Update: {
          bonus_granted?: boolean | null
          created_at?: string | null
          id?: string
          referee_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      retailers: {
        Row: {
          category: string
          created_at: string
          gender_focus: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          website_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          gender_focus?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          website_url: string
        }
        Update: {
          category?: string
          created_at?: string
          gender_focus?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          website_url?: string
        }
        Relationships: []
      }
      saved_composites: {
        Row: {
          background_id: string | null
          background_source: string | null
          created_at: string | null
          id: string
          shared: boolean | null
          storage_path: string
          tryon_result_id: string | null
          user_id: string
        }
        Insert: {
          background_id?: string | null
          background_source?: string | null
          created_at?: string | null
          id?: string
          shared?: boolean | null
          storage_path: string
          tryon_result_id?: string | null
          user_id: string
        }
        Update: {
          background_id?: string | null
          background_source?: string | null
          created_at?: string | null
          id?: string
          shared?: boolean | null
          storage_path?: string
          tryon_result_id?: string | null
          user_id?: string
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
      scrape_runs: {
        Row: {
          batch_number: number
          completed_at: string | null
          created_at: string
          id: string
          post_process_at: string
          status: string
          total_jobs: number
        }
        Insert: {
          batch_number?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          post_process_at?: string
          status?: string
          total_jobs?: number
        }
        Update: {
          batch_number?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          post_process_at?: string
          status?: string
          total_jobs?: number
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
          height_max: number | null
          height_min: number | null
          hip_max: number | null
          hip_min: number | null
          id: string
          inseam_max: number | null
          inseam_min: number | null
          shoulder_max: number | null
          shoulder_min: number | null
          size_label: string
          sleeve_max: number | null
          sleeve_min: number | null
          waist_max: number | null
          waist_min: number | null
        }
        Insert: {
          bust_max?: number | null
          bust_min?: number | null
          chart_id: string
          chest_max?: number | null
          chest_min?: number | null
          height_max?: number | null
          height_min?: number | null
          hip_max?: number | null
          hip_min?: number | null
          id?: string
          inseam_max?: number | null
          inseam_min?: number | null
          shoulder_max?: number | null
          shoulder_min?: number | null
          size_label: string
          sleeve_max?: number | null
          sleeve_min?: number | null
          waist_max?: number | null
          waist_min?: number | null
        }
        Update: {
          bust_max?: number | null
          bust_min?: number | null
          chart_id?: string
          chest_max?: number | null
          chest_min?: number | null
          height_max?: number | null
          height_min?: number | null
          hip_max?: number | null
          hip_min?: number | null
          id?: string
          inseam_max?: number | null
          inseam_min?: number | null
          shoulder_max?: number | null
          shoulder_min?: number | null
          size_label?: string
          sleeve_max?: number | null
          sleeve_min?: number | null
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
          fit_preference: string
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
          fit_preference?: string
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
          fit_preference?: string
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tryon_attempts: {
        Row: {
          background_source: string | null
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          guest_uuid: string | null
          id: string
          item_type: string | null
          latency_ms: number | null
          started_at: string
          status: string
          user_id: string | null
          user_tier: string
        }
        Insert: {
          background_source?: string | null
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          guest_uuid?: string | null
          id?: string
          item_type?: string | null
          latency_ms?: number | null
          started_at?: string
          status?: string
          user_id?: string | null
          user_tier?: string
        }
        Update: {
          background_source?: string | null
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          guest_uuid?: string | null
          id?: string
          item_type?: string | null
          latency_ms?: number | null
          started_at?: string
          status?: string
          user_id?: string | null
          user_tier?: string
        }
        Relationships: []
      }
      tryon_posts: {
        Row: {
          caption: string | null
          clothing_category: string
          clothing_photo_url: string
          created_at: string
          id: string
          is_public: boolean
          moderation_status: string
          product_urls: string[] | null
          result_photo_url: string
          user_id: string
          user_photo_url: string
        }
        Insert: {
          caption?: string | null
          clothing_category?: string
          clothing_photo_url: string
          created_at?: string
          id?: string
          is_public?: boolean
          moderation_status?: string
          product_urls?: string[] | null
          result_photo_url: string
          user_id: string
          user_photo_url: string
        }
        Update: {
          caption?: string | null
          clothing_category?: string
          clothing_photo_url?: string
          created_at?: string
          id?: string
          is_public?: boolean
          moderation_status?: string
          product_urls?: string[] | null
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
      tryon_usage: {
        Row: {
          count: number
          daily_key: string
          month_key: string
          user_id: string
        }
        Insert: {
          count?: number
          daily_key?: string
          month_key: string
          user_id: string
        }
        Update: {
          count?: number
          daily_key?: string
          month_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_backgrounds: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          storage_path: string
          thumbnail_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          storage_path: string
          thumbnail_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          storage_path?: string
          thumbnail_path?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          current_period_end: string | null
          is_active: boolean | null
          plan_type: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          current_period_end?: string | null
          is_active?: boolean | null
          plan_type?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          current_period_end?: string | null
          is_active?: boolean | null
          plan_type?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      weekly_outfit_items: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string | null
          currency: string | null
          id: string
          image_url: string | null
          outfit_id: string
          position: number | null
          price_cents: number | null
          product_id: string | null
          product_name: string
          product_url: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          image_url?: string | null
          outfit_id: string
          position?: number | null
          price_cents?: number | null
          product_id?: string | null
          product_name: string
          product_url?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          image_url?: string | null
          outfit_id?: string
          position?: number | null
          price_cents?: number | null
          product_id?: string | null
          product_name?: string
          product_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_outfit_items_outfit_id_fkey"
            columns: ["outfit_id"]
            isOneToOne: false
            referencedRelation: "weekly_outfits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_outfit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_outfits: {
        Row: {
          created_at: string | null
          description: string | null
          gender: string | null
          hero_image_url: string | null
          id: string
          is_active: boolean | null
          is_hero: boolean | null
          occasion: string
          occasion_emoji: string | null
          occasion_label: string
          season: string | null
          sort_order: number | null
          title: string
          trend_signals: Json | null
          week_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          gender?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          is_hero?: boolean | null
          occasion: string
          occasion_emoji?: string | null
          occasion_label: string
          season?: string | null
          sort_order?: number | null
          title: string
          trend_signals?: Json | null
          week_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          gender?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          is_hero?: boolean | null
          occasion?: string
          occasion_emoji?: string | null
          occasion_label?: string
          season?: string | null
          sort_order?: number | null
          title?: string
          trend_signals?: Json | null
          week_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_founder_code: {
        Args: { p_code: string; p_email: string }
        Returns: boolean
      }
      cleanup_expired_guest_sessions: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_creator_month_count: {
        Args: { p_creator_id: string; p_month_key: string }
        Returns: number
      }
      get_filtered_catalog: {
        Args: {
          p_brand?: string
          p_categories?: string[]
          p_fit_profile?: string
          p_gender?: string
          p_genre?: string
          p_limit?: number
          p_min_confidence?: number
          p_offset?: number
          p_presentation?: string
          p_price_max_cents?: number
          p_price_min_cents?: number
          p_retailer?: string
        }
        Returns: {
          additional_images: string[] | null
          brand: string
          category: string
          created_at: string
          currency: string | null
          description: string | null
          fabric_composition: string[] | null
          fit_profile: string[] | null
          gender: string | null
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
          style_genre: string | null
          tags: string[] | null
          tryon_ready: boolean | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "product_catalog"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_fit_recommended_products: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          category: string
          clothing_photo_url: string
          engagement_count: number
          product_url: string
        }[]
      }
      get_public_profile_by_name: {
        Args: { p_display_name: string }
        Returns: {
          avatar_url: string
          display_name: string
          instagram_handle: string
          user_id: string
        }[]
      }
      get_public_profiles: {
        Args: { p_user_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      get_similar_fit_users: {
        Args: {
          p_bust_mid?: number
          p_chest_mid: number
          p_gender: string
          p_hip_mid: number
          p_inseam_mid: number
          p_sleeve_mid?: number
          p_tolerance?: number
          p_user_id: string
          p_waist_mid: number
        }
        Returns: {
          match_score: number
          user_id: string
        }[]
      }
      get_trending_posts: {
        Args: { p_hours_window?: number; p_limit?: number; p_offset?: number }
        Returns: {
          caption: string
          clothing_category: string
          clothing_photo_url: string
          created_at: string
          id: string
          is_public: boolean
          product_urls: string[]
          result_photo_url: string
          trending_score: number
          user_id: string
        }[]
      }
      get_tryon_funnel_metrics: { Args: { p_days?: number }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_referral_credits: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      increment_tryon_usage: {
        Args: { p_month_key: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_weekly_outfit_category: {
        Args: { input_category: string }
        Returns: string
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      update_own_profile:
        | {
            Args: {
              p_avatar_url?: string
              p_display_name?: string
              p_gender?: string
              p_instagram_handle?: string
              p_shopping_region?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_avatar_url?: string
              p_display_name?: string
              p_gender?: string
              p_instagram_handle?: string
              p_preferred_shoe_size?: string
              p_shopping_region?: string
            }
            Returns: undefined
          }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "creator" | "founder"
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
    Enums: {
      app_role: ["admin", "moderator", "user", "creator", "founder"],
    },
  },
} as const
