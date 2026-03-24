import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BodyScanResult } from '@/lib/types';

/** Profile info (display name, avatar, etc.) */
export function useProfileInfo(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile-info', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, scan_confidence, instagram_handle')
        .eq('user_id', userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/** User's try-on posts */
export function useTryOnPosts(userId: string | undefined) {
  return useQuery({
    queryKey: ['tryon-posts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tryon_posts')
        .select('id, result_photo_url, clothing_photo_url, caption, is_public, created_at, product_urls')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Latest body scan as BodyScanResult */
export function useLatestScan(userId: string | undefined) {
  return useQuery({
    queryKey: ['latest-scan', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const profile: BodyScanResult = {
        id: data.id,
        date: data.created_at,
        shoulder: { min: data.shoulder_min, max: data.shoulder_max },
        chest: { min: data.chest_min, max: data.chest_max },
        bust: data.bust_min != null && data.bust_max != null && (data.bust_min > 0 || data.bust_max > 0)
          ? { min: data.bust_min, max: data.bust_max } : undefined,
        waist: { min: data.waist_min, max: data.waist_max },
        hips: { min: data.hip_min, max: data.hip_max },
        inseam: { min: data.inseam_min, max: data.inseam_max },
        sleeve: data.sleeve_min != null && data.sleeve_max != null && (data.sleeve_min > 0 || data.sleeve_max > 0)
          ? { min: data.sleeve_min, max: data.sleeve_max } : undefined,
        heightCm: data.height_cm,
        confidence: (data.confidence as 'low' | 'medium' | 'high') || 'medium',
        recommendedSize: data.recommended_size || 'M',
        fitPreference: 'regular',
        alternatives: { sizeDown: '', sizeUp: '' },
        whyLine: '',
      };
      return { profile, createdAt: data.created_at };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Wardrobe items */
export function useWardrobe(userId: string | undefined) {
  return useQuery({
    queryKey: ['wardrobe', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clothing_wardrobe')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Favorite retailers */
export function useFavoriteRetailers(userId: string | undefined) {
  return useQuery({
    queryKey: ['favorite-retailers', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_favorite_retailers')
        .select('retailer_name')
        .eq('user_id', userId!);
      if (error) throw error;
      return data?.map(r => r.retailer_name) ?? [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Saved item count */
export function useSavedItemCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['saved-item-count', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('saved_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Trending fits for home page — full-body model-shot products */
export function useTrendingFits(_userId: string | undefined) {
  return useQuery({
    queryKey: ['trending-fits-catalog'],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_catalog')
        .select('id, brand, name, image_url, product_url, price_cents, category')
        .eq('is_active', true)
        .eq('presentation', 'model_shot')
        .gte('image_confidence', 0.15)
        .not('image_url', 'is', null)
        .order('image_confidence', { ascending: false })
        .limit(30);

      if (!data || data.length === 0) return [];

      // Shuffle and pick 6
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 6).map(p => ({
        id: p.id,
        brand: p.brand,
        name: p.name,
        image_url: p.image_url,
        product_url: p.product_url,
        price_cents: p.price_cents,
        category: p.category,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
