import { forwardRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Camera, ShoppingBag, X } from 'lucide-react';
import iconScan from '@/assets/icon-scan.png';
import iconTryon from '@/assets/icon-tryon.png';
import iconSizeguide from '@/assets/icon-sizeguide.png';
import iconStylecheck from '@/assets/icon-stylecheck.png';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { useProfileInfo, useLatestScan, useTrendingFits } from '@/hooks/useProfileData';
import TrendingFitsGrid from '@/components/home/TrendingFitsGrid';
import HomeFAB from '@/components/home/HomeFAB';
import BrandLogo from '@/components/ui/BrandLogo';

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
    <div ref={ref} className="relative bg-background pb-safe-tab aurora-bg">

      <div className="relative z-10 px-5 pt-5">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <BrandLogo size="sm" />
          <p className="text-muted-foreground/70 text-[12px] mt-0.5">{greeting}{displayName ? ',' : '!'}</p>
          {displayName && <h1 className="font-display text-xl font-bold text-foreground mt-0.5">{displayName}</h1>}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-1.5 mb-6"
        >
          {[
            {
              onClick: () => { trackEvent('home_quick_scan'); navigate('/capture'); },
              img: iconScan,
              title: hasScan ? 'Re-Scan' : 'Body Scan',
              subtitle: hasScan ? 'Update fit' : '60s scan',
            },
            {
              onClick: () => { trackEvent('home_quick_tryon'); navigate('/tryon'); },
              img: iconTryon,
              title: 'Try-On',
              subtitle: 'Virtual fit',
            },
            {
              onClick: () => { trackEvent('home_quick_sizeguide'); navigate('/size-guide'); },
              img: iconSizeguide,
              title: 'Size Guide',
              subtitle: 'Perfect fit',
            },
            {
              onClick: () => { trackEvent('home_quick_stylecheck'); navigate('/community'); },
              img: iconStylecheck,
              title: 'Style Check',
              subtitle: 'Get rated',
            },
          ].map((action) => (
            <button
              key={action.title}
              onClick={action.onClick}
              className="flex flex-col items-center rounded-xl border border-primary/25 bg-gradient-to-b from-primary/10 to-primary/5 backdrop-blur-sm px-1.5 pt-1.5 pb-1 gap-0.5 active:scale-[0.96] active:shadow-3d-gold-pressed transition-all min-h-[44px] shadow-3d shimmer-sweep"
            >
              <img
                src={action.img}
                alt={action.title}
                className="w-full aspect-square object-contain drop-shadow-[0_2px_6px_hsl(var(--drip-gold)/0.4)]"
              />
              <div className="text-center">
                <p className="text-[10px] font-extrabold font-display text-primary leading-none">{action.title}</p>
                <p className="text-[8px] font-body text-foreground/60 leading-none mt-px">{action.subtitle}</p>
              </div>
            </button>
          ))}
        </motion.div>

        {/* Trending Fits */}
        <TrendingFitsGrid fits={trendingFits} />

        {/* Price filter chips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mb-3"
        >
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {PRICE_FILTERS.map((filter, idx) => (
              <button
                key={filter.label}
                onClick={() => setActivePriceIdx(idx)}
                className={`shrink-0 pill shimmer-sweep ${
                  activePriceIdx === idx ? 'pill-filled' : ''
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </motion.div>

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

        {/* Gender nudge — above product grid so users see it */}
        {!userGender && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
            className="mb-3"
          >
            <button
              onClick={() => navigate('/profile/settings')}
              className="w-full bg-card border border-primary/20 rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="h-9 w-9 rounded-xl btn-gold-3d flex items-center justify-center shrink-0">
                <ShoppingBag className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="text-left flex-1">
                <p className="text-[12px] font-bold text-foreground">Personalize your picks</p>
                <p className="text-[10px] text-muted-foreground">Tell us how you shop for better recommendations</p>
              </div>
              <span className="text-[10px] font-bold text-primary shrink-0">Set →</span>
            </button>
          </motion.div>
        )}

        {/* Scan upsell — above product grid so users see it */}
        {hasScan === false && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-3"
          >
            <button
              onClick={() => navigate('/capture')}
              className="w-full bg-card border border-border rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="h-9 w-9 rounded-xl icon-3d-gold shimmer-sweep shrink-0">
                <Camera className="h-4 w-4 text-primary-foreground shimmer-icon" />
              </div>
              <div className="text-left">
                <p className="text-[12px] font-bold text-foreground">Get personalized size recommendations</p>
                <p className="text-[10px] text-muted-foreground">Complete a 60-second body scan for perfect fit</p>
              </div>
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
              <p className="section-label mb-0">Recommended for you</p>
            </div>
            <button
              onClick={() => navigate('/browse/tops')}
              className="text-[10px] text-primary font-semibold min-h-[44px] flex items-center"
            >
              Browse All →
            </button>
          </div>
          {genderLoaded && [
            { category: 'tops', title: 'Tops' },
            { category: 'bottom', title: 'Bottoms' },
            ...(mappedGender !== 'mens' ? [{ category: 'dress', title: 'Dresses' }] : []),
            { category: 'outerwear', title: 'Outerwear' },
            { category: 'shoes', title: 'Shoes' },
            { category: 'accessories', title: 'Trending Accessories' },
          ].map((section, idx) => (
            <div key={section.category} className={idx > 0 ? 'mt-3' : ''}>
              <CategoryProductGrid
                category={section.category}
                title={idx > 0 ? section.title : undefined}
                collapsed={idx > 0}
                maxItems={8}
                
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
