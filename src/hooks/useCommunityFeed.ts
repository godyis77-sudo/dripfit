import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getFollowingIds } from '@/hooks/useFollow';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCart';
import type { Post, SeedPost, Retailer, FilterType, GenderKey } from '@/components/community/community-types';
import { seedToPost, isValidImageUrl } from '@/components/community/community-types';

const PAGE_SIZE = 20;

interface UseCommunityFeedOptions {
  userId?: string;
  filter: FilterType;
  shopGender: GenderKey;
}

async function enrichPosts(data: any[], filter?: string) {
  const userIds = [...new Set(data.map(p => p.user_id))];
  const postIds = data.map(p => p.id);
  const [profilesRes, ratingsRes] = await Promise.all([
    userIds.length > 0 ? supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds) : { data: [] },
    postIds.length > 0 ? supabase.from('tryon_ratings').select('post_id, style_score, color_score, buy_score, suitability_score').in('post_id', postIds) : { data: [] },
  ]);
  const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
  const ratingsByPost = new Map<string, any[]>();
  (ratingsRes.data || []).forEach(r => { if (!ratingsByPost.has(r.post_id)) ratingsByPost.set(r.post_id, []); ratingsByPost.get(r.post_id)!.push(r); });

  let enriched = data.map(p => {
    const pr = ratingsByPost.get(p.id) || [];
    const c = pr.length;
    return { ...p, profile: profileMap.get(p.user_id) || { display_name: 'Anonymous' }, avg_style: c ? pr.reduce((s: number, r: any) => s + r.style_score, 0) / c : 0, avg_color: c ? pr.reduce((s: number, r: any) => s + r.color_score, 0) / c : 0, avg_buy: c ? pr.reduce((s: number, r: any) => s + r.buy_score, 0) / c : 0, avg_suitability: c ? pr.reduce((s: number, r: any) => s + r.suitability_score, 0) / c : 0, rating_count: c };
  });
  if (filter === 'trending') enriched.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
  return enriched;
}

export function useCommunityFeed({ userId, filter, shopGender }: UseCommunityFeedOptions) {
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [votes, setVotes] = useState<Record<string, string[]>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<string, number>>>({});
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followToggles, setFollowToggles] = useState<Record<string, boolean>>({});
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [retailersLoading, setRetailersLoading] = useState(false);
  const [hasScan, setHasScan] = useState(false);

  // Track cached following IDs for similar feed
  const followingIdsRef = useRef(followingIds);
  followingIdsRef.current = followingIds;
  const followingIdsKey = followingIds.join(',');

  // Load following IDs
  useEffect(() => {
    if (!userId) return;
    getFollowingIds(userId).then(ids => {
      setFollowingIds(ids);
      const toggles: Record<string, boolean> = {};
      ids.forEach(id => { toggles[id] = true; });
      setFollowToggles(toggles);
    });
  }, [userId]);

  // ── helpers ──
  const resetPagination = () => { setCursor(null); setHasMore(true); };

  const processBatch = (data: any[]) => {
    if (data.length < PAGE_SIZE) setHasMore(false);
    if (data.length > 0) setCursor(data[data.length - 1].created_at);
  };

  // ── NEW / TRENDING feed ──
  const fetchPosts = useCallback(async (): Promise<Post[]> => {
    resetPagination();
    const { data, error } = await supabase.from('tryon_posts').select('id, user_id, clothing_photo_url, result_photo_url, caption, is_public, created_at, product_urls').eq('is_public', true).order('created_at', { ascending: false }).limit(PAGE_SIZE);
    if (error) { console.error(error); return []; }
    if (!data || data.length === 0) {
      const { data: seeds } = await supabase.from('seed_posts').select('*').eq('is_public', true).order('created_at', { ascending: false });
      if (seeds && seeds.length > 0) {
        const validSeeds = (seeds as SeedPost[]).filter(s => isValidImageUrl(s.image_url));
        const seedPosts = validSeeds.map(seedToPost);
        if (filter === 'trending') seedPosts.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
        setHasMore(false);
        return seedPosts;
      }
      setHasMore(false);
      return [];
    }
    processBatch(data);
    return enrichPosts(data, filter);
  }, [filter]);

  const loadMorePosts = useCallback(async () => {
    if (!cursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    const { data } = await supabase.from('tryon_posts').select('id, user_id, clothing_photo_url, result_photo_url, caption, is_public, created_at, product_urls').eq('is_public', true).order('created_at', { ascending: false }).lt('created_at', cursor).limit(PAGE_SIZE);
    if (!data || data.length === 0) { setHasMore(false); setLoadingMore(false); return; }
    processBatch(data);
    const enriched = await enrichPosts(data, filter);
    setPosts(prev => [...prev, ...enriched]);
    setLoadingMore(false);
  }, [cursor, hasMore, loadingMore, filter]);

  // ── FOLLOWING feed ──
  const fetchFollowingFeed = useCallback(async (): Promise<Post[]> => {
    if (!userId) return [];
    resetPagination();
    const ids = followingIdsRef.current.length > 0 ? followingIdsRef.current : await getFollowingIds(userId);
    if (ids.length === 0) { setHasMore(false); return []; }
    const { data } = await supabase.from('tryon_posts').select('id, user_id, clothing_photo_url, result_photo_url, caption, is_public, created_at, product_urls').eq('is_public', true).in('user_id', ids).order('created_at', { ascending: false }).limit(PAGE_SIZE);
    if (!data || data.length === 0) { setHasMore(false); return []; }
    processBatch(data);
    const userIds = [...new Set(data.map(p => p.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    return data.map(p => ({ ...p, profile: profileMap.get(p.user_id) || { display_name: 'Anonymous' }, rating_count: 0 }));
  }, [userId]);

  const loadMoreFollowing = useCallback(async () => {
    if (!cursor || !hasMore || loadingMore || !userId) return;
    setLoadingMore(true);
    const ids = followingIdsRef.current.length > 0 ? followingIdsRef.current : await getFollowingIds(userId);
    if (ids.length === 0) { setHasMore(false); setLoadingMore(false); return; }
    const { data } = await supabase.from('tryon_posts').select('id, user_id, clothing_photo_url, result_photo_url, caption, is_public, created_at, product_urls').eq('is_public', true).in('user_id', ids).order('created_at', { ascending: false }).lt('created_at', cursor).limit(PAGE_SIZE);
    if (!data || data.length === 0) { setHasMore(false); setLoadingMore(false); return; }
    processBatch(data);
    const userIds = [...new Set(data.map(p => p.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const enriched = data.map(p => ({ ...p, profile: profileMap.get(p.user_id) || { display_name: 'Anonymous' }, rating_count: 0 }));
    setPosts(prev => [...prev, ...enriched]);
    setLoadingMore(false);
  }, [cursor, hasMore, loadingMore, userId]);

  // ── SIMILAR FIT feed ──
  const similarMetaRef = useRef<{ similarUserIds: string[]; scoreMap: Map<string, number>; maxScore: number } | null>(null);

  const fetchSimilarFitPosts = useCallback(async (): Promise<Post[]> => {
    if (!userId) return [];
    resetPagination();

    const { data: profile } = await supabase.from('profiles').select('gender').eq('user_id', userId).single();
    const gender = (profile as any)?.gender || 'unknown';

    const { data: scan } = await supabase.from('body_scans')
      .select('chest_min, chest_max, waist_min, waist_max, hip_min, hip_max, inseam_min, inseam_max, sleeve_min, sleeve_max, bust_min, bust_max')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single();

    if (!scan) { setHasScan(false); setHasMore(false); return []; }
    setHasScan(true);

    const mid = (a: number, b: number) => (a + b) / 2;
    const { data: similarUsers, error: fnError } = await supabase.rpc('get_similar_fit_users', {
      p_user_id: userId, p_gender: gender,
      p_chest_mid: mid(scan.chest_min, scan.chest_max), p_waist_mid: mid(scan.waist_min, scan.waist_max),
      p_hip_mid: mid(scan.hip_min, scan.hip_max), p_inseam_mid: mid(scan.inseam_min, scan.inseam_max),
      p_bust_mid: scan.bust_min && scan.bust_max ? mid(scan.bust_min, scan.bust_max) : null,
      p_sleeve_mid: scan.sleeve_min && scan.sleeve_max ? mid(scan.sleeve_min, scan.sleeve_max) : null,
      p_tolerance: 5.0,
    } as any);

    if (fnError || !similarUsers || (similarUsers as any[]).length === 0) {
      setHasMore(false); return [];
    }

    const maxScore = gender === 'female' ? 12 : 9;
    const qualifiedUsers = (similarUsers as any[]).filter((u: any) => u.match_score >= 4);
    const scoreMap = new Map(qualifiedUsers.map((u: any) => [u.user_id, u.match_score]));
    const similarUserIds = qualifiedUsers.map((u: any) => u.user_id).filter(Boolean) as string[];
    similarMetaRef.current = { similarUserIds, scoreMap, maxScore };

    if (similarUserIds.length === 0) { setHasMore(false); return []; }

    const { data } = await supabase.from('tryon_posts')
      .select('id, user_id, clothing_photo_url, result_photo_url, caption, is_public, created_at, product_urls, clothing_category')
      .eq('is_public', true).in('user_id', similarUserIds).order('created_at', { ascending: false }).limit(PAGE_SIZE);

    if (!data || data.length === 0) { setHasMore(false); return []; }
    processBatch(data);

    const BOTTOM_CATEGORIES = ['bottoms'];
    const uIds = [...new Set(data.map(p => p.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', uIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const enriched: Post[] = data.map(p => {
      const rawScore = scoreMap.get(p.user_id) || 0;
      return {
        ...p, profile: profileMap.get(p.user_id) || { display_name: 'Anonymous' },
        rating_count: 0, match_score: Math.min(Math.round((rawScore / maxScore) * 100), 99),
        is_bottoms: BOTTOM_CATEGORIES.includes((p as any).clothing_category || ''),
      };
    });
    enriched.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    return enriched;
  }, [userId]);

  const loadMoreSimilar = useCallback(async () => {
    if (!cursor || !hasMore || loadingMore || !similarMetaRef.current) return;
    const { similarUserIds, scoreMap, maxScore } = similarMetaRef.current;
    if (similarUserIds.length === 0) { setHasMore(false); return; }
    setLoadingMore(true);
    const { data } = await supabase.from('tryon_posts')
      .select('id, user_id, clothing_photo_url, result_photo_url, caption, is_public, created_at, product_urls, clothing_category')
      .eq('is_public', true).in('user_id', similarUserIds).order('created_at', { ascending: false }).lt('created_at', cursor).limit(PAGE_SIZE);
    if (!data || data.length === 0) { setHasMore(false); setLoadingMore(false); return; }
    processBatch(data);
    const BOTTOM_CATEGORIES = ['bottoms'];
    const uIds = [...new Set(data.map(p => p.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', uIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const enriched: Post[] = data.map(p => {
      const rawScore = scoreMap.get(p.user_id) || 0;
      return {
        ...p, profile: profileMap.get(p.user_id) || { display_name: 'Anonymous' },
        rating_count: 0, match_score: Math.min(Math.round((rawScore / maxScore) * 100), 99),
        is_bottoms: BOTTOM_CATEGORIES.includes((p as any).clothing_category || ''),
      };
    });
    setPosts(prev => [...prev, ...enriched]);
    setLoadingMore(false);
  }, [cursor, hasMore, loadingMore]);

  // ── Retailers ──
  const fetchRetailers = useCallback(async () => {
    setRetailersLoading(true);
    try {
      let query: any = supabase.from('retailers').select('*').eq('is_active', true).order('name');
      if (shopGender !== 'all') query = query.in('gender_focus', [shopGender, 'unisex']);
      const { data, error } = await query;
      if (error) throw error;
      setRetailers((data as unknown as Retailer[]) || []);
    } catch (e) { console.error('Failed to fetch retailers:', e); }
    finally { setRetailersLoading(false); }
  }, [shopGender]);

  // ── loadMore dispatcher ──
  const loadMore = useCallback(() => {
    if (filter === 'following') return loadMoreFollowing();
    if (filter === 'similar') return loadMoreSimilar();
    return loadMorePosts();
  }, [filter, loadMorePosts, loadMoreFollowing, loadMoreSimilar]);

  // ── useQuery for initial feed fetch ──
  const feedQueryFn = useCallback(async (): Promise<Post[]> => {
    if (filter === 'shop') { fetchRetailers(); return []; }
    if (filter === 'following') return fetchFollowingFeed();
    if (filter === 'similar') return fetchSimilarFitPosts();
    return fetchPosts();
  }, [filter, fetchPosts, fetchFollowingFeed, fetchSimilarFitPosts, fetchRetailers]);

  const feedQuery = useQuery({
    queryKey: ['community-feed', filter, shopGender, userId, followingIdsKey],
    queryFn: feedQueryFn,
    refetchOnWindowFocus: false,
  });

  // Sync query results into existing state so the rest of the hook + UI stays unchanged
  useEffect(() => {
    if (feedQuery.data !== undefined) {
      setPosts(feedQuery.data);
    }
  }, [feedQuery.data]);

  useEffect(() => {
    setLoading(feedQuery.isLoading || feedQuery.isFetching);
  }, [feedQuery.isLoading, feedQuery.isFetching]);

  // Load vote counts
  const postIdsKey = posts.map(p => p.id).join(',');
  useEffect(() => {
    if (posts.length === 0) return;
    const loadVoteCounts = async (postIds: string[]) => {
      const { data: allVotes } = await supabase.from('community_votes').select('post_id, vote_key, user_id').in('post_id', postIds);
      if (!allVotes) return;
      const counts: Record<string, Record<string, number>> = {};
      const userVotes: Record<string, string[]> = {};
      allVotes.forEach(v => {
        if (!counts[v.post_id]) counts[v.post_id] = { buy_yes: 0, buy_no: 0, keep_shopping: 0, too_tight: 0, perfect: 0, too_loose: 0 };
        counts[v.post_id][v.vote_key] = (counts[v.post_id][v.vote_key] || 0) + 1;
        if (userId && v.user_id === userId) {
          if (!userVotes[v.post_id]) userVotes[v.post_id] = [];
          userVotes[v.post_id].push(v.vote_key);
        }
      });
      setVoteCounts(prev => ({ ...prev, ...counts }));
      setVotes(prev => ({ ...prev, ...userVotes }));
    };
    loadVoteCounts(posts.map(p => p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postIdsKey, userId]);

  const handleVote = useCallback(async (postId: string, key: string) => {
    if (!userId) { toast({ title: 'Sign in to vote', description: 'Create a free account to share your opinion.', variant: 'destructive' }); return; }
    const currentVotes = votes[postId] || [];
    const isFitVote = ['too_tight', 'perfect', 'too_loose'].includes(key);
    const hasKey = currentVotes.includes(key);

    let newVotes: string[];
    if (isFitVote) {
      const otherFit = currentVotes.filter(v => !['too_tight', 'perfect', 'too_loose'].includes(v));
      if (hasKey) { newVotes = otherFit; }
      else {
        for (const k of currentVotes.filter(v => ['too_tight', 'perfect', 'too_loose'].includes(v))) {
          await supabase.from('community_votes').delete().eq('post_id', postId).eq('user_id', userId).eq('vote_key', k);
        }
        newVotes = [...otherFit, key];
      }
    } else if (key === 'keep_shopping') {
      if (hasKey) {
        newVotes = currentVotes.filter(v => v !== 'keep_shopping');
      } else {
        newVotes = [...currentVotes, 'keep_shopping'];
      }
    } else {
      const otherBuy = currentVotes.filter(v => !['buy_yes', 'buy_no'].includes(v));
      if (hasKey) {
        newVotes = [...otherBuy];
      } else {
        for (const k of currentVotes.filter(v => ['buy_yes', 'buy_no'].includes(v))) {
          await supabase.from('community_votes').delete().eq('post_id', postId).eq('user_id', userId).eq('vote_key', k);
        }
        newVotes = [...otherBuy, key];
      }
    }

    setVotes(prev => ({ ...prev, [postId]: newVotes }));
    setVoteCounts(prev => {
      const postCounts = { ...(prev[postId] || { buy_yes: 0, buy_no: 0, keep_shopping: 0, too_tight: 0, perfect: 0, too_loose: 0 }) };
      for (const k of currentVotes) { if (!newVotes.includes(k)) postCounts[k] = Math.max(0, (postCounts[k] || 0) - 1); }
      for (const k of newVotes) { if (!currentVotes.includes(k)) postCounts[k] = (postCounts[k] || 0) + 1; }
      return { ...prev, [postId]: postCounts };
    });

    if (hasKey) {
      await supabase.from('community_votes').delete().eq('post_id', postId).eq('user_id', userId).eq('vote_key', key);
    } else {
      await supabase.from('community_votes').insert({ post_id: postId, user_id: userId, vote_key: key });
    }

    if (key === 'keep_shopping' && !hasKey) {
      const post = posts.find(p => p.id === postId);
      if (post) {
        addToCart({
          post_id: post.id,
          image_url: post.result_photo_url,
          caption: post.caption,
          product_urls: post.product_urls || null,
          clothing_photo_url: post.clothing_photo_url,
        });
      }
    }

    trackEvent('vote_submitted', { vote: key, source: 'fitcheck' });
    trackEvent('fitcheck_voted', { vote: key });
  }, [userId, votes, posts, toast, addToCart]);

  const handleFollowToggle = useCallback(async (targetUserId: string) => {
    if (!userId) { toast({ title: 'Sign in to follow', variant: 'destructive' }); return; }
    const isCurrentlyFollowing = followToggles[targetUserId];
    setFollowToggles(prev => ({ ...prev, [targetUserId]: !isCurrentlyFollowing }));
    if (isCurrentlyFollowing) {
      await supabase.from('user_follows').delete().eq('follower_id', userId).eq('following_id', targetUserId);
      setFollowingIds(prev => prev.filter(id => id !== targetUserId));
      trackEvent('user_unfollowed');
    } else {
      await supabase.from('user_follows').insert({ follower_id: userId, following_id: targetUserId });
      setFollowingIds(prev => [...prev, targetUserId]);
      trackEvent('user_followed');
    }
    if (filter === 'following') setTimeout(() => fetchFollowingFeed(), 300);
  }, [userId, followToggles, filter, fetchFollowingFeed, toast]);

  const handleDeletePost = useCallback(async (postId: string) => {
    if (!userId) return;
    const confirmed = window.confirm('Delete this post from Style Check? This only removes it from the feed — your try-on and wardrobe are not affected.');
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('tryon_posts').update({ is_public: false, caption: null }).eq('id', postId).eq('user_id', userId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
      trackEvent('fitcheck_post_deleted', { postId });
      toast({ title: 'Removed from Style Check', description: 'Your try-on is still saved in your profile.' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  }, [userId, toast]);

  const handleImageError = useCallback((postId: string) => {
    setFailedImages(prev => new Set(prev).add(postId));
  }, []);

  return {
    posts, loading, loadingMore, hasMore, loadMore,
    votes, voteCounts, followToggles, failedImages,
    retailers, retailersLoading, hasScan,
    handleVote, handleFollowToggle, handleDeletePost, handleImageError,
    fetchPosts, setPosts,
  };
}
