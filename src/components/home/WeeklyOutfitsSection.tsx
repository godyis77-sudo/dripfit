import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWeeklyOutfits, type WeeklyOutfit } from '@/hooks/useWeeklyOutfits';
import { useAuth } from '@/hooks/useAuth';
import { shuffleArray } from '@/lib/utils';


const APP_URL = 'https://dripfitcheck.lovable.app';

/**
 * Derive a stable, deterministic mock COP percentage (89–98) from the outfit id.
 * Replace with a real `cop_percentage` field on WeeklyOutfit when available.
 */
function getCopScore(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return 89 + (hash % 10); // 89..98
}

function handleShare(title: string, e: React.MouseEvent) {
  e.stopPropagation();
  const url = `${APP_URL}/outfits-weekly`;
  const text = `Check out "${title}" on DRIPFIT`;
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(`${text} ${url}`).then(() => toast.success('Link copied!')).catch(() => toast.error('Could not copy link'));
  }
}

interface WeeklyOutfitsSectionProps {
  /** 'compact' = 280px carousel cards (default). 'large' = near full-width hero cards to match the auth swipe feed. */
  size?: 'compact' | 'large';
}

const WeeklyOutfitsSection = ({ size = 'compact' }: WeeklyOutfitsSectionProps = {}) => {
  const navigate = useNavigate();
  const { userGender, genderLoaded, loading: authLoading } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;
  const ready = !authLoading && genderLoaded;
  const { data: outfits, isLoading } = useWeeklyOutfits(ready ? mappedGender : '__wait__');
  const [activeOccasion, setActiveOccasion] = useState<string | null>(null);

  const readyOutfits = useMemo(() => {
    if (!outfits) return [];
    // Show any outfit with items. Hero image is preferred but optional —
    // outfits without a generated hero fall back to the editorial glass card.
    const ready = outfits.filter(o => o.items.length > 0);
    // Prioritize outfits that already have an editorial hero image, then
    // shuffle within each group so the first card varies each visit.
    const withHero = shuffleArray(ready.filter(o => !!o.hero_image_url));
    const withoutHero = shuffleArray(ready.filter(o => !o.hero_image_url));
    return [...withHero, ...withoutHero];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfits?.length]);

  const occasions = useMemo(() => {
    const seen = new Map<string, { label: string; emoji: string | null }>();
    readyOutfits.forEach(o => {
      if (!seen.has(o.occasion)) seen.set(o.occasion, { label: o.occasion_label, emoji: o.occasion_emoji });
    });
    return Array.from(seen.entries()).map(([key, val]) => ({ key, ...val }));
  }, [readyOutfits]);

  const filtered = useMemo(() => {
    if (!activeOccasion) return readyOutfits;
    return readyOutfits.filter(o => o.occasion === activeOccasion);
  }, [readyOutfits, activeOccasion]);

  if (isLoading && readyOutfits.length === 0) {
    return (
      <div className="mt-2 mb-4">
        <div className="h-5 w-40 rounded bg-white/5 animate-pulse mb-3" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2].map(i => (
            <div key={i} className="shrink-0 w-[280px] aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (readyOutfits.length === 0) return null;

  return (
    <div className="mt-2 mb-4">
      {/* Section divider — bridges from scan card */}
      <div className="flex justify-center mb-5">
        <div className="h-px w-20" style={{ background: 'rgba(200,169,81,0.2)' }} />
      </div>

      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="font-display text-[22px] font-semibold text-foreground tracking-tight">
            This Week's Drip
          </h2>
          <p className="font-sans text-[13px] font-medium tracking-[0.15em] uppercase text-foreground/70 mt-0.5">Curated fits · Dropped weekly</p>
        </div>
        <button
          onClick={() => navigate('/outfits-weekly')}
          className="text-[11px] tracking-wide uppercase text-primary active:opacity-70 font-normal"
        >
          View All →
        </button>
      </div>

      {occasions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-3">
          <OccasionPill active={!activeOccasion} onClick={() => setActiveOccasion(null)} label="All" />
          {occasions.map(oc => (
            <OccasionPill
              key={oc.key}
              active={activeOccasion === oc.key}
              onClick={() => setActiveOccasion(oc.key)}
              label={oc.label}
            />
          ))}
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {filtered.map(outfit => (
          <HeroCard key={outfit.id} outfit={outfit} size={size} onTap={() => navigate(`/outfit/${outfit.id}`)} />
        ))}
      </div>
    </div>
  );
};

function OccasionPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border backdrop-blur-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
        active
          ? 'bg-primary/8 border-primary/20 text-primary'
          : 'bg-white/5 border-white/10 text-white/50'
      }`}
    >
      <span className={`inline-block w-[5px] h-[5px] rounded-full shrink-0 ${active ? 'bg-primary' : 'bg-white/20'}`} />
      {label}
    </button>
  );
}

function HeroCard({ outfit, onTap, size = 'compact' }: { outfit: WeeklyOutfit; onTap: () => void; size?: 'compact' | 'large' }) {
  const heroImage = outfit.hero_image_url;
  const brands = [...new Set(outfit.items.map(i => i.brand).filter(Boolean))].slice(0, 3);
  const copScore = getCopScore(outfit.id);

  // Width: 'large' uses 88vw (capped) to feel near full-width like the auth swipe feed.
  const sizeClass =
    size === 'large'
      ? 'w-[88vw] max-w-[420px] aspect-[3/4]'
      : 'w-[280px] aspect-[3/4]';

  // Full-bleed editorial hero card
  if (heroImage) {
    return (
      <motion.button
        onClick={onTap}
        className={`snap-start shrink-0 ${sizeClass} rounded-2xl overflow-hidden relative text-left active:scale-[0.97] transition-transform`}
        whileTap={{ scale: 0.97 }}
      >
        <img
          src={heroImage}
          alt={outfit.title}
          className="absolute inset-0 w-full h-full object-cover object-top"
          loading="lazy"
        />
        {/* COP score pill — top-left, ties cards back to the COP or DROP system */}
        <span
          className="absolute top-3 left-3 z-20 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/55 backdrop-blur-sm border border-primary/40 text-primary"
        >
          {copScore}% COP
        </span>
        {/* Share button */}
        <button
          onClick={(e) => handleShare(outfit.title, e)}
          className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors"
          aria-label="Share"
        >
          <Share2 size={16} />
        </button>

        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Text at bottom */}
        <div className="absolute bottom-0 inset-x-0 px-3.5 pb-6 z-10">
          <p className="font-display text-[22px] font-semibold text-foreground leading-tight truncate tracking-tight">{outfit.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {outfit.total_price_cents > 0 && (
              <span className="text-sm font-display font-bold text-primary">
                ${(outfit.total_price_cents / 100).toFixed(0)}
              </span>
            )}
            {outfit.occasion_label && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium tracking-wider uppercase bg-white/[0.1] backdrop-blur-sm border border-white/[0.1] text-white">
                {outfit.occasion_label}
              </span>
            )}
          </div>
          {brands.length > 0 && (
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/40 mt-1.5 truncate">
              {brands.join(' · ')}
            </p>
          )}
        </div>
      </motion.button>
    );
  }

  // Fallback: text-only glass card (no flat-lay product grid)
  return (
    <motion.button
      onClick={onTap}
      className={`snap-start shrink-0 ${sizeClass} rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-transform glass-dark border border-white/5 flex flex-col justify-end px-3.5 pb-6 relative`}
      whileTap={{ scale: 0.97 }}
    >
      {/* COP score pill — top-left */}
      <span
        className="absolute top-3 left-3 z-20 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-black/55 backdrop-blur-sm border border-primary/40 text-primary"
      >
        {copScore}% COP
      </span>
      <button
        onClick={(e) => handleShare(outfit.title, e)}
        className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors"
        aria-label="Share"
      >
        <Share2 size={16} />
      </button>
      <p className="font-display text-[22px] font-semibold text-foreground leading-tight truncate tracking-tight">{outfit.title}</p>
      <div className="flex items-center gap-2 mt-1">
        {outfit.total_price_cents > 0 && (
          <span className="text-sm font-display font-bold text-primary">
            ${(outfit.total_price_cents / 100).toFixed(0)}
          </span>
        )}
        {outfit.occasion_label && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium tracking-wider uppercase bg-white/[0.1] backdrop-blur-sm border border-white/[0.1] text-white">
            {outfit.occasion_label}
          </span>
        )}
      </div>
      {brands.length > 0 && (
        <p className="text-[9px] tracking-[0.2em] uppercase text-white/30 mt-1.5 truncate">
          {brands.join(' · ')}
        </p>
      )}
      <p className="text-[10px] italic text-white/20 mt-2">Editorial image generating…</p>
    </motion.button>
  );
}

export default WeeklyOutfitsSection;
