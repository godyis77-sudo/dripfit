import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWeeklyOutfits } from '@/hooks/useWeeklyOutfits';
import { shuffleArray } from '@/lib/utils';

export type SwipeCardKind = 'outfit' | 'post';

export interface SwipeCard {
  kind: SwipeCardKind;
  id: string;
  imageUrl: string;
  title: string;
  subtitle?: string | null;
  /** Original record for navigation / voting */
  outfitId?: string;
  postId?: string;
  authorName?: string | null;
}

const TOP_POSTS_LIMIT = 100;
const TOP_OUTFITS_LIMIT = 100;

async function fetchTopWeeklyPosts(): Promise<SwipeCard[]> {
  // 90-day window so recent (but not last-7-day) posts still surface in the home swipe.
  const { data, error } = await supabase.rpc('get_trending_posts', {
    p_hours_window: 24 * 90,
    p_limit: TOP_POSTS_LIMIT,
    p_offset: 0,
  });
  if (error) throw error;
  if (!data) return [];

  const userIds = [...new Set((data as any[]).map((p) => p.user_id).filter(Boolean))];
  let nameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.rpc('get_public_profiles', { p_user_ids: userIds });
    nameMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name || 'Anonymous']));
  }

  return (data as any[])
    .filter((p) => p.result_photo_url)
    .map((p) => ({
      kind: 'post' as const,
      id: `post-${p.id}`,
      postId: p.id,
      imageUrl: p.result_photo_url,
      title: p.caption?.trim() || p.clothing_category || 'Style Check',
      subtitle: p.clothing_category && p.clothing_category.toLowerCase() !== 'other' ? p.clothing_category : null,
      authorName: nameMap.get(p.user_id) || 'Anonymous',
    }));
}

/** Interleave outfits and posts: outfit, 2 posts, outfit, 2 posts… */
function interleave(outfits: SwipeCard[], posts: SwipeCard[]): SwipeCard[] {
  const result: SwipeCard[] = [];
  let pi = 0;
  let oi = 0;
  while (oi < outfits.length || pi < posts.length) {
    if (oi < outfits.length) result.push(outfits[oi++]);
    for (let k = 0; k < 2 && pi < posts.length; k++) result.push(posts[pi++]);
  }
  return result;
}

export function useHomeSwipeFeed(gender?: string) {
  const { data: weeklyOutfits = [], isLoading: outfitsLoading } = useWeeklyOutfits(gender);

  const { data: topPosts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['home-swipe-top-posts'],
    queryFn: fetchTopWeeklyPosts,
    staleTime: 5 * 60 * 1000,
  });

  const outfitCards: SwipeCard[] = weeklyOutfits
    .filter((o) => o.hero_image_url)
    .slice(0, TOP_OUTFITS_LIMIT)
    .map((o) => ({
      kind: 'outfit',
      id: `outfit-${o.id}`,
      outfitId: o.id,
      imageUrl: o.hero_image_url!,
      title: o.title,
      subtitle: o.occasion_label,
    }));

  // Shuffle each list once per mount so the home swipe feed never opens with
  // the same first image as This Week's Drip carousel above it.
  const cards = useMemo(
    () => interleave(shuffleArray(outfitCards), shuffleArray(topPosts)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outfitCards.length, topPosts.length],
  );

  return {
    cards,
    isLoading: outfitsLoading || postsLoading,
  };
}
