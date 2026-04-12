import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag, Flame, Ruler, ArrowRight, ChevronRight } from 'lucide-react';

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
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    // Fetch total scan count for social proof (all users)
    supabase.from('body_scans').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (count && count > 0) setScanCount(count);
    });
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
              {hasScan ? 'Your Body. Mapped.' : 'Scan to unlock your fitting room.'}
            </p>
          </div>
          {!user && (
            <button
              onClick={() => navigate('/auth')}
              className="text-[12px] font-semibold text-white tracking-[0.08em] uppercase active:opacity-70 border border-white/[0.35] rounded-full px-3.5 py-1 hover:border-primary/60 hover:text-primary transition-colors"
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
              onClick={() => { trackEvent('home_start_scan_click'); navigate('/capture'); }}
              className="w-full mb-3 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all relative"
            >
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] via-[#141414] to-[rgba(212,175,55,0.06)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(212,175,55,0.08),transparent_70%)]" />
              <div className="relative px-6 py-10">
                <h2 className="font-serif text-2xl text-foreground font-semibold mb-2 uppercase tracking-wide">Your Body. Mapped.</h2>
                <p className="text-sm text-zinc-400 max-w-[260px] leading-relaxed">
                  2 photos. 60 seconds. Your size across 186 brands — locked.
                </p>
                <p className="text-[12px] text-white/50 mt-2 mb-4">
                  {scanCount > 0 ? `${scanCount.toLocaleString()}+ bodies mapped across 186 brands` : '1,200+ bodies mapped across 186 brands'}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/capture'); }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  Start the Scan <ArrowRight className="h-4 w-4" />
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
              9,000+ pieces · 186 brands · 389 size charts
            </p>

            {/* Hero card — The Infinite Closet */}
            <div
              onClick={() => { trackEvent('gallery_hero_tryon'); navigate('/tryon'); }}
              className="relative w-full mb-3 bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl px-5 py-5 active:scale-[0.97] transition-all cursor-pointer hover:bg-white/[0.05]"
            >
              <p className="font-display text-[22px] font-semibold text-foreground leading-tight tracking-tight">The Infinite Closet</p>
              <p className="font-sans text-[14px] text-muted-foreground mt-1">9,000+ pieces. Your exact silhouette.</p>
              <div className="flex justify-end mt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/tryon'); }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.15] text-white text-[12px] font-bold tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  Browse Closet <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Secondary cards — side by side */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <button
                onClick={() => navigate('/profile/body')}
                className="relative bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl px-4 pr-8 py-4 text-left active:scale-[0.97] transition-all hover:bg-white/[0.05]"
              >
                <span className="block font-display text-[18px] font-semibold text-foreground leading-tight tracking-tight">Your Verified Size</span>
                <span className="block font-sans text-[14px] text-muted-foreground leading-tight mt-1">Mapped across 186 brands</span>
<ChevronRight className="w-4 h-4 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
              </button>

              <button
                onClick={() => navigate('/closet')}
                className="relative bg-white/[0.03] backdrop-blur-md border border-white/[0.06] rounded-2xl px-4 pr-8 py-4 text-left active:scale-[0.97] transition-all hover:bg-white/[0.05]"
              >
                <span className="block font-display text-[18px] font-semibold text-foreground leading-tight tracking-tight">COP / DROP</span>
                <span className="block font-sans text-[14px] text-muted-foreground leading-tight mt-1">Your Body Twins weigh in.</span>
                <ChevronRight className="w-4 h-4 text-zinc-400 absolute right-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
              </button>
            </div>
          </>
        )}

        {/* Weekly Outfits Hero Section */}
        <WeeklyOutfitsSection />

        {/* One-Tap Playground — interactive split-screen */}
        <OneTapPlayground />

        {/* Hero Scan CTA Strip — conditional on scan status */}
        {!hasScan ? (
          <button
            onClick={() => { trackEvent('home_scan_strip_click'); navigate('/capture'); }}
            className="w-full mb-4 rounded-2xl bg-primary/[0.08] border border-primary/30 px-4 py-3 flex items-center justify-between active:scale-[0.97] transition-transform"
          >
            <div>
              <p className="font-display text-[16px] font-bold text-foreground">Your body. Mapped. 60 seconds.</p>
              <p className="text-[13px] text-primary font-semibold mt-0.5">Start the scan →</p>
            </div>
          </button>
        ) : (
          <div className="w-full mb-4 rounded-2xl bg-primary/[0.04] border border-primary/10 px-4 py-2.5">
            <p className="text-[13px] font-semibold text-foreground/80">✓ Verified. Shop your fit.</p>
          </div>
        )}

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
          className="w-full mb-3 h-12 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-primary/30 text-primary font-sans text-xs tracking-widest uppercase font-semibold active:scale-[0.97] transition-transform flex items-center justify-center gap-2"
        >
          <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Enter the Infinite Closet
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
