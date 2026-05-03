import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, X } from 'lucide-react';
import SwipeFeedCard from '@/components/home/SwipeFeedCard';
import type { SwipeCard } from '@/hooks/useHomeSwipeFeed';
import type { Post } from './community-types';
import { isValidImageUrl } from './community-types';
import { trackEvent } from '@/lib/analytics';
import { TYPE } from '@/lib/design-tokens';
import { cn, shuffleArray } from '@/lib/utils';
import { useWeeklyOutfits } from '@/hooks/useWeeklyOutfits';

interface CommunitySwipeStackProps {
  posts: Post[];
  loading: boolean;
  votes: Record<string, string[]>;
  voteCounts: Record<string, Record<string, number>>;
  failedImages: Set<string>;
  onVote: (postId: string, voteKey: string) => void | Promise<void>;
  onOpenDetail: (post: Post) => void;
  onImageError?: (postId: string) => void;
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
  onImageError,
}: CommunitySwipeStackProps) {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [copCount, setCopCount] = useState(0);
  const [dropCount, setDropCount] = useState(0);
  const { data: weeklyOutfits = [] } = useWeeklyOutfits();

  // Map Post -> SwipeCard, then interleave with weekly curated outfits
  const cards: SwipeCard[] = useMemo(() => {
    const postCards: SwipeCard[] = posts
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

    const outfitCards: SwipeCard[] = weeklyOutfits
      .filter((o) => o.hero_image_url)
      .map<SwipeCard>((o) => ({
        id: `outfit-${o.id}`,
        kind: 'outfit',
        outfitId: o.id,
        imageUrl: o.hero_image_url!,
        title: o.title,
        subtitle: o.occasion_label,
      }));

    // Interleave: 1 outfit, then 2 posts, repeat
    const shuffledOutfits = shuffleArray(outfitCards);
    const shuffledPosts = shuffleArray(postCards);
    const result: SwipeCard[] = [];
    let pi = 0;
    let oi = 0;
    while (oi < shuffledOutfits.length || pi < shuffledPosts.length) {
      if (oi < shuffledOutfits.length) result.push(shuffledOutfits[oi++]);
      for (let k = 0; k < 2 && pi < shuffledPosts.length; k++) result.push(shuffledPosts[pi++]);
    }
    return result;
  }, [posts, failedImages, weeklyOutfits]);

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  // Swipe is browse-only: track analytics and advance, but do NOT mutate
  // votes or cart. Voting/shopping happens from the full-screen detail sheet.
  const handleCop = useCallback(
    (card: SwipeCard) => {
      trackEvent('style_check_swipe_cop', { postId: card.postId });
      setCopCount((c) => c + 1);
      advance();
    },
    [advance],
  );

  const handleDrop = useCallback(
    (card: SwipeCard) => {
      trackEvent('style_check_swipe_drop', { postId: card.postId });
      setDropCount((c) => c + 1);
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
          onClick={() => {
            setIndex(0);
            setCopCount(0);
            setDropCount(0);
          }}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-[12px] font-bold active:scale-95 transition-transform"
        >
          Swipe again
        </button>
      </div>
    );
  }

  const current = cards[index];
  const next = cards[index + 1];

  // Vote count for current card (from server, used inside card progress bar)
  const currentCounts = current.postId ? voteCounts[current.postId] : undefined;
  const yes = currentCounts?.['buy_yes'] ?? 0;
  const no = currentCounts?.['buy_no'] ?? 0;
  const total = yes + no;
  const copPercent = total > 0 ? Math.round((yes / total) * 100) : undefined;

  return (
    <div className="relative">
      {/* Card stack — fixed aspect wrapper so peek can't bleed below */}
      <div className="relative w-full aspect-[3/4]">
        {/* Peek of next card behind */}
        {next && (
          <div
            key={next.id}
            className="absolute inset-0 rounded-2xl overflow-hidden scale-[0.94] opacity-40 pointer-events-none"
            aria-hidden
          >
            <img
              src={next.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
              onError={() => next.postId && onImageError?.(next.postId)}
            />
          </div>
        )}
        <div key={current.id} className="absolute inset-0">
          <SwipeFeedCard
            card={current}
            onCop={handleCop}
            onDrop={handleDrop}
            onTap={handleTap}
            onImageError={(c) => c.postId && onImageError?.(c.postId)}
            copPercent={copPercent}
            voteCount={total}
            showKindPill={false}
          />
        </div>
      </div>

      {/* Swipe tally — reflects this session's swipes */}
      <div className="mt-4 flex items-center justify-center gap-5 text-[11px] text-white/70">
        <span className="flex items-center gap-1.5">
          <X className="h-3.5 w-3.5 text-destructive" />
          <span className="font-bold tabular-nums text-white">{dropCount}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">drop</span>
        </span>
        <span className="text-[10px] text-muted-foreground tracking-wider uppercase tabular-nums">
          {Math.min(index + 1, cards.length)} / {cards.length}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">cop</span>
          <span className="font-bold tabular-nums text-white">{copCount}</span>
          <Flame className="h-3.5 w-3.5 text-primary" />
        </span>
      </div>
    </div>
  );
}
