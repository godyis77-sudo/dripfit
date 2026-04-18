import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import SwipeFeedCard from '@/components/home/SwipeFeedCard';
import type { SwipeCard } from '@/hooks/useHomeSwipeFeed';
import type { Post } from './community-types';
import { isValidImageUrl } from './community-types';
import { trackEvent } from '@/lib/analytics';
import { TYPE } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface CommunitySwipeStackProps {
  posts: Post[];
  loading: boolean;
  votes: Record<string, string[]>;
  voteCounts: Record<string, Record<string, number>>;
  failedImages: Set<string>;
  onVote: (postId: string, voteKey: string) => void | Promise<void>;
  onOpenDetail: (post: Post) => void;
}

/**
 * Tinder-style swipe stack for the Community feed "Swipe" tab.
 * Reuses SwipeFeedCard so behavior matches the home Drop card exactly.
 */
export default function CommunitySwipeStack({
  posts,
  loading,
  votes,
  voteCounts,
  failedImages,
  onVote,
  onOpenDetail,
}: CommunitySwipeStackProps) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  // Map Post -> SwipeCard
  const cards: SwipeCard[] = useMemo(() => {
    return posts
      .filter((p) => isValidImageUrl(p.result_photo_url) && !failedImages.has(p.id))
      .map<SwipeCard>((p) => ({
        id: `post-${p.id}`,
        kind: 'post',
        imageUrl: p.result_photo_url,
        title: p.caption || 'Style Check',
        subtitle: p.clothing_category || undefined,
        postId: p.id,
        authorName: p.profile?.display_name || undefined,
      }));
  }, [posts, failedImages]);

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  // Swipe is browse-only: track analytics and advance, but do NOT mutate
  // votes or cart. Voting/shopping happens from the full-screen detail sheet.
  const handleCop = useCallback(
    (card: SwipeCard) => {
      trackEvent('style_check_swipe_cop', { postId: card.postId });
      advance();
    },
    [advance],
  );

  const handleDrop = useCallback(
    (card: SwipeCard) => {
      trackEvent('style_check_swipe_drop', { postId: card.postId });
      advance();
    },
    [advance],
  );

  const handleTap = useCallback(
    (card: SwipeCard) => {
      const post = posts.find((p) => p.id === card.postId);
      if (post) onOpenDetail(post);
    },
    [posts, onOpenDetail],
  );

  // Loading skeleton
  if (loading && cards.length === 0) {
    return <div className="w-full aspect-[3/4] rounded-2xl skeleton-gold" />;
  }

  // Empty
  if (!loading && cards.length === 0) {
    return (
      <div className="w-full aspect-[3/4] rounded-2xl glass-dark border border-white/8 flex flex-col items-center justify-center text-center px-6">
        <Flame className="h-8 w-8 text-primary mb-3" />
        <p className={cn(TYPE.headlineSm, 'text-white mb-1')}>No posts yet</p>
        <p className={cn(TYPE.body, 'text-muted-foreground text-[12px]')}>
          Check back soon for new looks
        </p>
      </div>
    );
  }

  // End of stack
  if (index >= cards.length) {
    return (
      <div className="w-full aspect-[3/4] rounded-2xl glass-dark border border-white/8 flex flex-col items-center justify-center text-center px-6">
        <Flame className="h-8 w-8 text-primary mb-3" />
        <p className={cn(TYPE.headlineSm, 'text-white mb-1')}>You're all caught up</p>
        <p className={cn(TYPE.body, 'text-muted-foreground text-[12px] mb-4')}>
          {cards.length} look{cards.length === 1 ? '' : 's'} swiped
        </p>
        <button
          onClick={() => setIndex(0)}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-[12px] font-bold active:scale-95 transition-transform"
        >
          Swipe again
        </button>
      </div>
    );
  }

  const current = cards[index];
  const next = cards[index + 1];

  // Vote count for current card
  const currentCounts = current.postId ? voteCounts[current.postId] : undefined;
  const yes = currentCounts?.['buy_yes'] ?? 0;
  const no = currentCounts?.['buy_no'] ?? 0;
  const total = yes + no;
  const copPercent = total > 0 ? Math.round((yes / total) * 100) : undefined;

  return (
    <div className="relative">
      {/* Peek of next card behind */}
      {next && (
        <div
          key={next.id}
          className="absolute inset-0 rounded-2xl overflow-hidden scale-95 opacity-50 pointer-events-none"
          aria-hidden
        >
          <img
            src={next.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      )}
      <div key={current.id} className="relative">
        <SwipeFeedCard
          card={current}
          onCop={handleCop}
          onDrop={handleDrop}
          onTap={handleTap}
          copPercent={copPercent}
          voteCount={total}
          showKindPill={false}
        />
      </div>
      <p className="text-center text-[10px] text-muted-foreground mt-3 tracking-wider uppercase">
        {index + 1} / {cards.length}
      </p>
    </div>
  );
}
