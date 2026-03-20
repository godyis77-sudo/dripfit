import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCart';
import type { Post } from '@/components/community/community-types';

const DEFAULT_COUNTS = { buy_yes: 0, buy_no: 0, keep_shopping: 0, too_tight: 0, perfect: 0, too_loose: 0 };

/**
 * Manages community voting state and handlers, extracted from useCommunityFeed.
 */
export function useVoting(userId: string | undefined, posts: Post[]) {
  const { toast } = useToast();
  const { addToCart, removeFromCart } = useCart();
  const [votes, setVotes] = useState<Record<string, string[]>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<string, number>>>({});

  // Load vote counts when post list changes
  const postIdsKey = posts.map(p => p.id).join(',');
  useEffect(() => {
    if (posts.length === 0) return;
    const loadVoteCounts = async (postIds: string[]) => {
      const { data: allVotes } = await supabase
        .from('community_votes')
        .select('post_id, vote_key, user_id')
        .in('post_id', postIds);
      if (!allVotes) return;
      const counts: Record<string, Record<string, number>> = {};
      const userVotes: Record<string, string[]> = {};
      allVotes.forEach(v => {
        if (!counts[v.post_id]) counts[v.post_id] = { ...DEFAULT_COUNTS };
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
    if (!userId) {
      toast({ title: 'Sign in to vote', description: 'Create a free account to share your opinion.', variant: 'destructive' });
      return;
    }
    const post = posts.find(p => p.id === postId);
    if (post && post.user_id === userId) {
      toast({ title: "Can't vote on your own post" });
      return;
    }

    const currentVotes = votes[postId] || [];
    const isFitVote = ['too_tight', 'perfect', 'too_loose'].includes(key);
    const hasKey = currentVotes.includes(key);
    let newVotes: string[];

    if (isFitVote) {
      const otherFit = currentVotes.filter(v => !['too_tight', 'perfect', 'too_loose'].includes(v));
      if (hasKey) {
        newVotes = otherFit;
      } else {
        // Remove conflicting fit votes in a single query
        const conflicting = currentVotes.filter(v => ['too_tight', 'perfect', 'too_loose'].includes(v));
        if (conflicting.length > 0) {
          await supabase.from('community_votes').delete()
            .eq('post_id', postId).eq('user_id', userId).in('vote_key', conflicting);
        }
        newVotes = [...otherFit, key];
      }
    } else if (key === 'keep_shopping') {
      newVotes = hasKey
        ? currentVotes.filter(v => v !== 'keep_shopping')
        : [...currentVotes, 'keep_shopping'];
    } else {
      const otherBuy = currentVotes.filter(v => !['buy_yes', 'buy_no'].includes(v));
      if (hasKey) {
        newVotes = [...otherBuy];
      } else {
        const conflicting = currentVotes.filter(v => ['buy_yes', 'buy_no'].includes(v));
        if (conflicting.length > 0) {
          await supabase.from('community_votes').delete()
            .eq('post_id', postId).eq('user_id', userId).in('vote_key', conflicting);
        }
        newVotes = [...otherBuy, key];
      }
    }

    setVotes(prev => ({ ...prev, [postId]: newVotes }));
    setVoteCounts(prev => {
      const postCounts = { ...(prev[postId] || { ...DEFAULT_COUNTS }) };
      for (const k of currentVotes) { if (!newVotes.includes(k)) postCounts[k] = Math.max(0, (postCounts[k] || 0) - 1); }
      for (const k of newVotes) { if (!currentVotes.includes(k)) postCounts[k] = (postCounts[k] || 0) + 1; }
      return { ...prev, [postId]: postCounts };
    });

    if (hasKey) {
      await supabase.from('community_votes').delete().eq('post_id', postId).eq('user_id', userId).eq('vote_key', key);
    } else {
      await supabase.from('community_votes').insert({ post_id: postId, user_id: userId, vote_key: key });
    }

    if (key === 'keep_shopping' && post) {
      if (hasKey) {
        removeFromCart(postId);
      } else {
        addToCart({
          post_id: post.id,
          image_url: post.result_photo_url,
          caption: post.caption,
          product_urls: post.product_urls || null,
          clothing_photo_url: post.clothing_photo_url || post.result_photo_url,
        });
      }
    }

    trackEvent('vote_submitted', { vote: key, source: 'fitcheck' });
    trackEvent('fitcheck_voted', { vote: key });
  }, [userId, votes, posts, toast, addToCart, removeFromCart]);

  return { votes, voteCounts, handleVote };
}
