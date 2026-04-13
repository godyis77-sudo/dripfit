import { useState, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useWeeklyOutfits, type WeeklyOutfit } from '@/hooks/useWeeklyOutfits';
import BottomTabBar from '@/components/BottomTabBar';
import InlineCrown from '@/components/ui/InlineCrown';
import { useAuth } from '@/hooks/useAuth';

const GENDER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'mens', label: "Men's" },
  { key: 'womens', label: "Women's" },
];

const OutfitsWeekly = () => {
  usePageMeta({ path: '/outfits-weekly', title: "This Week's Drip", description: 'AI-curated outfits for every occasion' });
  const navigate = useNavigate();
  const { userGender } = useAuth();
  const defaultGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : 'all';
  const [genderFilter, setGenderFilter] = useState(defaultGender);
  const [activeOccasion, setActiveOccasion] = useState<string | null>(null);
  const { data: outfits, isLoading } = useWeeklyOutfits(genderFilter);
  

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

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-base font-bold text-foreground flex items-center gap-1.5">
          This Week's Drip <InlineCrown size={18} />
        </h1>
      </div>

      <div className="px-4 pt-3">
        <div className="flex gap-1.5 mb-3">
          {GENDER_OPTIONS.map(g => (
            <button
              key={g.key}
              onClick={() => setGenderFilter(g.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                genderFilter === g.key
                  ? 'border-[hsl(var(--drip-gold))] text-[hsl(var(--drip-gold))] bg-[hsl(var(--drip-gold)/0.1)]'
                  : 'border-border/40 text-muted-foreground'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {occasions.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-3">
            <PillBtn active={!activeOccasion} onClick={() => setActiveOccasion(null)} label="All" emoji={null} />
            {occasions.map(oc => (
              <PillBtn key={oc.key} active={activeOccasion === oc.key} onClick={() => setActiveOccasion(oc.key)} label={oc.label} emoji={oc.emoji} />
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <InlineCrown size={40} className="mb-3 opacity-50" />
            <p className="text-sm font-semibold text-foreground">No outfits curated yet.</p>
            <p className="text-[11px] text-muted-foreground mt-1">Check back Monday.</p>
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            {filtered.map((outfit) => (
              <FullWidthHeroCard key={outfit.id} outfit={outfit} onTap={() => navigate(`/outfit/${outfit.id}`)} />
            ))}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
};

function PillBtn({ active, onClick, label, emoji }: { active: boolean; onClick: () => void; label: string; emoji?: string | null }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors whitespace-nowrap ${
        active
          ? 'border-[hsl(var(--drip-gold))] text-[hsl(var(--drip-gold))] bg-[hsl(var(--drip-gold)/0.1)]'
          : 'border-border/40 text-muted-foreground'
      }`}
    >
      {label}
    </button>
  );
}

function FullWidthHeroCard({ outfit, onTap }: { outfit: WeeklyOutfit; onTap: () => void }) {
  const heroImage = outfit.hero_image_url;
  const brands = [...new Set(outfit.items.map(i => i.brand).filter(Boolean))].slice(0, 3);

  if (heroImage) {
    return (
      <button onClick={onTap} className="w-full aspect-[3/4] rounded-2xl overflow-hidden relative text-left active:scale-[0.98] transition-transform">
        <img src={heroImage} alt={outfit.title} className="absolute inset-0 w-full h-full object-cover object-top" loading="lazy" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-4 z-10">
          <p className="text-lg font-display font-bold text-white leading-tight">{outfit.title}</p>
          <div className="flex items-center gap-2 mt-1">
            {outfit.total_price_cents > 0 && (
              <span className="text-sm font-display font-bold text-primary">
                ${(outfit.total_price_cents / 100).toFixed(0)}
              </span>
            )}
            {outfit.occasion_label && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium glass-gold border border-primary/20 text-primary">
                {outfit.occasion_label}
              </span>
            )}
          </div>
          {brands.length > 0 && (
            <p className="text-[9px] tracking-[0.2em] uppercase text-white/40 mt-1.5">
              {brands.join(' · ')}
            </p>
          )}
          <p className="text-[10px] text-white/30 mt-1">Tap to shop each piece →</p>
        </div>
      </button>
    );
  }

  // Fallback: styled gradient card with outfit name as hero text
  return (
    <button onClick={onTap} className="w-full aspect-[3/4] rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform relative border border-white/5">
      {/* Dark gradient background with shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D]" />
      <div className="absolute inset-0 skeleton-gold opacity-30" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-10">
        <p className="text-2xl font-display font-bold text-foreground leading-tight mb-3">{outfit.title}</p>
        {outfit.occasion_label && (
          <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-medium glass-gold border border-primary/20 text-primary">
            {outfit.occasion_label}
          </span>
        )}
        {brands.length > 0 && (
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/30 mt-3">
            {brands.join(' · ')}
          </p>
        )}
      </div>

      {/* Bottom gradient for tap hint */}
      <div className="absolute inset-x-0 bottom-0 p-4 z-10">
        <p className="text-[10px] text-white/30 text-center">Tap to shop each piece →</p>
      </div>
    </button>
  );
}

export default OutfitsWeekly;
