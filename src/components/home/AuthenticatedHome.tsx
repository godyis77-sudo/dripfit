import { forwardRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, ShoppingBag, X, Sparkles, Flame, ArrowRight } from 'lucide-react';
import { featureIcons } from '@/components/ui/FeatureIcon';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { ALL_PRODUCT_CATEGORIES } from '@/components/tryon/tryon-constants';
import { useProfileInfo, useLatestScan, useTrendingFits } from '@/hooks/useProfileData';
import TrendingFitsGrid from '@/components/home/TrendingFitsGrid';
import SwipeFeedSection from '@/components/home/SwipeFeedSection';
import { useForYourFit } from '@/hooks/useForYourFit';
import { thumbnailUrl } from '@/lib/imageOptimize';
import { TYPE, CARD, BUTTON, SPACING } from '@/lib/design-tokens';

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

  return (
    <div ref={ref} className="relative bg-background pb-safe-tab">

      {/* Editorial Hero */}
      <div className="relative h-[260px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-900 to-background" />
        <div className="absolute inset-0 editorial-gradient" />
        <div className="absolute bottom-6 left-0 right-0 text-center px-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className={`${TYPE.brandMark} text-xl text-primary`}>DRIPFIT ✔</h1>
            <p className={TYPE.tagline + ' mt-1.5'}>
              {hasScan
                ? `${profileData?.display_name?.split(' ')[0] || 'Your'}'s Fitting Room`
                : 'Map Your Body'}
            </p>
          </motion.div>
        </div>
      </div>

      <div className={`relative z-10 ${SPACING.pagePx} -mt-4`}>
        {/* Stats bar */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className={`text-center ${TYPE.data} mb-3`}
        >
          7,000+ pieces · 130 brands · 69 retailers
        </motion.p>

        {/* Try-On banner — glass-gold */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onClick={() => navigate(hasScan === false ? '/capture' : '/tryon')}
          className={`w-full mb-4 ${CARD.glass} px-5 flex items-center gap-3 active:scale-[0.97] transition-transform cursor-pointer ${
            hasScan === false ? 'py-6' : 'py-3.5'
          }`}
        >
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <p className={TYPE.headlineSm + ' text-[14px]'}>Try On Any Piece</p>
            <p className={TYPE.body + ' text-[11px]'}>See it on your body before you buy</p>
            {hasScan === false && (
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/capture'); }}
                className={`mt-3 inline-flex items-center gap-1.5 ${BUTTON.primary} h-auto py-2 px-4 text-[12px]`}
              >
                Start Your Scan <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </motion.div>

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
              title: 'Your Verified Size',
              subtitle: '130 brands',
            },
            {
              onClick: () => { trackEvent('home_quick_stylecheck'); navigate('/community'); },
              img: featureIcons.stylecheck,
              title: 'COP or DROP',
              subtitle: 'Body twins',
            },
          ].map((action) => (
            <button
              key={action.title}
              onClick={action.onClick}
              className={`flex flex-col items-center justify-center rounded-xl ${CARD.glass} p-1 active:scale-[0.96] transition-all min-h-[44px]`}
            >
              <img
                src={action.img}
                alt={action.title}
                className="w-full aspect-square object-contain drop-shadow-[0_2px_6px_hsl(var(--drip-gold)/0.4)]"
              />
              <p className={TYPE.labelActive + ' text-[11px] font-bold leading-none'}>{action.title}</p>
            </button>
          ))}
        </motion.div>

        {/* Drip Drawer CTA — glass-dark */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onClick={() => navigate('/closet')}
          className={`w-full mb-4 ${CARD.glass} px-5 py-3.5 flex items-center gap-3 active:scale-[0.97] transition-transform`}
        >
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left flex-1">
            <p className={TYPE.headlineSm + ' text-[14px]'}>COP or DROP</p>
            <p className={TYPE.body + ' text-[11px]'}>Your Body Twins weigh in</p>
          </div>
        </motion.button>

        {/* The Drop — swipeable weekly looks + top posts */}
        <SwipeFeedSection gender={mappedGender} />

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
              <p className={TYPE.headlineSm + ' text-sm mb-0'}>For Your Fit</p>
            </div>
            <p className={TYPE.data + ' mb-2'}>Loved by people with similar measurements</p>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
              {fitRecs.map((rec, i) => (
                <button
                  key={`${rec.product_url}-${i}`}
                  onClick={() => {
                    trackEvent('fit_rec_click', { category: rec.category });
                    if (rec.product_url) window.open(rec.product_url, '_blank', 'noopener');
                  }}
                  className={`shrink-0 w-[120px] rounded-xl overflow-hidden ${CARD.glass} active:scale-[0.97] transition-transform`}
                >
                  <div className="aspect-[3/4] bg-black/30 relative">
                    <img
                      src={thumbnailUrl(rec.clothing_photo_url, 300)}
                      alt={rec.category || 'Recommended'}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-1 right-1 bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {rec.engagement_count}
                    </div>
                  </div>
                  <div className="p-1.5">
                    <p className={TYPE.productTitle + ' text-[10px] capitalize truncate'}>{rec.category || 'Item'}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Re-scan nudge banner */}
        {hasScan && daysSinceLastScan !== null && daysSinceLastScan >= 30 && !rescanDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className={`mb-3 ${CARD.glass} border-primary/20 p-3`}
          >
            <div className="flex items-start gap-3">
              <Camera className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className={TYPE.body + ' text-[12px] text-foreground leading-snug'}>
                  Your last scan was {daysSinceLastScan} days ago — re-scan to keep your fit accurate
                </p>
                <button
                  onClick={() => navigate('/capture')}
                  className={`mt-2 ${BUTTON.primary} h-auto py-1.5 px-3 text-[11px]`}
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
              className={`w-full ${CARD.glass} border-primary/20 rounded-xl px-3 py-2 flex items-center gap-2.5 active:scale-[0.98] transition-transform`}
            >
              <ShoppingBag className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className={TYPE.labelActive + ' flex-1 text-left text-[11px]'}>Personalize your picks</p>
              <span className={TYPE.labelActive + ' shrink-0 text-[10px]'}>Set →</span>
            </button>
          </motion.div>
        )}

        {/* Scan upsell — compact */}
        {hasScan === false && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-3">
            <button
              onClick={() => navigate('/capture')}
              className={`w-full ${CARD.glass} rounded-xl px-3 py-2 flex items-center gap-2.5 active:scale-[0.98] transition-transform`}
            >
              <Camera className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className={TYPE.label + ' flex-1 text-left text-[11px] text-foreground font-bold'}>60s body scan for perfect sizing</p>
              <span className={TYPE.labelActive + ' shrink-0 text-[10px]'}>Scan →</span>
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
              <p className={TYPE.headlineSm + ' text-sm mb-0'}>Recommended for you</p>
            </div>
            <button
              onClick={() => navigate('/browse/all')}
              className={BUTTON.ghost + ' min-h-[44px] px-3 py-1'}
            >
              Browse All 7,000+
            </button>
          </div>

          {/* Price filter chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-1" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
            {PRICE_FILTERS.map((filter, idx) => (
              <button
                key={filter.label}
                onClick={() => setActivePriceIdx(idx)}
                className={`shrink-0 ${BUTTON.chip} ${
                  activePriceIdx === idx ? BUTTON.chipActive : BUTTON.chipInactive
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
    </div>
  );
});

AuthenticatedHome.displayName = 'AuthenticatedHome';

export default AuthenticatedHome;
