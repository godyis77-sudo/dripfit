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
import SwipeFeedSection from '@/components/home/SwipeFeedSection';

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
    // Fetch cached scan count from app_config (public, no RLS issue)
    supabase.from('app_config').select('value').eq('key', 'total_scan_count').single().then(({ data }) => {
      if (data?.value) setScanCount(parseInt(data.value, 10) || 0);
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
      {/* Ambient gold haze behind wordmark */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '320px',
          height: '160px',
          background: 'radial-gradient(ellipse, rgba(212,175,55,0.07) 0%, transparent 70%)',
          filter: 'blur(40px)',
          zIndex: 0,
        }}
      />
      <div className="relative z-10 px-4 pt-1">
        {/* Header — transparent, editorial (compact) */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-[28px] font-extrabold text-foreground uppercase tracking-tight leading-none">DRIPFIT <span className="text-primary text-[22px]">✔</span></h1>
            {hasScan ? (
              <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-foreground/60 mt-1">
                Verified. Ready to drip. <span className="text-foreground/40">· 9,000+ · 186 brands · 389 size charts</span>
              </p>
            ) : (
              <p className="font-sans text-[13px] font-medium tracking-[0.15em] uppercase text-foreground/70 mt-1 mb-3">
                Your Infinite Drape Studio Awaits.
              </p>
            )}
          </div>
          {!user && (
            <button
              onClick={() => navigate('/auth')}
              className="text-[12px] font-semibold text-white/70 tracking-[0.08em] uppercase border border-white/20 rounded-full px-3.5 py-1 bg-transparent hover:border-primary/40 hover:text-primary/80 transition-colors active:opacity-70 shrink-0 ml-2"
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
              className="w-full mb-3 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all relative border-l-2 border-primary/40"
            >
              {/* Gold radial glow — bottom-right */}
              <div
                className="absolute bottom-0 right-0 w-56 h-56 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 80% 80%, rgba(212,175,55,0.14) 0%, transparent 65%)',
                  filter: 'blur(32px)',
                }}
              />
              {/* Subtle top-left cool shadow */}
              <div
                className="absolute top-0 left-0 w-40 h-40 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.015) 0%, transparent 70%)',
                }}
              />
              {/* Grain texture overlay */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.025]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  backgroundSize: '120px 120px',
                }}
              />
              <div className="relative px-6 py-10">
                <h2 className="font-serif text-2xl text-foreground font-semibold mb-2 uppercase tracking-wide">Your Body. Mapped.</h2>
                <p className="text-sm text-zinc-400 max-w-[260px] leading-relaxed">
                  2 photos. 60 seconds. Your size across 186 brands — locked.
                </p>
                <p className="text-[12px] text-white/50 mt-2 mb-4">
                  186 brands. 389 size charts. Zero guessing.
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
              Skip — explore first →
            </button>

            {/* COP OR DROP preview card */}
            <div className="w-full mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary/70">COP OR DROP</p>
                <button
                  onClick={() => navigate('/closet')}
                  className="font-sans text-[11px] text-muted-foreground active:opacity-70"
                >
                  See all →
                </button>
              </div>
              <div
                onClick={() => navigate('/auth')}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden flex items-stretch min-h-[100px] active:scale-[0.98] transition-transform cursor-pointer"
              >
                {/* Product image */}
                <div className="w-[40%] aspect-square bg-zinc-900 overflow-hidden shrink-0" />
                {/* Content */}
                <div className="w-[60%] px-4 py-3 flex flex-col">
                  <p className="font-sans text-[14px] font-semibold text-foreground leading-tight">Fresh Drop</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">New today</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-[12px] font-bold text-primary">94% COP</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-mono text-[10px] text-muted-foreground">2,847 votes</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/auth'); }}
                      className="flex-1 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[11px] font-bold"
                    >
                      🔥 COP
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate('/auth'); }}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[11px] font-bold"
                    >
                      👎 DROP
                    </button>
                  </div>
                  <p className="text-[9px] text-muted-foreground/50 text-center mt-1">Sign in to vote</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══ STATE B: Returning user (scan completed) ═══ */}
        {hasScan && (
          <>
            {/* Weekly Outfits — moved to top */}
            <WeeklyOutfitsSection />

            {/* Feature cards — full-width stack */}
            <div className="flex flex-col gap-3 mt-3">
              {/* THE DRAPE — primary */}
              <div
                onClick={() => { trackEvent('gallery_hero_tryon'); navigate('/tryon'); }}
                className="relative bg-white/[0.03] backdrop-blur-md border border-white/[0.06] border-t-2 border-t-primary rounded-2xl px-5 py-5 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:bg-white/[0.05]"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-[24px] font-bold italic text-foreground tracking-tight leading-tight">The Drape</p>
                  <p className="font-sans text-[12px] text-muted-foreground mt-1">Infinite Try On Studio</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-[12px] font-bold tracking-wide">
                    Enter <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="w-14 h-14 rounded-full bg-primary/[0.06] blur-xl pointer-events-none shrink-0 ml-2" aria-hidden />
              </div>

              {/* COP or DROP — compact */}
              <button
                onClick={() => navigate('/closet')}
                className="bg-white/[0.02] backdrop-blur-md border border-white/[0.04] rounded-2xl px-5 py-4 flex items-center justify-between text-left active:scale-[0.98] transition-all hover:bg-white/[0.04]"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-[16px] font-bold text-foreground leading-tight">COP or DROP</p>
                  <p className="font-sans text-[12px] text-muted-foreground mt-0.5">Swipe fresh pieces.</p>
                  <p className="font-mono text-[9px] tracking-widest uppercase text-primary/60 mt-1">New drops daily</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0 ml-2" strokeWidth={2} />
              </button>

              {/* Your Verified Size — contained row */}
              <button
                onClick={() => navigate('/profile/body')}
                className="w-full bg-white/[0.02] border border-white/[0.04] rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer active:scale-[0.97] transition-transform"
              >
                <div className="flex flex-col gap-0 text-left">
                  <span className="font-sans text-[13px] font-semibold text-foreground">Your Verified Size</span>
                  <span className="font-sans text-[10px] text-muted-foreground">186 brands mapped</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={2} />
              </button>
            </div>
          </>
        )}

        {/* Swipe Feed — The Drop (only for scanned users) */}
        {hasScan && <SwipeFeedSection />}

        {/* Weekly Outfits Hero Section — only for non-scanned (scanned users see it at top) */}
        {!hasScan && <WeeklyOutfitsSection />}

        {/* One-Tap Playground — only for unauthenticated users */}
        {!user && <OneTapPlayground />}


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
          <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Enter Infinite Drape Studio
        </button>

        {/* Product Grid — category-broken like try-on page */}
        {catalogReady ? (
          <div className="mb-6 space-y-2">
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
          </div>
        ) : (
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
