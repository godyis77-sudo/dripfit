import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWeeklyOutfits, type WeeklyOutfit } from '@/hooks/useWeeklyOutfits';
import { useAuth } from '@/hooks/useAuth';
import InlineCrown from '@/components/ui/InlineCrown';

const WeeklyOutfitsSection = () => {
  const navigate = useNavigate();
  const { userGender, genderLoaded, loading: authLoading } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;
  const ready = !authLoading && genderLoaded;
  const { data: outfits, isLoading } = useWeeklyOutfits(ready ? mappedGender : '__wait__');
  const [activeOccasion, setActiveOccasion] = useState<string | null>(null);

  const occasions = useMemo(() => {
    if (!outfits) return [];
    const seen = new Map<string, { label: string; emoji: string | null }>();
    outfits.forEach(o => {
      if (!seen.has(o.occasion)) seen.set(o.occasion, { label: o.occasion_label, emoji: o.occasion_emoji });
    });
    return Array.from(seen.entries()).map(([key, val]) => ({ key, ...val }));
  }, [outfits]);

  const filtered = useMemo(() => {
    if (!outfits) return [];
    if (!activeOccasion) return outfits;
    return outfits.filter(o => o.occasion === activeOccasion);
  }, [outfits, activeOccasion]);

  if (!outfits || outfits.length === 0) {
    if (isLoading) {
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
    return null;
  }

  return (
    <div className="mt-2 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-display text-lg text-white flex items-center gap-1.5">
            <InlineCrown size={16} /> This Week's Drip
          </h2>
          <p className="text-[11px] tracking-widest uppercase text-white/30 mt-0.5">AI-curated looks for every occasion</p>
        </div>
        <button
          onClick={() => navigate('/outfits-weekly')}
          className="text-[11px] tracking-wide uppercase text-primary active:opacity-70"
        >
          See All →
        </button>
      </div>

      {occasions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-3">
          <OccasionPill active={!activeOccasion} onClick={() => setActiveOccasion(null)} label="All" emoji="✨" />
          {occasions.map(oc => (
            <OccasionPill
              key={oc.key}
              active={activeOccasion === oc.key}
              onClick={() => setActiveOccasion(oc.key)}
              label={oc.label}
              emoji={oc.emoji}
            />
          ))}
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {filtered.map(outfit => (
          <HeroCard key={outfit.id} outfit={outfit} onTap={() => navigate(`/outfit/${outfit.id}`)} />
        ))}
      </div>
    </div>
  );
};

function OccasionPill({ active, onClick, label, emoji }: { active: boolean; onClick: () => void; label: string; emoji?: string | null }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border backdrop-blur-md transition-colors whitespace-nowrap ${
        active
          ? 'bg-primary/8 border-primary/20 text-primary'
          : 'bg-white/5 border-white/10 text-white/50'
      }`}
    >
      {emoji && <span className="mr-1">{emoji}</span>}{label}
    </button>
  );
}

function HeroCard({ outfit, onTap }: { outfit: WeeklyOutfit; onTap: () => void }) {
  const heroImage = outfit.hero_image_url;
  const brands = [...new Set(outfit.items.map(i => i.brand).filter(Boolean))].slice(0, 3);

  // Full-bleed editorial hero card
  if (heroImage) {
    return (
      <motion.button
        onClick={onTap}
        className="snap-start shrink-0 w-[280px] aspect-[3/4] rounded-2xl overflow-hidden relative text-left active:scale-[0.97] transition-transform"
        whileTap={{ scale: 0.97 }}
      >
        <img
          src={heroImage}
          alt={outfit.title}
          className="absolute inset-0 w-full h-full object-cover object-top"
          loading="lazy"
        />
        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

        {/* Text at bottom */}
        <div className="absolute bottom-0 inset-x-0 p-3.5 z-10">
          <p className="text-base font-display font-bold text-white leading-tight truncate">{outfit.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {outfit.total_price_cents > 0 && (
              <span className="text-sm font-display font-bold text-primary">
                ${(outfit.total_price_cents / 100).toFixed(0)}
              </span>
            )}
            {outfit.occasion_emoji && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium glass-gold border border-primary/20 text-primary">
                {outfit.occasion_emoji} {outfit.occasion_label}
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
      className="snap-start shrink-0 w-[280px] aspect-[3/4] rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-transform glass-dark border border-white/5 flex flex-col justify-end p-3.5"
      whileTap={{ scale: 0.97 }}
    >
      <p className="text-base font-display font-bold text-white leading-tight truncate">{outfit.title}</p>
      <div className="flex items-center gap-2 mt-1">
        {outfit.total_price_cents > 0 && (
          <span className="text-sm font-display font-bold text-primary">
            ${(outfit.total_price_cents / 100).toFixed(0)}
          </span>
        )}
        {outfit.occasion_emoji && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium glass-gold border border-primary/20 text-primary">
            {outfit.occasion_emoji} {outfit.occasion_label}
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
