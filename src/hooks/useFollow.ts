import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useFollow(targetUserId: string | null) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !targetUserId || user.id === targetUserId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_follows' as any)
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();
      if (!cancelled) setIsFollowing(!!data);
    })();
    return () => { cancelled = true; };
  }, [user, targetUserId]);

  const toggle = useCallback(async () => {
    if (!user || !targetUserId || loading) return;
    setLoading(true);
    if (isFollowing) {
      await supabase
        .from('user_follows' as any)
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);
      setIsFollowing(false);
    } else {
      await supabase
        .from('user_follows' as any)
        .insert({ follower_id: user.id, following_id: targetUserId } as any);
      setIsFollowing(true);
    }
    setLoading(false);
  }, [user, targetUserId, isFollowing, loading]);

  return { isFollowing, loading, toggle };
}

/** Fetch IDs of users the current user follows */
export async function getFollowingIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_follows' as any)
    .select('following_id')
    .eq('follower_id', userId);
  return (data as any[] || []).map((r: any) => r.following_id);
}

/** Fetch follower / following counts for a user */
export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followersRes, followingRes] = await Promise.all([
    supabase.from('user_follows' as any).select('id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('user_follows' as any).select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return {
    followers: (followersRes as any).count || 0,
    following: (followingRes as any).count || 0,
  };
}
