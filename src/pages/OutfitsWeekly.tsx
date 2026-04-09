import { useState, useMemo } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
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
  const { revealRef } = useScrollReveal();

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
            <PillBtn active={!activeOccasion} onClick={() => setActiveOccasion(null)} label="All" emoji="✨" />
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
          <div className="grid grid-cols-2 gap-3 pb-6">
            {filtered.map((outfit, idx) => (
              <div key={outfit.id} ref={revealRef(idx)}>
                <GridCard outfit={outfit} onTap={() => navigate(`/outfit/${outfit.id}`)} />
              </div>
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
      {emoji && <span className="mr-1">{emoji}</span>}{label}
    </button>
  );
}

function GridCard({ outfit, onTap }: { outfit: WeeklyOutfit; onTap: () => void }) {
  const images = outfit.items.slice(0, 4).map(i => i.image_url).filter(Boolean) as string[];
  const brands = [...new Set(outfit.items.map(i => i.brand).filter(Boolean))].slice(0, 3);
  const mainImage = images[0];
  const secondaryImages = images.slice(1, 3);

  return (
    <button onClick={onTap} className="glass-dark rounded-2xl border border-white/5 overflow-hidden text-left active:scale-[0.97] transition-transform w-full">
      {/* Flat-lay product grid */}
      <div className="bg-zinc-900/80 p-1.5">
        {mainImage && (
          <div className="w-full aspect-[4/3] overflow-hidden rounded-xl bg-zinc-800/60 mb-1">
            <img src={mainImage} alt="" className="w-full h-full object-contain p-2" loading="lazy" />
          </div>
        )}
        {secondaryImages.length > 0 && (
          <div className="grid grid-cols-2 gap-1">
            {secondaryImages.map((src, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-lg bg-zinc-800/60">
                <img src={src} alt="" className="w-full h-full object-contain p-1.5" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="p-2.5 pt-2 border-t border-white/5">
        <p className="text-sm font-display font-bold text-foreground truncate">{outfit.title}</p>
        {outfit.total_price_cents > 0 && (
          <p className="text-[12px] font-display font-bold text-primary mt-0.5">
            ${(outfit.total_price_cents / 100).toFixed(0)}
          </p>
        )}
        {outfit.occasion_emoji && (
          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-medium glass-gold border border-primary/20 text-primary">
            {outfit.occasion_emoji} {outfit.occasion_label}
          </span>
        )}
        {brands.length > 0 && (
          <p className="text-[9px] tracking-[0.2em] uppercase text-white/30 mt-1.5 truncate">
            {brands.join(' · ')}
          </p>
        )}
      </div>
    </button>
  );
}

export default OutfitsWeekly;
