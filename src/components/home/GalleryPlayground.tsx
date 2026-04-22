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
import WeeklySwipeDeck from '@/components/home/WeeklySwipeDeck';
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
            {hasScan && (
              <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-foreground/60 mt-1">
                Verified. Ready to drip. <span className="text-foreground/40">· 9,000+ · 186 brands · 389 size charts</span>
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
            {/* Hero scan card — editorial split layout */}
            <div
              onClick={() => { trackEvent('home_start_scan_click'); navigate('/capture'); }}
              className="relative w-full mb-3 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all bg-gradient-to-br from-[#1A1A1A] via-[#141414] to-[rgba(212,175,55,0.08)]"
            >
              {/* Gold gradient border (1.5px, mask-composite trick) */}
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl pointer-events-none z-20"
                style={{
                  padding: '1.5px',
                  background: 'linear-gradient(135deg, #C8A951 0%, rgba(200,169,81,0.35) 35%, transparent 70%)',
                  WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />

              {/* Subtle vertical scan-line — sweeps top → bottom on a slow loop */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl z-10">
                <div
                  className="absolute left-0 right-0 h-px"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, #C8A951 50%, transparent 100%)',
                    opacity: 0.1,
                    animation: 'scanline-sweep 4.5s linear infinite',
                  }}
                />
              </div>

              {/* Gold radial glow — bottom-right */}
              <div
                className="absolute bottom-0 right-0 w-56 h-56 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 80% 80%, rgba(212,175,55,0.14) 0%, transparent 65%)',
                  filter: 'blur(32px)',
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

              <div className="relative z-10 px-6 py-7">
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-primary/70 font-bold mb-3">
                  STEP 01 · YOUR SCAN
                </p>
                <h2
                  className="text-foreground leading-[1.05] mb-3"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    textTransform: 'uppercase',
                    fontSize: 'clamp(26px, 7vw, 32px)',
                  }}
                >
                  YOUR BODY. MAPPED.
                </h2>
                <p className="font-sans text-[13px] font-light text-white/70 leading-snug max-w-[280px] mb-2">
                  2 photos. 60 seconds. Your exact size across 186 brands — locked.
                </p>
                <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-white/40 mb-4">
                  186 BRANDS · 389 SIZE CHARTS · 9,000+ PIECES
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/capture'); }}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-primary text-primary-foreground text-[14px] font-bold tracking-wide hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Start the Scan <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-xs text-white/50 text-center mt-3 font-sans tracking-wide">
                  60 seconds. 186 brands. Encrypted.
                </p>
              </div>
            </div>

            {/* Skip link */}
            <button
              onClick={() => navigate('/browse/all')}
              className="w-full text-center text-xs text-zinc-500 mb-4 active:opacity-70 transition-opacity"
            >
              Skip — explore first →
            </button>

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

        {/* Weekly Drip — interactive swipe deck for unauthenticated/non-scanned users */}
        {!hasScan && <WeeklySwipeDeck />}

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
