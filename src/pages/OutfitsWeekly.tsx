import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Shirt } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useWeeklyOutfits, type WeeklyOutfit, type WeeklyOutfitItem } from '@/hooks/useWeeklyOutfits';
import { useAffiliateClickout } from '@/hooks/useAffiliateClickout';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import BottomTabBar from '@/components/BottomTabBar';
import InlineCrown from '@/components/ui/InlineCrown';

const GENDER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'mens', label: "Men's" },
  { key: 'womens', label: "Women's" },
];

const OutfitsWeekly = () => {
  usePageMeta({ path: '/outfits-weekly', title: "This Week's Drip", description: 'AI-curated outfits for every occasion' });
  const navigate = useNavigate();
  const [genderFilter, setGenderFilter] = useState('all');
  const [activeOccasion, setActiveOccasion] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<WeeklyOutfit | null>(null);
  const { data: outfits, isLoading } = useWeeklyOutfits(genderFilter);
  const { pendingClickout, beginClickout, confirmClickout, cancelClickout } = useAffiliateClickout({ extraProps: { source: 'weekly_outfits_page' } });

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

  const handleShop = useCallback((item: WeeklyOutfitItem) => {
    if (!item.product_url) return;
    beginClickout(item.brand || 'Unknown', item.product_url);
  }, [beginClickout]);

  const handleTryOn = useCallback((item: WeeklyOutfitItem) => {
    navigate('/tryon', { state: { clothingUrl: item.image_url, productUrl: item.product_url, freshSession: true } });
  }, [navigate]);

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
            {filtered.map(outfit => (
              <GridCard key={outfit.id} outfit={outfit} onTap={() => setSelectedOutfit(outfit)} />
            ))}
          </div>
        )}
      </div>

      <Sheet open={!!selectedOutfit} onOpenChange={open => !open && setSelectedOutfit(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card border-border/30">
          {selectedOutfit && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-foreground text-lg">{selectedOutfit.title}</SheetTitle>
                {selectedOutfit.description && (
                  <SheetDescription className="text-[12px] text-muted-foreground">
                    {selectedOutfit.description}
                  </SheetDescription>
                )}
              </SheetHeader>
              <div className="space-y-3">
                {selectedOutfit.items.map(item => (
                  <div key={item.id} className="flex gap-3 items-center">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.product_name} className="w-20 h-20 rounded-lg object-cover bg-muted shrink-0" loading="lazy" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                      {item.brand && <p className="text-[11px] text-muted-foreground">{item.brand}</p>}
                      {item.price_cents != null && (
                        <p className="text-[12px] font-semibold text-[hsl(var(--drip-gold))]">${(item.price_cents / 100).toFixed(0)}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {item.product_url && (
                        <Button size="sm" className="h-7 text-[10px] px-2.5 btn-luxury" onClick={() => handleShop(item)}>
                          <ShoppingBag className="h-3 w-3 mr-1" /> Shop
                        </Button>
                      )}
                      {item.image_url && (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2.5 border-border/50" onClick={() => handleTryOn(item)}>
                          <Shirt className="h-3 w-3 mr-1" /> Try On
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {selectedOutfit.items.length > 0 && selectedOutfit.items[0].image_url && (
                <Button className="w-full mt-4 btn-luxury font-bold" onClick={() => handleTryOn(selectedOutfit.items[0])}>
                  <Shirt className="h-4 w-4 mr-2" /> Try Full Outfit
                </Button>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {pendingClickout && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-4" onClick={cancelClickout}>
          <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-card p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-foreground mb-1">Leaving DripCheck</p>
            <p className="text-[11px] text-muted-foreground mb-4">
              You'll be redirected to <strong>{pendingClickout.retailer}</strong>. We may earn a commission at no extra cost to you.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cancelClickout} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={confirmClickout} className="flex-1 btn-luxury">Continue</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

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

  return (
    <button onClick={onTap} className="bg-card rounded-xl border border-border/30 overflow-hidden text-left active:scale-[0.97] transition-transform">
      <div className={`grid gap-0.5 p-1 ${images.length >= 4 ? 'grid-cols-2 grid-rows-2' : images.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {images.map((src, i) => (
          <div key={i} className="aspect-square overflow-hidden rounded-lg bg-muted">
            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
      <div className="p-2.5 pt-1.5">
        <p className="text-sm font-bold text-foreground truncate">{outfit.title}</p>
        {outfit.total_price_cents > 0 && (
          <p className="text-[12px] font-semibold text-[hsl(var(--drip-gold))] mt-0.5">${(outfit.total_price_cents / 100).toFixed(0)}</p>
        )}
        {brands.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {brands.map(b => (
              <span key={b} className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{b}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

export default OutfitsWeekly;
