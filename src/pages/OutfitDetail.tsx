import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowLeft, ShoppingBag, Shirt, Share2, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWeeklyOutfits, type WeeklyOutfitItem } from '@/hooks/useWeeklyOutfits';
import { useAffiliateClickout } from '@/hooks/useAffiliateClickout';
import { Button } from '@/components/ui/button';
import { FullscreenImage } from '@/components/ui/fullscreen-image';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { decodeHtmlEntities } from '@/lib/utils';
import { OutfitDetailSkeleton } from '@/components/ui/page-skeleton';
import { usePageMeta } from '@/hooks/usePageMeta';

/** Inline product image with graceful fallback when the retailer CDN blocks hotlinks. */
function ItemImage({ src, alt, onClick }: { src: string; alt: string; onClick?: () => void }) {
  const [stage, setStage] = useState<'direct' | 'proxy' | 'failed'>('direct');

  // Strip protocol for weserv (it expects a bare host+path).
  const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(src.replace(/^https?:\/\//, ''))}&w=300&h=300&fit=cover`;

  if (stage === 'failed') {
    return (
      <div
        className="w-24 h-24 rounded-xl overflow-hidden bg-secondary shrink-0 flex items-center justify-center cursor-pointer"
        onClick={onClick}
      >
        <Shirt className="h-6 w-6 text-white/30" />
      </div>
    );
  }
  return (
    <div
      className="w-24 h-24 rounded-xl overflow-hidden bg-secondary shrink-0 cursor-pointer"
      onClick={onClick}
    >
      <img
        src={stage === 'direct' ? src : proxied}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setStage(prev => (prev === 'direct' ? 'proxy' : 'failed'))}
      />
    </div>
  );
}

const OutfitDetail = () => {
  usePageMeta({ title: 'Outfit', description: 'Curated weekly outfit with shoppable items in your size.' });
  const { outfitId } = useParams<{ outfitId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: outfits, isLoading } = useWeeklyOutfits();
  const { pendingClickout, beginClickout, confirmClickout, cancelClickout } = useAffiliateClickout({ extraProps: { source: 'outfit_detail' } });
  const [fullscreenItem, setFullscreenItem] = useState<WeeklyOutfitItem | null>(null);
  const [fullscreenHero, setFullscreenHero] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const outfit = outfits?.find(o => o.id === outfitId);

  const handleShop = useCallback((item: WeeklyOutfitItem) => {
    if (!item.product_url) return;
    beginClickout(item.brand || 'Unknown', item.product_url);
  }, [beginClickout]);

  const handleTryOn = useCallback((item: WeeklyOutfitItem) => {
    navigate('/tryon', { state: { clothingUrl: item.image_url, productUrl: item.product_url, freshSession: true } });
  }, [navigate]);

  const handleSaveToCloset = useCallback(async (item: WeeklyOutfitItem) => {
    if (!user) {
      toast({ title: 'Sign in to save', description: 'Create a free account to build your closet.', variant: 'destructive' });
      navigate('/auth');
      return;
    }
    if (!item.image_url) return;
    const { error } = await supabase.from('clothing_wardrobe').insert({
      user_id: user.id,
      image_url: item.image_url,
      category: item.category || 'top',
      brand: item.brand || null,
      product_link: item.product_url || null,
      is_saved: true,
      notes: item.product_name,
    });
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    setSavedIds(prev => new Set(prev).add(item.id));
    toast({ title: 'Saved to closet', description: item.product_name });
  }, [user, navigate]);

  if (isLoading) {
    return <OutfitDetailSkeleton />;
  }

  if (!outfit) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Layers className="h-10 w-10 text-primary opacity-60" />
        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">FIT NOT FOUND.</h1>
        <p className="text-sm text-muted-foreground max-w-[280px]">This outfit may have been removed or the link has expired.</p>
        <Button className="btn-luxury h-11 rounded-full px-8 text-sm font-semibold" onClick={() => navigate('/outfits-weekly')}>
          Browse This Week's Drip
        </Button>
        <button onClick={() => navigate(-1)} className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
          Go back
        </button>
      </div>
    );
  }

  const brands = [...new Set(outfit.items.map(i => i.brand).filter(Boolean))];
  const heroImage = outfit.hero_image_url || outfit.items[0]?.image_url;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero image — full width, tappable for fullscreen */}
      <div className="relative w-full aspect-[3/4] max-h-[80vh] overflow-hidden bg-black flex items-center justify-center">
        {heroImage && (
          <img
            src={heroImage}
            alt={outfit.title}
            className="w-full h-full object-contain cursor-pointer"
            onClick={() => setFullscreenHero(heroImage)}
          />
        )}

        {/* Gradient overlay at top for nav */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Bottom gradient overlay for title */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background via-background/80 to-transparent" />

        {/* Title overlay at bottom of hero */}
        <div className="absolute bottom-0 inset-x-0 px-4 pb-4 z-10">
          <h1 className="text-2xl font-display font-bold text-foreground leading-tight">{outfit.title}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            {outfit.total_price_cents > 0 && (
              <span className="text-base font-display font-bold text-primary">
                ${(outfit.total_price_cents / 100).toFixed(0)}
              </span>
            )}
            {outfit.occasion_label && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium glass-gold border border-primary/20 text-primary">
                {outfit.occasion_label}
              </span>
            )}
          </div>
          {brands.length > 0 && (
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1.5">
              {brands.join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {outfit.description && (
        <p className="px-4 pt-2 pb-3 text-[12px] text-muted-foreground leading-relaxed">
          {outfit.description}
        </p>
      )}

      {/* Product cards */}
      <div className="px-4 pb-32">
        <h3 className="text-[11px] tracking-widest uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" /> Items in this look
        </h3>

        <div className="space-y-3">
          {outfit.items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="flex gap-3 p-3 rounded-2xl glass-dark border border-white/5"
            >
              {item.image_url && (
                <ItemImage
                  src={item.image_url}
                  alt={decodeHtmlEntities(item.product_name)}
                  onClick={() => setFullscreenItem(item)}
                />
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">{decodeHtmlEntities(item.product_name)}</p>
                  {item.brand && (
                    <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mt-0.5">{item.brand}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  {item.price_cents != null && (
                    <p className="text-sm font-display font-bold text-primary">
                      ${(item.price_cents / 100).toFixed(0)}
                    </p>
                  )}
                  <div className="flex gap-1.5">
                    {item.product_url && (
                      <Button
                        size="sm"
                        className="h-7 text-[10px] px-2.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.1] text-white hover:bg-white/10"
                        onClick={() => handleShop(item)}
                      >
                        <ShoppingBag className="h-3 w-3 mr-1" /> Shop
                      </Button>
                    )}
                    {item.image_url && (
                      <Button
                        size="sm"
                        className="h-7 text-[10px] px-2.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/10 shadow-none"
                        onClick={() => handleTryOn(item)}
                      >
                        <Shirt className="h-3 w-3 mr-1" /> Try
                      </Button>
                    )}
                    {item.image_url && (
                      <Button
                        size="sm"
                        disabled={savedIds.has(item.id)}
                        className={`h-7 text-[10px] px-2.5 rounded-full border shadow-none ${savedIds.has(item.id) ? 'bg-primary/15 border-primary/30 text-primary' : 'bg-white/[0.06] border-white/[0.1] text-white hover:bg-white/10'}`}
                        onClick={() => handleSaveToCloset(item)}
                      >
                        {savedIds.has(item.id) ? 'Saved' : 'Save'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Fixed bottom CTA */}
      {outfit.items.length > 0 && outfit.items[0].image_url && (
        <div className="fixed bottom-0 inset-x-0 z-30 p-4 pb-safe bg-gradient-to-t from-background via-background to-transparent">
          <Button
            className="w-full h-12 bg-primary text-primary-foreground font-semibold text-sm rounded-full hover:opacity-90"
            onClick={() => handleTryOn(outfit.items[0])}
          >
            <Shirt className="h-4 w-4 mr-2" /> Try This Look On
          </Button>
        </div>
      )}

      {fullscreenHero && (
        <FullscreenImage src={fullscreenHero} alt={outfit.title} externalOpen onExternalClose={() => setFullscreenHero(null)} />
      )}

      {fullscreenItem && fullscreenItem.image_url && (
        <FullscreenImage
          src={fullscreenItem.image_url}
          alt={decodeHtmlEntities(fullscreenItem.product_name)}
          externalOpen
          onExternalClose={() => setFullscreenItem(null)}
          description={`${decodeHtmlEntities(fullscreenItem.product_name)}${fullscreenItem.brand ? ` · ${fullscreenItem.brand}` : ''}${fullscreenItem.price_cents != null ? ` · $${(fullscreenItem.price_cents / 100).toFixed(0)}` : ''}`}
          onShop={fullscreenItem.product_url ? () => handleShop(fullscreenItem) : undefined}
          onTryOn={() => handleTryOn(fullscreenItem)}
          onAddToWardrobe={savedIds.has(fullscreenItem.id) ? undefined : () => handleSaveToCloset(fullscreenItem)}
        />
      )}

      {pendingClickout && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 p-4" onClick={cancelClickout}>
          <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-card p-5 shadow-xl" onClick={e => { e.stopPropagation(); e.preventDefault(); }}>
            <p className="text-sm font-semibold text-foreground mb-1">Leaving DripCheck</p>
            <p className="text-[11px] text-muted-foreground mb-4">
              You'll be redirected to <strong>{pendingClickout.retailer}</strong>. We may earn a commission at no extra cost to you.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={(e) => { e.stopPropagation(); cancelClickout(); }} className="flex-1 h-9 rounded-lg border border-border/60 bg-card/40 text-foreground text-sm font-semibold active:scale-[0.97] transition-transform">Cancel</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); confirmClickout(); }} className="flex-1 h-9 rounded-lg btn-luxury text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform">Continue</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default OutfitDetail;