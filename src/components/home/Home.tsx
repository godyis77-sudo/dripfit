import { useState, useEffect, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Infinity as InfinityIcon } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { type CatalogProduct } from '@/hooks/useProductCatalog';

import OneTapPlayground from '@/components/home/OneTapPlayground';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { ALL_PRODUCT_CATEGORIES } from '@/components/tryon/tryon-constants';
import WeeklyOutfitsSection from '@/components/home/WeeklyOutfitsSection';
import SwipeFeedSection from '@/components/home/SwipeFeedSection';
import HomeBrowseErrorBoundary from '@/components/home/HomeBrowseErrorBoundary';
import { CARD, SPACING } from '@/lib/design-tokens';
// P3 placeholder — swap when real photography lands
import editorialScanImg from '@/assets/editorial-scan.jpg';

const HERO_CATEGORIES = [
  { key: 'all', label: 'For You' },
  { key: 'tops', label: 'Tops' },
  { key: 'bottom', label: 'Bottoms' },
  { key: 'outerwear', label: 'Outerwear' },
  { key: 'dress', label: 'Dresses' },
  { key: 'shoes', label: 'Shoes' },
] as const;

/**
 * Three home view-states, derived from auth + scan status:
 *  - 'guest'    : unauthenticated visitor (hero scan card + browse + swipe)
 *  - 'new-user' : authenticated, no body scan yet (hero scan card + onboarding paths)
 *  - 'returning': authenticated, scanned (editorial dashboard: drape, swipe, browse)
 */
type HomeViewState = 'guest' | 'new-user' | 'returning';

export interface HomeProps {
  /** Override view state for testing/storybook. Defaults: derived from auth + scan. */
  forceState?: HomeViewState;
  /** When true, hides catalog browse section (useful for stripped variants). */
  hideBrowse?: boolean;
}

const Home = forwardRef<HTMLDivElement, HomeProps>(({ forceState, hideBrowse = false }, ref) => {
  const navigate = useNavigate();
  const { user, userGender, genderLoaded, loading: authLoading } = useAuth();
  const mappedGender =
    userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;

  const catalogReady = !authLoading && (!user || genderLoaded);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [hasScan, setHasScan] = useState(false);
  const [scanChecked, setScanChecked] = useState(false);
  const [browseRetryKey, setBrowseRetryKey] = useState(0);
  const [, setScanCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Scan-count is non-critical: failure is silent (it only feeds an unused setter today).
    supabase
      .from('app_config')
      .select('value')
      .eq('key', 'total_scan_count')
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[Home] scan count fetch failed', error.message);
          return;
        }
        if (data?.value) setScanCount(parseInt(data.value, 10) || 0);
      });

    // Guests have nothing to check — mark resolved so the layout commits immediately.
    if (!user) {
      setScanChecked(true);
      setHasScan(false);
      return;
    }

    // Authenticated: probe body_scans. On error, degrade gracefully (assume no scan)
    // rather than trapping a returning user in a permanent loading state.
    setScanChecked(false);
    supabase
      .from('body_scans')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[Home] body_scans probe failed', error.message);
          setHasScan(false);
        } else {
          setHasScan(!!(data && data.length > 0));
        }
        setScanChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Derive view state from auth + scan. Returns null until the scan probe resolves
  // for authenticated users, so we don't flash the wrong layout.
  const viewState: HomeViewState | null = useMemo(() => {
    if (forceState) return forceState;
    if (!user) return 'guest';
    if (!scanChecked) return null;
    return hasScan ? 'returning' : 'new-user';
  }, [forceState, user, scanChecked, hasScan]);

  const visibleCategories = useMemo(
    () => HERO_CATEGORIES.filter(c => !(c.key === 'dress' && userGender === 'male')),
    [userGender]
  );

  const handleSelectProduct = (product: CatalogProduct) => {
    trackEvent('gallery_tryon_click', { brand: product.brand, category: product.category });
    navigate('/tryon', {
      state: { clothingUrl: product.image_url, productUrl: product.product_url },
    });
  };

  const showHeroScan = viewState === 'guest' || viewState === 'new-user';
  const showReturningStack = viewState === 'returning';
  const isResolvingViewState = viewState === null;

  return (
    <div ref={ref} className="relative bg-background pb-safe-tab">
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
        {/* ═══ HEADER — auth-aware ═══ */}
        {isResolvingViewState ? (
          // Resolving scan probe: render a quiet skeleton so the layout doesn't shift
          // when the real header (centered vs. left-aligned) commits.
          <div className="pt-3 pb-3" aria-hidden>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-6 w-32 rounded-md bg-white/[0.06] animate-pulse" />
              <div className="h-3 w-48 rounded-md bg-white/[0.04] animate-pulse" />
            </div>
            {/* Hero card placeholder to reserve vertical space */}
            <div className="mt-4 h-[260px] rounded-2xl bg-white/[0.03] border border-border/[0.04] animate-pulse" />
          </div>
        ) : showReturningStack ? (
          // Returning user: centered editorial wordmark
          <div className={`${SPACING.pagePx} pt-3 pb-3 -mx-4`}>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center gap-1.5"
            >
              <h1 className="font-display text-[24px] font-extrabold uppercase tracking-tight leading-none text-foreground">
                DRIPFIT <span className="text-primary text-[20px]">✔</span>
              </h1>
              <p className="type-data text-foreground/50">
                Verified · 186 brands · 9,000+ pieces
              </p>
            </motion.div>
          </div>
        ) : (
          // Guest / new user: left-aligned wordmark + sign-in
          <div className="flex items-center justify-between mb-1">
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-[28px] font-extrabold text-foreground uppercase tracking-tight leading-none">
                DRIPFIT <span className="text-primary text-[22px]">✔</span>
              </h1>
            </div>
            {!user && (
              <button
                onClick={() => navigate('/auth')}
                className="text-[12px] font-semibold text-foreground/60 tracking-[0.08em] uppercase border border-border rounded-full px-3.5 py-1 bg-transparent hover:border-primary/40 hover:text-primary/80 transition-colors active:opacity-70 shrink-0 ml-2"
              >
                Sign In
              </button>
            )}
          </div>
        )}

        {/* ═══ HERO SCAN CARD — guest + new user ═══ */}
        {showHeroScan && (
          <>
            <div
              onClick={() => {
                trackEvent('home_start_scan_click');
                navigate('/capture');
              }}
              className="relative w-full mb-3 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all bg-gradient-to-br from-[#1A1A1A] via-[#141414] to-[rgba(212,175,55,0.08)]"
            >
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl pointer-events-none z-20"
                style={{
                  padding: '1.5px',
                  background:
                    'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.35) 35%, transparent 70%)',
                  WebkitMask:
                    'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              />
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl z-10">
                <div
                  className="absolute left-0 right-0 h-px"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 50%, transparent 100%)',
                    opacity: 0.1,
                    animation: 'scanline-sweep 4.5s linear infinite',
                  }}
                />
              </div>
              <div
                className="absolute bottom-0 right-0 w-56 h-56 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 80% 80%, rgba(212,175,55,0.14) 0%, transparent 65%)',
                  filter: 'blur(32px)',
                }}
              />
              {/* P3 — editorial scan photography (placeholder, swap when shot delivered) */}
              <div
                data-placeholder="p3-scan-photo"
                className="absolute inset-y-0 right-0 w-[55%] pointer-events-none rounded-2xl overflow-hidden"
                aria-hidden
              >
                <img
                  src={editorialScanImg}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-[0.32]"
                  style={{
                    maskImage:
                      'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 35%, transparent 95%)',
                    WebkitMaskImage:
                      'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 35%, transparent 95%)',
                  }}
                />
              </div>
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.025]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  backgroundSize: '120px 120px',
                }}
              />

              <div className="relative z-10 px-6 py-7">
                <p className="type-data text-primary/70 font-bold mb-3">
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
                  YOUR BIOMETRIC SCAN.
                </h2>
                <p className="font-sans text-[14px] font-light text-foreground/75 leading-snug max-w-[300px] mb-4">
                  2 photos. 60 seconds. Your exact size across 186 brands — locked.
                </p>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    navigate('/capture');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-primary text-primary-foreground text-[14px] font-bold tracking-wide hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Start the Scan <ArrowRight className="h-4 w-4" />
                </button>
                <p className="type-data text-foreground/40 text-center mt-3">
                  186 BRANDS · 389 SIZE CHARTS · 9,000+ PIECES
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/browse/all')}
              className="w-full text-center text-xs text-zinc-500 mb-4 active:opacity-70 transition-opacity"
            >
              Skip — explore first →
            </button>
          </>
        )}

        {/* ═══ RETURNING USER STACK — Drape + Swipe + Verified Size ═══ */}
        {showReturningStack && (
          <>
            {/* THE DROP · THIS WEEK — hero swipe (top placement) */}
            <SwipeFeedSection gender={mappedGender} />

            <div className="border-t border-border/[0.06] my-3" />

            {/* THE DRAPE — Tier 1 editorial primary */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              onClick={() => {
                trackEvent('gallery_hero_tryon');
                navigate('/tryon');
              }}
              className="relative w-full mb-3 rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-md border border-border/[0.06] border-t-2 border-t-primary px-5 py-5 flex items-center justify-between active:scale-[0.97] transition-transform hover:bg-white/[0.05]"
            >
              <div className="text-left flex-1 min-w-0">
                <p className="font-serif text-[24px] font-bold italic text-foreground tracking-tight leading-tight">
                  The Drape Studio
                </p>
                <p className="font-sans text-[12px] text-muted-foreground mt-1">
                  Infinite Try-On Studio
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-[12px] font-bold tracking-wide">
                  Enter <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <div
                className="w-14 h-14 rounded-full bg-primary/[0.08] blur-xl pointer-events-none shrink-0 ml-2"
                aria-hidden
              />
            </motion.button>

            {/* THE INFINITE CLOSET — COP or DROP swipe (consolidated, Tier 1 editorial) */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => {
                trackEvent('home_infinite_closet_click');
                navigate('/closet');
              }}
              className="relative w-full mb-3 rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-md border border-border/[0.06] border-t-2 border-t-primary px-5 py-5 flex items-center justify-between active:scale-[0.97] transition-transform hover:bg-white/[0.05]"
            >
              <div className="text-left flex-1 min-w-0">
                <p className="font-serif text-[24px] font-bold italic text-foreground tracking-tight leading-tight">
                  The Infinite Closet
                </p>
                <p className="font-sans text-[12px] text-muted-foreground mt-1">
                  COP or DROP · new daily
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-[12px] font-bold tracking-wide">
                  Swipe <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <div
                className="w-14 h-14 rounded-full bg-primary/[0.08] blur-xl pointer-events-none shrink-0 ml-2"
                aria-hidden
              />
            </motion.button>



            {/* Weekly Outfits — secondary editorial */}
            <WeeklyOutfitsSection />
          </>
        )}

        {/* ═══ Guest / new-user: community swipe + drape + weekly drip ═══ */}
        {showHeroScan && (
          <>
            <SwipeFeedSection gender={mappedGender} />

            {/* THE INFINITE CLOSET — flow hub entry */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => navigate('/infinite-closet')}
              className="relative w-full mb-3 rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-md border border-border/[0.06] border-t-2 border-t-primary px-5 py-5 flex items-center justify-between active:scale-[0.97] transition-transform hover:bg-white/[0.05]"
            >
              <div className="text-left flex-1 min-w-0">
                <p className="font-serif text-[24px] font-bold italic text-foreground tracking-tight leading-tight">
                  The Infinite Closet
                </p>
                <p className="font-sans text-[12px] text-muted-foreground mt-1">
                  Discover · Try · Verdict · Buy. On loop.
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-[12px] font-bold tracking-wide">
                  How it works <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <div
                className="w-14 h-14 rounded-full bg-primary/[0.08] blur-xl pointer-events-none shrink-0 ml-2"
                aria-hidden
              />
            </motion.button>

            {/* THE DRAPE — Tier 1 editorial primary (guest entry to try-on) */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              onClick={() => {
                trackEvent('gallery_hero_tryon');
                navigate('/tryon');
              }}
              className="relative w-full mb-3 rounded-2xl overflow-hidden bg-white/[0.03] backdrop-blur-md border border-border/[0.06] border-t-2 border-t-primary px-5 py-5 flex items-center justify-between active:scale-[0.97] transition-transform hover:bg-white/[0.05]"
            >
              <div className="text-left flex-1 min-w-0">
                <p className="font-serif text-[24px] font-bold italic text-foreground tracking-tight leading-tight">
                  The Drape
                </p>
                <p className="font-sans text-[12px] text-muted-foreground mt-1">
                  Infinite Try-On Studio
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-[12px] font-bold tracking-wide">
                  Enter <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <div
                className="w-14 h-14 rounded-full bg-primary/[0.08] blur-xl pointer-events-none shrink-0 ml-2"
                aria-hidden
              />
            </motion.button>

            <WeeklyOutfitsSection />
          </>
        )}

        {/* One-Tap Playground — only for unauthenticated guests */}
        {viewState === 'guest' && <OneTapPlayground />}

        {/* Brand Size Guide — returning users only */}
        {showReturningStack && (
          <div className="w-full mb-4 mt-2 flex justify-end">
            <button
              onClick={() => navigate('/profile/body')}
              className="flex items-center gap-1 text-[11px] font-bold tracking-[0.12em] uppercase text-primary active:opacity-70 transition-opacity"
            >
              Brand Size Guide
              <ChevronRight className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
        )}

        {/* ═══ BROWSE — unified header + category pills + grid ═══ */}
        {!hideBrowse && !isResolvingViewState && (
          <HomeBrowseErrorBoundary
            key={browseRetryKey}
            onRetry={() => setBrowseRetryKey(k => k + 1)}
          >
            <div className="flex items-center justify-between mb-3 mt-2">
              <p className="font-sans text-[11px] font-bold tracking-[0.15em] uppercase text-foreground/70">
                Browse · 9,000+ Pieces
              </p>
              <button
                onClick={() => navigate('/browse/all')}
                className="text-[11px] text-muted-foreground hover:text-foreground active:scale-95 transition-all px-2 py-1"
              >
                See all →
              </button>
            </div>

            <div
              className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide mb-3"
              onTouchStart={e => e.stopPropagation()}
              onTouchEnd={e => e.stopPropagation()}
            >
              {visibleCategories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors min-h-[36px] backdrop-blur-md ${
                    activeCategory === cat.key
                      ? 'bg-primary/10 border border-primary/30 text-primary'
                      : 'bg-white/5 border border-border/10 text-foreground/70'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

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
                    title={
                      HERO_CATEGORIES.find(c => c.key === activeCategory)?.label || activeCategory
                    }
                    collapsed={false}
                    maxItems={100}
                    gender={mappedGender}
                    onSelectProduct={handleSelectProduct}
                  />
                )}
              </div>
            ) : (
              <div className="mb-6 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            )}
          </HomeBrowseErrorBoundary>
        )}
      </div>
    </div>
  );
});

Home.displayName = 'Home';

export default Home;
