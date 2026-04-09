import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWeeklyOutfits, type WeeklyOutfit, type WeeklyOutfitItem } from '@/hooks/useWeeklyOutfits';
import { useAuth } from '@/hooks/useAuth';
import { useAffiliateClickout } from '@/hooks/useAffiliateClickout';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Shirt } from 'lucide-react';
import InlineCrown from '@/components/ui/InlineCrown';
import { FullscreenImage } from '@/components/ui/fullscreen-image';

const WeeklyOutfitsSection = () => {
  const navigate = useNavigate();
  const { userGender } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;
  const { data: outfits, isLoading } = useWeeklyOutfits(mappedGender);
  const [activeOccasion, setActiveOccasion] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<WeeklyOutfit | null>(null);
  const { pendingClickout, beginClickout, confirmClickout, cancelClickout } = useAffiliateClickout({ extraProps: { source: 'weekly_outfits' } });
  const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null);

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

    setSelectedOutfit(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        beginClickout(retailer, item.product_url!);
      });
    });
  }, [beginClickout]);

  const handleTryOn = useCallback((item: WeeklyOutfitItem) => {
    navigate('/tryon', { state: { clothingUrl: item.image_url, productUrl: item.product_url, freshSession: true } });
  }, [navigate]);

  if (isLoading || !outfits || outfits.length === 0) return null;

  return (
    <div className="mt-2 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-display text-lg text-white flex items-center gap-1.5">
            <InlineCrown size={16} /> This Week's Drip
          </h2>
          <p className="text-[11px] tracking-widest uppercase text-white/30 mt-0.5">AI-curated outfits for every occasion</p>
        </div>
        <button
          onClick={() => navigate('/outfits-weekly')}
          className="text-[11px] tracking-wide uppercase text-primary active:opacity-70"
        >
          See All {outfits.length} →
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
          <OutfitCard key={outfit.id} outfit={outfit} onTap={() => setSelectedOutfit(outfit)} />
        ))}
      </div>

      <Sheet open={!!selectedOutfit} onOpenChange={open => !open && setSelectedOutfit(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl glass-dark border-white/10">
          {selectedOutfit && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-white text-lg font-display">{selectedOutfit.title}</SheetTitle>
                {selectedOutfit.description && (
                  <SheetDescription className="text-[12px] text-white/40">
                    {selectedOutfit.description}
                  </SheetDescription>
                )}
              </SheetHeader>

              {selectedOutfit.hero_image_url && (
                <div className="w-full aspect-[3/4] overflow-hidden rounded-xl mb-4 bg-muted cursor-pointer" onClick={() => setFullscreenSrc(selectedOutfit.hero_image_url!)}>
                  <img
                    src={selectedOutfit.hero_image_url}
                    alt={selectedOutfit.title}
                    className="w-full h-full object-cover object-top rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-3">
                {selectedOutfit.items.map(item => (
                  <div key={item.id} className="flex gap-3 items-center">
                    {item.image_url && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0 cursor-pointer" onClick={() => setFullscreenSrc(item.image_url!)}>
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover object-top rounded-xl"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.product_name}</p>
                      {item.brand && <p className="text-[10px] tracking-[0.2em] uppercase text-white/40">{item.brand}</p>}
                      {item.price_cents != null && (
                        <p className="text-[12px] font-display font-bold text-primary">
                          ${(item.price_cents / 100).toFixed(0)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {item.product_url && (
                        <Button
                          size="sm"
                          className="h-7 text-[10px] px-2.5 glass-gold text-primary border-primary/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShop(item);
                          }}
                        >
                          <ShoppingBag className="h-3 w-3 mr-1" /> Shop
                        </Button>
                      )}
                      {item.image_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2.5 glass border-white/10 text-white/60"
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

      {fullscreenSrc && (
        <FullscreenImage src={fullscreenSrc} alt="" externalOpen onExternalClose={() => setFullscreenSrc(null)} />
      )}

      {pendingClickout && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-4" onClick={cancelClickout}>
          <div className="w-full max-w-sm rounded-2xl glass-dark border-white/10 p-5 shadow-xl" onClick={e => { e.stopPropagation(); e.preventDefault(); }}>
            <p className="text-sm font-semibold text-white mb-1">Leaving DripCheck</p>
            <p className="text-[11px] text-white/40 mb-4">
              You'll be redirected to <strong>{pendingClickout.retailer}</strong>. We may earn a commission at no extra cost to you.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); cancelClickout(); }}
                className="flex-1 h-9 rounded-lg glass border-white/10 text-white text-sm font-semibold active:scale-[0.97] transition-transform"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); confirmClickout(); }}
                className="flex-1 h-9 rounded-lg btn-luxury text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform"
              >
                Continue
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
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

function OutfitCard({ outfit, onTap }: { outfit: WeeklyOutfit; onTap: () => void }) {
  const images = outfit.items.slice(0, 4).map(i => i.image_url).filter(Boolean) as string[];
  const brands = [...new Set(outfit.items.map(i => i.brand).filter(Boolean))].slice(0, 3);
  const hasHero = !!outfit.hero_image_url;
  const mainImage = images[0];
  const secondaryImages = images.slice(1, 3);

  return (
    <motion.button
      onClick={onTap}
      className="snap-start shrink-0 w-[200px] rounded-2xl border border-white/5 overflow-hidden text-left active:scale-[0.97] transition-transform glass-dark"
      whileTap={{ scale: 0.97 }}
    >
      {hasHero ? (
        <div className="aspect-[3/4] overflow-hidden bg-muted">
          <img src={outfit.hero_image_url!} alt={outfit.title} className="w-full h-full object-cover object-top" loading="lazy" />
        </div>
      ) : (
        <div className="bg-zinc-900/80 p-1.5">
          {/* Main piece — full width */}
          {mainImage && (
            <div className="w-full aspect-[4/3] overflow-hidden rounded-xl bg-zinc-800/60 mb-1">
              <img src={mainImage} alt="" className="w-full h-full object-contain p-2" loading="lazy" />
            </div>
          )}
          {/* Secondary pieces — two columns */}
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
      )}

      {/* Metadata overlay */}
      <div className="p-2.5 pt-2 border-t border-white/5">
        <p className="text-sm font-display font-semibold text-white truncate">{outfit.title}</p>
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
    </motion.button>
  );
}

export default WeeklyOutfitsSection;
