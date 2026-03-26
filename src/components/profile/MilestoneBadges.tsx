import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface Badge {
  key: string;
  label: string;
  emoji: string;
  earned: boolean;
}

/**
 * Shows milestone badges on the user's profile.
 * Badges are computed from user activity counts.
 */
export default function MilestoneBadges() {
  const { user } = useAuth();

  const { data: badges = [] } = useQuery({
    queryKey: ['milestone-badges', user?.id],
    queryFn: async (): Promise<Badge[]> => {
      if (!user) return [];

      // Fetch counts in parallel
      const [postsRes, tryOnsRes, wardrobeRes, followersRes] = await Promise.all([
        supabase.from('tryon_posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_public', true),
        supabase.from('tryon_posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('clothing_wardrobe').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      ]);

      const publicPosts = postsRes.count ?? 0;
      const totalTryOns = tryOnsRes.count ?? 0;
      const wardrobeItems = wardrobeRes.count ?? 0;
      const followers = followersRes.count ?? 0;

      return [
        { key: 'first_post', label: 'First Post', emoji: '🎉', earned: publicPosts >= 1 },
        { key: 'try_on_5', label: '5 Try-Ons', emoji: '👕', earned: totalTryOns >= 5 },
        { key: 'try_on_10', label: '10 Try-Ons', emoji: '🔥', earned: totalTryOns >= 10 },
        { key: 'try_on_25', label: '25 Try-Ons', emoji: '💎', earned: totalTryOns >= 25 },
        { key: 'wardrobe_10', label: 'Wardrobe Pro', emoji: '👗', earned: wardrobeItems >= 10 },
        { key: 'style_influencer', label: 'Style Influencer', emoji: '⭐', earned: publicPosts >= 10 && followers >= 5 },
        { key: 'community_star', label: 'Community Star', emoji: '🌟', earned: followers >= 10 },
      ];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const earned = badges.filter(b => b.earned);
  if (earned.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Award className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-bold text-foreground">Milestones</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {earned.map((badge, i) => (
          <motion.div
            key={badge.key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20"
          >
            <span className="text-[13px]">{badge.emoji}</span>
            <span className="text-[10px] font-bold text-primary">{badge.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
