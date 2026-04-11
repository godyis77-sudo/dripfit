import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag, Flame, Ruler, ArrowRight } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { type CatalogProduct } from '@/hooks/useProductCatalog';
import BrandLogo from '@/components/ui/BrandLogo';
import FeatureIcon from '@/components/ui/FeatureIcon';


import OneTapPlayground from '@/components/home/OneTapPlayground';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { ALL_PRODUCT_CATEGORIES } from '@/components/tryon/tryon-constants';
import WeeklyOutfitsSection from '@/components/home/WeeklyOutfitsSection';

const HERO_CATEGORIES = [
  { key: 'all', label: 'For You' },
  { key: 'tops', label: 'Tops' },
  { key: 'bottom', label: 'Bottoms' },
  { key: 'outerwear', label: 'Outerwear' },
  { key: 'dress', label: 'Dresses' },
  { key: 'shoes', label: 'Shoes' },
] as const;

const GalleryPlayground = () => {
  const navigate = useNavigate();
  const { user, userGender, genderLoaded, loading: authLoading } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;

  // Don't render product grids until auth + gender are resolved to avoid fetching with wrong gender
  const catalogReady = !authLoading && (!user || genderLoaded);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [hasScan, setHasScan] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('body_scans').select('id').eq('user_id', user.id).limit(1).then(({ data }) => {
      if (data && data.length > 0) setHasScan(true);
    });
  }, [user]);

  // Filter out dresses for men
  const visibleCategories = useMemo(() =>
    HERO_CATEGORIES.filter(c => !(c.key === 'dress' && userGender === 'male')),
    [userGender]
  );

  const handleSelectProduct = (product: CatalogProduct) => {
    trackEvent('gallery_tryon_click', { brand: product.brand, category: product.category });
    navigate('/tryon', { state: { clothingUrl: product.image_url, productUrl: product.product_url } });
  };

  return (
    <div className="relative bg-background pb-safe-tab">
      <div className="relative z-10 px-4 pt-2">
        {/* Header — transparent, editorial */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-[28px] font-extrabold text-foreground uppercase tracking-tight">DRIPFIT <span className="text-primary text-[22px]">✔</span></h1>
            <p className="font-sans text-[13px] font-medium tracking-[0.15em] uppercase text-foreground/70 mt-1 mb-3">
              {hasScan ? 'Your Body. Mapped.' : 'Your fitting room is ready.'}
            </p>
          </div>
          {!user && (
            <button
              onClick={() => navigate('/auth')}
              className="text-[11px] font-semibold text-white/40 active:opacity-70 tracking-widest uppercase"
            >
              Sign In
            </button>
          )}
        </div>

        {/* ═══ STATE A: New user (no scan) ═══ */}
        {!hasScan && (
          <>
            {/* Hero scan card */}
            <div
              onClick={() => { trackEvent('gallery_hero_scan'); navigate('/capture'); }}
              className="w-full mb-3 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all relative"
            >
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800/80 to-primary/10" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--primary)/0.12),transparent_60%)]" />
              <div className="relative px-6 py-10">
                <h2 className="font-serif text-2xl text-foreground font-semibold mb-2">Map Your Body</h2>
                <p className="text-sm text-zinc-400 max-w-[260px] leading-relaxed">
                  2 photos. 60 seconds. Your size across 130 brands — locked.
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/capture'); }}
                  className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  Start Your Scan <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Skip link */}
            <button
              onClick={() => navigate('/browse/all')}
              className="w-full text-center text-xs text-zinc-500 mb-4 active:opacity-70 transition-opacity"
            >
              Skip for now — browse the closet →
            </button>
          </>
        )}

        {/* ═══ STATE B: Returning user (scan completed) ═══ */}
        {hasScan && (
          <>
            {/* Stats bar */}
            <p
              className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground mb-4"
              style={{ fontFamily: '"DM Mono", monospace' }}
            >
              7,000+ pieces · 130 brands · 69 retailers
            </p>

            {/* Hero card — The Infinite Closet */}
            <div
              onClick={() => { trackEvent('gallery_hero_tryon'); navigate('/tryon'); }}
              className="w-full mb-3 bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl px-5 py-5 flex items-center gap-3 active:scale-[0.97] transition-all cursor-pointer hover:bg-white/[0.05]"
            >
              <div className="h-12 w-12 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                <FeatureIcon name="tryon" size={40} />
              </div>
              <div className="text-left flex-1">
                <p className="font-display text-[22px] font-semibold text-foreground leading-tight tracking-tight">The Infinite Closet</p>
                <p className="font-sans text-[14px] text-muted-foreground mt-1">7,000 pieces. Your exact silhouette.</p>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/tryon'); }}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary text-primary-foreground text-[12px] font-bold tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  Try On <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Secondary cards — side by side */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => navigate('/profile/body')}
                className="bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl px-4 py-4 flex items-center gap-2.5 active:scale-[0.97] transition-all hover:bg-white/[0.05]"
              >
                <Ruler className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="text-left">
                  <span className="block font-display text-[18px] font-semibold text-foreground leading-tight tracking-tight">Your Verified Size</span>
                  <span className="block font-sans text-[14px] text-muted-foreground leading-tight mt-1">Mapped across 130 brands</span>
                </div>
              </button>

              <button
                onClick={() => navigate('/closet')}
                className="bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl px-4 py-4 flex items-center gap-2.5 active:scale-[0.97] transition-all hover:bg-white/[0.05]"
              >
                <Flame className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="text-left">
                  <span className="block font-display text-[18px] font-semibold text-foreground leading-tight tracking-tight">COP / DROP</span>
                  <span className="block font-sans text-[14px] text-muted-foreground leading-tight mt-1">Your Body Twins weigh in.</span>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Weekly Outfits Hero Section */}
        <WeeklyOutfitsSection />

        {/* One-Tap Playground — interactive split-screen */}
        <OneTapPlayground />

        {/* Category pills — glass inactive, glass-gold active */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-2"
          onTouchStart={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          {visibleCategories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors min-h-[36px] backdrop-blur-md ${
                activeCategory === cat.key
                  ? 'bg-primary/8 border border-primary/20 text-primary'
                  : 'bg-white/5 border border-white/10 text-white/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Browse All — glass-gold pill */}
        <button
          onClick={() => navigate('/browse/all')}
          className="w-full mb-3 h-12 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.06] text-primary font-sans text-xs tracking-widest uppercase font-semibold active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Browse All 7,000+ Pieces
        </button>

        {/* Product Grid — category-broken like try-on page */}
        {catalogReady ? <div className="mb-6 space-y-2">
          {activeCategory === 'all' ? (
            ALL_PRODUCT_CATEGORIES.map(cat => (
              <CategoryProductGrid
                key={cat.key}
                category={cat.key}
                title={cat.label}
                collapsed={true}
                maxItems={100}
                gender={mappedGender}
                onSelectProduct={handleSelectProduct}
              />
            ))
          ) : (
            <CategoryProductGrid
              category={activeCategory}
              title={HERO_CATEGORIES.find(c => c.key === activeCategory)?.label || activeCategory}
              collapsed={false}
              maxItems={100}
              gender={mappedGender}
              onSelectProduct={handleSelectProduct}
            />
          )}
        </div> : (
          <div className="mb-6 space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}
      </div>

      {/* HomeFAB removed — actions already in quick-action grid */}
    </div>
  );
};

export default GalleryPlayground;
