import { useState } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Flame, X } from 'lucide-react';
import type { SwipeCard } from '@/hooks/useHomeSwipeFeed';
import { cn } from '@/lib/utils';
import { TYPE } from '@/lib/design-tokens';

interface SwipeFeedCardProps {
  card: SwipeCard;
  onCop: (card: SwipeCard) => void;
  onDrop: (card: SwipeCard) => void;
  onTap: (card: SwipeCard) => void;
  copPercent?: number;
  voteCount?: number;
  showKindPill?: boolean;
}

const SWIPE_THRESHOLD = 80;

export default function SwipeFeedCard({
  card,
  onCop,
  onDrop,
  onTap,
  copPercent,
  voteCount,
}: SwipeFeedCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-8, 0, 8]);
  const copOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const dropOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const [exiting, setExiting] = useState<'cop' | 'drop' | null>(null);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      setExiting('cop');
      setTimeout(() => onCop(card), 180);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      setExiting('drop');
      setTimeout(() => onDrop(card), 180);
    }
  };

  return (
    <motion.div
      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-card border border-white/8 shadow-luxury cursor-grab active:cursor-grabbing select-none touch-pan-y"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
      animate={
        exiting === 'cop'
          ? { x: 500, opacity: 0 }
          : exiting === 'drop'
            ? { x: -500, opacity: 0 }
            : undefined
      }
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={() => !exiting && onTap(card)}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* Image */}
      <img
        src={card.imageUrl}
        alt={card.title}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
        loading="lazy"
      />

      {/* Kind pill */}
      <div className="absolute top-3 left-3 z-10">
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider backdrop-blur-md',
            card.kind === 'outfit'
              ? 'bg-primary/90 text-primary-foreground'
              : 'bg-black/50 text-white border border-white/20',
          )}
        >
          {card.kind === 'outfit' ? 'Weekly Drip' : 'Style Check'}
        </span>
      </div>

      {/* Author top-right */}
      {card.authorName && (
        <div className="absolute top-3 right-3 z-10">
          <span className={cn(TYPE.data, 'text-white/70 text-[10px] backdrop-blur-md bg-black/30 px-2 py-1 rounded-full')}>
            @{card.authorName}
          </span>
        </div>
      )}

      {/* Bottom gradient + content */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 p-4 z-10">
        <h3 className="font-display italic text-xl text-white leading-tight line-clamp-2 drop-shadow-lg">
          {card.title}
        </h3>
        {card.subtitle && (
          <p className={cn(TYPE.data, 'text-white/60 mt-1 capitalize text-[11px]')}>{card.subtitle}</p>
        )}
        {card.kind === 'post' && typeof copPercent === 'number' && (voteCount ?? 0) > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${copPercent}%` }}
              />
            </div>
            <span className={cn(TYPE.data, 'text-white text-[10px]')}>
              {copPercent}% COP · {voteCount}
            </span>
          </div>
        )}
      </div>

      {/* COP/DROP overlays */}
      <motion.div
        className="absolute top-1/2 right-6 -translate-y-1/2 z-20 pointer-events-none"
        style={{ opacity: copOpacity }}
      >
        <div className="px-4 py-2 rounded-lg border-2 border-primary bg-primary/20 backdrop-blur-sm rotate-12">
          <span className="text-primary font-display italic text-2xl font-bold">COP</span>
        </div>
      </motion.div>
      <motion.div
        className="absolute top-1/2 left-6 -translate-y-1/2 z-20 pointer-events-none"
        style={{ opacity: dropOpacity }}
      >
        <div className="px-4 py-2 rounded-lg border-2 border-destructive bg-destructive/20 backdrop-blur-sm -rotate-12">
          <span className="text-destructive font-display italic text-2xl font-bold">DROP</span>
        </div>
      </motion.div>

      {/* Action buttons */}
      <div className="absolute bottom-4 right-4 z-20 flex gap-2 pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExiting('drop');
            setTimeout(() => onDrop(card), 180);
          }}
          className="h-10 w-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Drop"
        >
          <X className="h-4 w-4 text-white" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExiting('cop');
            setTimeout(() => onCop(card), 180);
          }}
          className="h-10 w-10 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform shadow-glow"
          aria-label="Cop"
        >
          <Flame className="h-4 w-4 text-primary-foreground" />
        </button>
      </div>
    </motion.div>
  );
}
