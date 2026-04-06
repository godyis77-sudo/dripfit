import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWeeklyOutfits, type WeeklyOutfit, type WeeklyOutfitItem } from '@/hooks/useWeeklyOutfits';
import { useAuth } from '@/hooks/useAuth';
import { useAffiliateClickout } from '@/hooks/useAffiliateClickout';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Crown, ShoppingBag, Shirt } from 'lucide-react';
import InlineCrown from '@/components/ui/InlineCrown';

const WeeklyOutfitsSection = () => {
  const navigate = useNavigate();
  const { userGender } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;
  const { data: outfits, isLoading } = useWeeklyOutfits(mappedGender);
  const [activeOccasion, setActiveOccasion] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<WeeklyOutfit | null>(null);
  const { pendingClickout, beginClickout, confirmClickout, cancelClickout } = useAffiliateClickout({ extraProps: { source: 'weekly_outfits' } });

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
    const retailer = item.brand || 'Unknown';
    beginClickout(retailer, item.product_url);
  }, [beginClickout]);

  const handleTryOn = useCallback((item: WeeklyOutfitItem) => {
    navigate('/tryon', { state: { clothingUrl: item.image_url, productUrl: item.product_url, freshSession: true } });
  }, [navigate]);

  if (isLoading || !outfits || outfits.length === 0) return null;

  return (
    <div className="px-4 mt-6 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
            <InlineCrown size={18} /> This Week's Drip
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">AI-curated outfits for every occasion</p>
        </div>
        <button
          onClick={() => navigate('/outfits-weekly')}
          className="text-[11px] font-semibold text-[hsl(var(--drip-gold))] active:opacity-70"
        >
          See All {outfits.length} →
        </button>
      </div>

      {/* Occasion tabs */}
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

      {/* Cards row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
        {filtered.map(outfit => (
          <OutfitCard key={outfit.id} outfit={outfit} onTap={() => setSelectedOutfit(outfit)} />
        ))}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedOutfit} onOpenChange={open => !open && setSelectedOutfit(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-card border-border/30">
          {selectedOutfit && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-foreground text-lg">{selectedOutfit.title}</SheetTitle>
                {selectedOutfit.description && (
                  <p className="text-[12px] text-muted-foreground">{selectedOutfit.description}</p>
                )}
              </SheetHeader>

              <div className="space-y-3">
                {selectedOutfit.items.map(item => (
                  <div key={item.id} className="flex gap-3 items-center">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-20 h-20 rounded-lg object-cover bg-muted shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                      {item.brand && <p className="text-[11px] text-muted-foreground">{item.brand}</p>}
                      {item.price_cents != null && (
                        <p className="text-[12px] font-semibold text-[hsl(var(--drip-gold))]">
                          ${(item.price_cents / 100).toFixed(0)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {item.product_url && (
                        <Button
                          size="sm"
                          className="h-7 text-[10px] px-2.5 btn-luxury"
                          onClick={() => handleShop(item)}
                        >
                          <ShoppingBag className="h-3 w-3 mr-1" /> Shop
                        </Button>
                      )}
                      {item.image_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2.5 border-border/50"
                          onClick={() => handleTryOn(item)}
                        >
                          <Shirt className="h-3 w-3 mr-1" /> Try On
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selectedOutfit.items.length > 0 && selectedOutfit.items[0].image_url && (
                <Button
                  className="w-full mt-4 btn-luxury font-bold"
                  onClick={() => handleTryOn(selectedOutfit.items[0])}
                >
                  <Shirt className="h-4 w-4 mr-2" /> Try Full Outfit
                </Button>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Affiliate disclosure modal */}
      {pendingClickout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={cancelClickout}>
          <div className="bg-card rounded-xl p-5 mx-6 max-w-sm" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-foreground mb-1 font-semibold">Leaving DripCheck</p>
            <p className="text-[11px] text-muted-foreground mb-4">
              You'll be redirected to <strong>{pendingClickout.retailer}</strong>. We may earn a commission at no extra cost to you.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cancelClickout} className="flex-1">Cancel</Button>
              <Button size="sm" onClick={confirmClickout} className="flex-1 btn-luxury">Continue</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Sub-components ─────────────────────────── */

function OccasionPill({ active, onClick, label, emoji }: { active: boolean; onClick: () => void; label: string; emoji?: string | null }) {
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

function OutfitCard({ outfit, onTap }: { outfit: WeeklyOutfit; onTap: () => void }) {
  const images = outfit.items.slice(0, 4).map(i => i.image_url).filter(Boolean) as string[];
  const brands = [...new Set(outfit.items.map(i => i.brand).filter(Boolean))].slice(0, 3);

  return (
    <motion.button
      onClick={onTap}
      className="snap-start shrink-0 w-[200px] bg-card rounded-xl border border-border/30 overflow-hidden text-left active:scale-[0.97] transition-transform"
      whileTap={{ scale: 0.97 }}
    >
      {/* 2x2 grid */}
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
          <p className="text-[12px] font-semibold text-[hsl(var(--drip-gold))] mt-0.5">
            ${(outfit.total_price_cents / 100).toFixed(0)}
          </p>
        )}
        {brands.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {brands.map(b => (
              <span key={b} className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{b}</span>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}

export default WeeklyOutfitsSection;
