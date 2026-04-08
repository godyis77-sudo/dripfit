import { forwardRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, ShoppingBag, X, Sparkles, Flame } from 'lucide-react';
import FeatureIcon, { featureIcons } from '@/components/ui/FeatureIcon';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { ALL_PRODUCT_CATEGORIES } from '@/components/tryon/tryon-constants';
import { useProfileInfo, useLatestScan, useTrendingFits } from '@/hooks/useProfileData';
import TrendingFitsGrid from '@/components/home/TrendingFitsGrid';
import HomeFAB from '@/components/home/HomeFAB';
import BrandLogo from '@/components/ui/BrandLogo';
import { useForYourFit } from '@/hooks/useForYourFit';

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

  const displayName = profileData?.display_name || user?.email?.split('@')[0] || '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const dismissRescanNudge = useCallback(() => {
    const key = `rescan_nudge_dismissed_${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
    localStorage.setItem(key, 'true');
    setRescanDismissed(true);
  }, []);

  const priceFilter = activePriceIdx === 0 ? null : { min: PRICE_FILTERS[activePriceIdx].min, max: PRICE_FILTERS[activePriceIdx].max };

  return (
    <div ref={ref} className="relative bg-background pb-safe-tab">

      {/* Editorial Hero */}
      <div className="relative h-[260px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-900 to-background" />
        <div className="absolute inset-0 editorial-gradient" />
        <div className="absolute bottom-6 left-0 right-0 text-center px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="headline-editorial text-xl text-primary">DRIPFIT ✔</h1>
            <p className="text-[11px] tracking-[0.2em] uppercase text-white/40 font-sans mt-1.5">
              Shop. Try On. Get Rated. Buy.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 px-5 -mt-4">
        {/* Virtual Try-On banner — glass-gold */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onClick={() => navigate('/tryon')}
          className="w-full mb-4 glass-gold rounded-2xl px-5 py-3.5 flex items-center gap-3 active:scale-[0.97] transition-transform"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <p className="font-display text-[14px] font-bold text-foreground">Enter the Change Room</p>
            <p className="text-[11px] text-white/40">Virtual try-on · any piece · your body</p>
          </div>
        </motion.button>

        {/* Quick Actions — glass style */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-1.5 mb-4"
        >
          {[
            {
              onClick: () => { trackEvent('home_quick_scan'); navigate('/capture'); },
              img: featureIcons.post,
              title: hasScan ? 'Re-Scan' : 'Body Scan',
              subtitle: hasScan ? 'Update fit' : '60s scan',
            },
            {
              onClick: () => { trackEvent('home_quick_tryon'); navigate('/tryon'); },
              img: featureIcons.tryon,
              title: 'Try-On',
              subtitle: 'Virtual fit',
            },
            {
              onClick: () => { trackEvent('home_quick_sizeguide'); navigate('/size-guide'); },
              img: featureIcons.sizeguide,
              title: 'Size Guide',
              subtitle: 'Perfect fit',
            },
            {
              onClick: () => { trackEvent('home_quick_stylecheck'); navigate('/community'); },
              img: featureIcons.stylecheck,
              title: 'Style Check',
              subtitle: 'Get rated',
            },
          ].map((action) => (
            <button
              key={action.title}
              onClick={action.onClick}
              className="flex flex-col items-center justify-center rounded-xl glass p-1 active:scale-[0.96] transition-all min-h-[44px]"
            >
              <img
                src={action.img}
                alt={action.title}
                className="w-full aspect-square object-contain drop-shadow-[0_2px_6px_hsl(var(--drip-gold)/0.4)]"
              />
              <p className="text-[11px] font-bold font-display text-primary leading-none">{action.title}</p>
            </button>
          ))}
        </motion.div>

        {/* The Closet CTA — glass-dark */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onClick={() => navigate('/closet')}
          className="w-full mb-4 glass-dark rounded-2xl px-5 py-3.5 flex items-center gap-3 active:scale-[0.97] transition-transform"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <p className="font-display text-[14px] font-bold text-foreground">The Closet</p>
            <p className="text-[11px] text-white/40">Swipe to cop or drop · discover your style</p>
          </div>
        </motion.button>

        {/* Trending Fits */}
        <TrendingFitsGrid fits={trendingFits} />

        {/* For Your Fit — items similar-body users loved */}
        {fitRecs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <p className="font-display text-sm font-bold text-foreground mb-0">For Your Fit</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">Loved by people with similar measurements</p>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
              {fitRecs.map((rec, i) => (
                <button
                  key={`${rec.product_url}-${i}`}
                  onClick={() => {
                    trackEvent('fit_rec_click', { category: rec.category });
                    if (rec.product_url) window.open(rec.product_url, '_blank', 'noopener');
                  }}
                  className="shrink-0 w-[120px] rounded-xl overflow-hidden border border-border/50 bg-card active:scale-[0.97] transition-transform"
                >
                  <div className="aspect-[3/4] bg-muted relative">
                    <img
                      src={rec.clothing_photo_url}
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

        {/* Re-scan nudge banner — above product grid for visibility */}
        {hasScan && daysSinceLastScan !== null && daysSinceLastScan >= 30 && !rescanDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="mb-3 bg-primary/10 border border-primary/20 rounded-xl p-3"
          >
            <div className="flex items-start gap-3">
              <Camera className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-foreground leading-snug">
                  Your last scan was {daysSinceLastScan} days ago — re-scan to keep your fit accurate
                </p>
                <button
                  onClick={() => navigate('/capture')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-gradient-to-b from-primary/90 to-primary text-primary-foreground text-[11px] font-bold shadow-3d-gold active:shadow-3d-gold-pressed active:translate-y-[1px] transition-all"
                >
                  Re-Scan Now
                </button>
              </div>
              <button
                onClick={dismissRescanNudge}
                className="h-8 w-8 min-h-[44px] min-w-[44px] rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Dismiss re-scan nudge"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Gender nudge — compact inline */}
        {!userGender && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.19 }} className="mb-3">
            <button
              onClick={() => navigate('/profile/settings')}
              className="w-full bg-card border border-primary/20 rounded-xl px-3 py-2 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-[11px] font-bold text-foreground flex-1 text-left">Personalize your picks</p>
              <span className="text-[10px] font-bold text-primary shrink-0">Set →</span>
            </button>
          </motion.div>
        )}

        {/* Scan upsell — compact */}
        {hasScan === false && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-3">
            <button
              onClick={() => navigate('/capture')}
              className="w-full bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
            >
              <Camera className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-[11px] font-bold text-foreground flex-1 text-left">60s body scan for perfect sizing</p>
              <span className="text-[10px] font-bold text-primary shrink-0">Scan →</span>
            </button>
          </motion.div>
        )}

        {/* Product grids */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-primary" />
              <p className="font-display text-sm font-bold text-foreground mb-0">Recommended for you</p>
            </div>
            <button
              onClick={() => navigate('/browse/all')}
              className="text-[10px] tracking-[0.1em] uppercase font-bold min-h-[44px] flex items-center px-3 py-1 rounded-lg btn-glass text-white/70"
            >
              Browse All 7,000+
            </button>
          </div>

          {/* Price filter chips — glass pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-1" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
            {PRICE_FILTERS.map((filter, idx) => (
              <button
                key={filter.label}
                onClick={() => setActivePriceIdx(idx)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                  activePriceIdx === idx
                    ? 'glass-gold text-primary border-primary/30'
                    : 'glass text-white/60'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {genderLoaded && ALL_PRODUCT_CATEGORIES.map((cat, idx) => (
            <div key={cat.key} className={idx > 0 ? 'mt-3' : ''}>
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
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl skeleton-gold aspect-[3/4]" />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <HomeFAB />
    </div>
  );
});

AuthenticatedHome.displayName = 'AuthenticatedHome';

export default AuthenticatedHome;
