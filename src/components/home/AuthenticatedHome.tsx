import { forwardRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, ShoppingBag, X, Sparkles, ArrowRight } from 'lucide-react';
import { featureIcons } from '@/components/ui/FeatureIcon';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { ALL_PRODUCT_CATEGORIES } from '@/components/tryon/tryon-constants';
import { useProfileInfo, useLatestScan, useTrendingFits } from '@/hooks/useProfileData';
import TrendingFitsGrid from '@/components/home/TrendingFitsGrid';
import { useForYourFit } from '@/hooks/useForYourFit';
import { thumbnailUrl } from '@/lib/imageOptimize';

/* ── Price filter config ── */
const PRICE_FILTERS = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50–200', min: 50, max: 200 },
  { label: '$200–500', min: 200, max: 500 },
  { label: 'Luxury', min: 500, max: Infinity },
] as const;

const AuthenticatedHome = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { user, userGender, genderLoaded } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;
  const [activePriceIdx, setActivePriceIdx] = useState(0);
  const [rescanDismissed, setRescanDismissed] = useState(() => {
    const key = `rescan_nudge_dismissed_${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
    return localStorage.getItem(key) === 'true';
  });

  const { data: profileData } = useProfileInfo(user?.id);
  const { data: scanData } = useLatestScan(user?.id);
  const { data: trendingFits = [] } = useTrendingFits(user?.id);
  const { data: fitRecs = [] } = useForYourFit(user?.id);

  const hasScan = scanData !== undefined ? !!scanData : null;
  const daysSinceLastScan = scanData?.createdAt
    ? Math.floor((Date.now() - new Date(scanData.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const dismissRescanNudge = useCallback(() => {
    const key = `rescan_nudge_dismissed_${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
    localStorage.setItem(key, 'true');
    setRescanDismissed(true);
  }, []);

  const priceFilter = activePriceIdx === 0 ? null : { min: PRICE_FILTERS[activePriceIdx].min, max: PRICE_FILTERS[activePriceIdx].max };

  const firstName = profileData?.display_name?.split(' ')[0];

  return (
    <div ref={ref} className="relative bg-background pb-safe-tab">

      {/* ── Branded Header ── */}
      <div className="pt-[env(safe-area-inset-top)] px-5">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between pt-5 pb-4"
        >
          <div>
            <h1 className="headline-editorial text-xl text-primary tracking-tight">DRIPFIT ✔</h1>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/40 font-sans mt-0.5">
              {hasScan && firstName ? `${firstName}'s Fitting Room` : 'Your Body. Mapped.'}
            </p>
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/40 mb-5"
          style={{ fontFamily: '"DM Mono", monospace' }}
        >
          7,000+ pieces · 130 brands · 69 retailers
        </motion.p>
      </div>

      <div className="relative z-10 px-5">

        {/* ── Primary Action Cards — 2-column layout ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-2 gap-3 mb-5"
        >
          {/* Try-On Card */}
          <button
            onClick={() => navigate(hasScan === false ? '/capture' : '/tryon')}
            className="relative rounded-2xl p-4 text-left border border-border/30 bg-secondary/20 hover:border-primary/15 active:scale-[0.97] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-[60%] h-full opacity-[0.04] bg-gradient-to-bl from-primary to-transparent" />
            <img
              src={featureIcons.tryon}
              alt=""
              className="w-12 h-12 object-contain mb-3 drop-shadow-[0_2px_8px_hsl(var(--drip-gold)/0.3)]"
            />
            <p className="font-display text-[13px] font-bold text-foreground leading-tight">The Infinite Closet</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1 leading-snug">7,000 pieces. Your silhouette.</p>
            {hasScan === false && (
              <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                Start Scan <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </button>

          {/* Size Verification Card */}
          <button
            onClick={() => navigate('/size-guide')}
            className="relative rounded-2xl p-4 text-left border border-border/30 bg-secondary/20 hover:border-primary/15 active:scale-[0.97] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-[60%] h-full opacity-[0.04] bg-gradient-to-bl from-primary to-transparent" />
            <img
              src={featureIcons.sizeguide}
              alt=""
              className="w-12 h-12 object-contain mb-3 drop-shadow-[0_2px_8px_hsl(var(--drip-gold)/0.3)]"
            />
            <p className="font-display text-[13px] font-bold text-foreground leading-tight">Your Verified Size</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1 leading-snug">Mapped across 130 brands.</p>
          </button>
        </motion.div>

        {/* ── Secondary Quick Actions — horizontal row ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-6"
        >
          {[
            { onClick: () => { trackEvent('home_quick_scan'); navigate('/capture'); }, icon: featureIcons.post, label: hasScan ? 'Re-Scan' : 'Body Scan' },
            { onClick: () => { trackEvent('home_quick_stylecheck'); navigate('/community'); }, icon: featureIcons.stylecheck, label: 'COP / DROP' },
            { onClick: () => { trackEvent('home_quick_tryon'); navigate('/closet'); }, icon: featureIcons.tryon, label: 'My Closet' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex-1 flex flex-col items-center justify-center rounded-xl border border-border/20 bg-secondary/10 py-3 active:scale-[0.96] transition-all min-h-[44px]"
            >
              <img src={action.icon} alt="" className="w-7 h-7 object-contain mb-1.5 opacity-80" />
              <p className="text-[10px] font-semibold text-muted-foreground/60">{action.label}</p>
            </button>
          ))}
        </motion.div>

        {/* ── Contextual Nudges — max 1 visible ── */}
        {hasScan && daysSinceLastScan !== null && daysSinceLastScan >= 30 && !rescanDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mb-5 border border-primary/15 bg-primary/[0.04] rounded-xl p-3.5"
          >
            <div className="flex items-start gap-3">
              <Camera className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-foreground leading-snug">
                  Your last scan was {daysSinceLastScan} days ago — re-scan for accuracy
                </p>
                <button
                  onClick={() => navigate('/capture')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold active:scale-[0.97] transition-transform"
                >
                  Re-Scan Now
                </button>
              </div>
              <button onClick={dismissRescanNudge} className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {!userGender && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-5">
            <button
              onClick={() => navigate('/profile/settings')}
              className="w-full border border-primary/15 bg-primary/[0.04] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-[11px] font-semibold text-foreground flex-1 text-left">Personalize your picks</p>
              <span className="text-[10px] font-bold text-primary shrink-0">Set →</span>
            </button>
          </motion.div>
        )}

        {/* ── Trending Fits ── */}
        <TrendingFitsGrid fits={trendingFits} />

        {/* ── For Your Fit — items similar-body users loved ── */}
        {fitRecs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="font-display text-sm font-bold text-foreground">For Your Fit</p>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mb-3">Loved by people with similar measurements</p>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
              {fitRecs.map((rec, i) => (
                <button
                  key={`${rec.product_url}-${i}`}
                  onClick={() => {
                    trackEvent('fit_rec_click', { category: rec.category });
                    if (rec.product_url) window.open(rec.product_url, '_blank', 'noopener');
                  }}
                  className="shrink-0 w-[120px] rounded-xl overflow-hidden border border-border/20 bg-secondary/20 active:scale-[0.97] transition-transform"
                >
                  <div className="aspect-[3/4] bg-black/30 relative">
                    <img
                      src={thumbnailUrl(rec.clothing_photo_url, 300)}
                      alt={rec.category || 'Recommended'}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1 right-1 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {rec.engagement_count}🔥
                    </div>
                  </div>
                  <div className="p-1.5">
                    <p className="text-[10px] font-bold text-foreground capitalize truncate">{rec.category || 'Item'}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Divider ── */}
        <div className="h-px bg-border/15 my-2 mb-5" />

        {/* ── Product Catalog ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5 text-primary" />
              <p className="font-display text-sm font-bold text-foreground">Recommended for you</p>
            </div>
            <button
              onClick={() => navigate('/browse/all')}
              className="text-[10px] tracking-[0.1em] uppercase font-semibold min-h-[44px] flex items-center px-3 py-1 rounded-lg text-primary/70 hover:text-primary transition-colors"
            >
              Browse All →
            </button>
          </div>

          {/* Price filter chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide mb-2" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
            {PRICE_FILTERS.map((filter, idx) => (
              <button
                key={filter.label}
                onClick={() => setActivePriceIdx(idx)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ${
                  activePriceIdx === idx
                    ? 'border-primary/30 bg-primary/[0.08] text-primary'
                    : 'border-border/20 bg-secondary/10 text-muted-foreground/50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {genderLoaded && ALL_PRODUCT_CATEGORIES.map((cat, idx) => (
            <div key={cat.key} className={idx > 0 ? 'mt-4' : ''}>
              <CategoryProductGrid
                category={cat.key}
                title={cat.label}
                collapsed={true}
                maxItems={100}
                showViewAll={true}
                priceFilter={priceFilter}
                gender={mappedGender}
                onSelectProduct={(product) => {
                  trackEvent('catalog_product_tryon', { brand: product.brand, category: product.category });
                  navigate('/tryon', { state: { clothingUrl: product.image_url, productUrl: product.product_url } });
                }}
              />
            </div>
          ))}
          {!genderLoaded && (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl bg-secondary/20 aspect-[3/4] animate-pulse" />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
});

AuthenticatedHome.displayName = 'AuthenticatedHome';

export default AuthenticatedHome;
