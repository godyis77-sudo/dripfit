import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHomeSwipeFeed, type SwipeCard } from '@/hooks/useHomeSwipeFeed';
import SwipeFeedCard from './SwipeFeedCard';
import { trackEvent } from '@/lib/analytics';
import { TYPE } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface SwipeFeedSectionProps {
  gender?: string;
}

export default function SwipeFeedSection({ gender }: SwipeFeedSectionProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cards, isLoading } = useHomeSwipeFeed(gender);
  const [index, setIndex] = useState(0);
  const [voteCounts, setVoteCounts] = useState<Record<string, { yes: number; no: number }>>({});

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  const recordVote = useCallback(
    async (card: SwipeCard, voteKey: 'buy_yes' | 'buy_no') => {
      if (card.kind !== 'post' || !card.postId || !user?.id) return;
      // Optimistic local count
      setVoteCounts((prev) => {
        const cur = prev[card.postId!] || { yes: 0, no: 0 };
        return {
          ...prev,
          [card.postId!]: {
            yes: voteKey === 'buy_yes' ? cur.yes + 1 : cur.yes,
            no: voteKey === 'buy_no' ? cur.no + 1 : cur.no,
          },
        };
      });
      await supabase.from('community_votes').upsert(
        { user_id: user.id, post_id: card.postId, vote_key: voteKey },
        { onConflict: 'user_id,post_id' },
      );
    },
    [user?.id],
  );

  const handleCop = useCallback(
    (card: SwipeCard) => {
      trackEvent('home_swipe_cop', { kind: card.kind, id: card.id });
      void recordVote(card, 'buy_yes');
      advance();
    },
    [advance, recordVote],
  );

  const handleDrop = useCallback(
    (card: SwipeCard) => {
      trackEvent('home_swipe_drop', { kind: card.kind, id: card.id });
      void recordVote(card, 'buy_no');
      advance();
    },
    [advance, recordVote],
  );

  const handleTap = useCallback(
    (card: SwipeCard) => {
      trackEvent('home_swipe_tap', { kind: card.kind, id: card.id });
      if (card.kind === 'outfit' && card.outfitId) {
        navigate(`/outfit/${card.outfitId}`);
      } else {
        navigate('/community');
      }
    },
    [navigate],
  );

  // Loading skeleton
  if (isLoading && cards.length === 0) {
    return (
      <section className="mb-6">
        <SectionHeader navigate={navigate} />
        <div className="w-full aspect-[3/4] rounded-2xl skeleton-gold" />
      </section>
    );
  }

  // No content fallback
  if (!isLoading && cards.length === 0) return null;

  // End state
  if (index >= cards.length) {
    return (
      <section className="mb-6">
        <SectionHeader navigate={navigate} />
        <div className="w-full aspect-[3/4] rounded-2xl glass-dark border border-white/8 flex flex-col items-center justify-center text-center px-6">
          <Flame className="h-8 w-8 text-primary mb-3" />
          <p className={cn(TYPE.headlineSm, 'text-white mb-1')}>You're all caught up</p>
          <p className={cn(TYPE.body, 'text-muted-foreground text-[12px] mb-4')}>
            {cards.length} look{cards.length === 1 ? '' : 's'} this week
          </p>
          <button
            onClick={() => navigate('/community')}
            className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-[12px] font-bold active:scale-95 transition-transform"
          >
            See all in The Drop →
          </button>
        </div>
      </section>
    );
  }

  const current = cards[index];
  const next = cards[index + 1];
  const counts = current.postId ? voteCounts[current.postId] : undefined;
  const total = counts ? counts.yes + counts.no : 0;
  const copPercent = total > 0 ? Math.round((counts!.yes / total) * 100) : undefined;

  return (
    <section className="mb-6">
      <SectionHeader navigate={navigate} />
      <div className="relative">
        {/* Peek of next card — sits behind, becomes the new top after swipe */}
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
          />
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-1.5">
        <Flame className="h-3.5 w-3.5 text-primary" />
        <p className={cn(TYPE.label, 'text-[11px] font-bold tracking-[0.15em] text-primary uppercase mb-0')}>
          Community Drops · Find Your Twin
        </p>
      </div>
      <button
        onClick={() => navigate('/community')}
        className="text-[11px] text-muted-foreground hover:text-foreground active:scale-95 transition-all px-2 py-1"
      >
        See all →
      </button>
    </div>
  );
}
