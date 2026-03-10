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

/** Trending fits for home page */
export function useTrendingFits(userId: string | undefined) {
  return useQuery({
    queryKey: ['trending-fits', userId],
    queryFn: async () => {
      const TARGET = 6;
      let posts: Array<{
        id: string;
        username: string;
        caption: string | null;
        image_url: string;
        like_count: number;
        created_at: string;
        isLive?: boolean;
      }> = [];

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      if (userId) {
        const { data: livePosts } = await supabase
          .from('tryon_posts')
          .select('id, user_id, caption, result_photo_url, created_at, is_public')
          .eq('is_public', true)
          .neq('user_id', userId)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(TARGET);

        if (livePosts && livePosts.length > 0) {
          const userIds = [...new Set(livePosts.map(p => p.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', userIds);
          const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

          const postIds = livePosts.map(p => p.id);
          const { data: votes } = await supabase
            .from('community_votes')
            .select('post_id')
            .in('post_id', postIds);
          const voteCounts = new Map<string, number>();
          votes?.forEach(v => voteCounts.set(v.post_id, (voteCounts.get(v.post_id) || 0) + 1));

          posts = livePosts
            .map(p => ({
              id: p.id,
              username: nameMap.get(p.user_id) || 'User',
              caption: p.caption,
              image_url: p.result_photo_url,
              like_count: voteCounts.get(p.id) || 0,
              created_at: p.created_at,
              isLive: true,
            }))
            .sort((a, b) => b.like_count - a.like_count);
        }
      }

      if (posts.length < TARGET) {
        const remaining = TARGET - posts.length;
        const { data: seeds } = await supabase
          .from('seed_posts')
          .select('*')
          .eq('is_public', true)
          .order('like_count', { ascending: false })
          .limit(remaining);
        if (seeds) {
          posts = [...posts, ...seeds.map(s => ({ ...s, isLive: false }))];
        }
      }

      return posts;
    },
    staleTime: 2 * 60 * 1000,
  });
}
