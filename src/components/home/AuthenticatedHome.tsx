import { forwardRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Camera, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { useProfileInfo, useLatestScan, useTrendingFits } from '@/hooks/useProfileData';
import TrendingFitsGrid from '@/components/home/TrendingFitsGrid';
import HomeFAB from '@/components/home/HomeFAB';

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
    <div ref={ref} className="relative min-h-screen bg-background pb-safe-bottom">

      <div className="relative z-10 px-5 pt-5">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <p className="text-2xl font-bold text-primary tracking-tight">DripFit</p>
          <p className="text-muted-foreground text-[12px]">{greeting}{displayName ? ',' : '!'}</p>
          {displayName && <h1 className="font-display text-xl font-bold text-foreground">{displayName}</h1>}
        </motion.div>

        {/* Context-aware Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-2 mb-6"
        >
          {hasScan ? (
            <>
              <button
                onClick={() => { trackEvent('home_quick_scan'); navigate('/capture'); }}
                className="flex items-center gap-2.5 bg-card border border-border rounded-xl p-3 active:scale-[0.97] transition-transform min-h-[44px]"
              >
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <span className="text-base">📐</span>
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-bold text-foreground">Update Scan</p>
                  <p className="text-[10px] text-muted-foreground">Refresh your measurements</p>
                </div>
              </button>
              <button
                onClick={() => { trackEvent('home_quick_tryon'); navigate('/tryon'); }}
                className="flex items-center gap-2.5 bg-card border border-border rounded-xl p-3 active:scale-[0.97] transition-transform min-h-[44px]"
              >
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-bold text-foreground">Try-On</p>
                  <p className="text-[10px] text-muted-foreground">See it on you</p>
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { trackEvent('home_quick_scan'); navigate('/capture'); }}
                className="flex items-center gap-2.5 bg-card border border-border rounded-xl p-3 active:scale-[0.97] transition-transform min-h-[44px]"
              >
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <span className="text-base">📷</span>
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-bold text-foreground">Get Your Size</p>
                  <p className="text-[10px] text-muted-foreground">2 photos · 60 seconds</p>
                </div>
              </button>
              <button
                onClick={() => { trackEvent('home_quick_tryon'); navigate('/tryon'); }}
                className="flex items-center gap-2.5 bg-card border border-border rounded-xl p-3 active:scale-[0.97] transition-transform min-h-[44px]"
              >
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-bold text-foreground">Try-On</p>
                  <p className="text-[10px] text-muted-foreground">See it on you</p>
                </div>
              </button>
            </>
          )}
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
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors min-h-[36px] border ${
                  activePriceIdx === idx
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Re-scan nudge banner */}
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
                  Your last scan was {daysSinceLastScan} days ago — re-scan to check your fit
                </p>
                <button
                  onClick={() => navigate('/capture')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform"
                >
                  Re-Scan Now
                </button>
              </div>
              <button
                onClick={dismissRescanNudge}
                className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Dismiss re-scan nudge"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Product grids */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
              Try on →
            </button>
          </div>
          {genderLoaded && [
            { category: 'tops', title: 'Tops', seed: 42 },
            { category: 'bottom', title: 'Bottoms', seed: 314 },
            ...(mappedGender !== 'mens' ? [{ category: 'dress', title: 'Dresses', seed: 628 }] : []),
            { category: 'outerwear', title: 'Outerwear', seed: 1597 },
            { category: 'shoes', title: 'Shoes', seed: 2718 },
            { category: 'accessories', title: 'Trending Accessories', seed: 7777 },
          ].map((section, idx) => (
            <div key={section.category} className={idx > 0 ? 'mt-3' : ''}>
              <CategoryProductGrid
                category={section.category}
                title={idx > 0 ? section.title : undefined}
                collapsed={idx > 0}
                maxItems={8}
                seed={section.seed}
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

        {/* Gender nudge banner */}
        {!userGender && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="mb-4"
          >
            <button
              onClick={() => navigate('/profile/settings')}
              className="w-full bg-card border border-primary/20 rounded-xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="h-9 w-9 rounded-xl gradient-drip flex items-center justify-center shrink-0">
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

        {/* Contextual upsell if user hasn't scanned */}
        {hasScan === false && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8"
          >
            <button
              onClick={() => navigate('/capture')}
              className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-[12px] font-bold text-foreground">Get personalized size recommendations</p>
                <p className="text-[10px] text-muted-foreground">Complete a 60-second body scan for perfect fit</p>
              </div>
            </button>
          </motion.div>
        )}
      </div>

      {/* Speed-dial FAB */}
      <div className="fixed bottom-20 right-5 z-50 lg:right-[calc(50%-195px+20px)]">
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-3 flex flex-col gap-2.5 items-end"
            >
              {[
                { icon: <span className="text-sm">📷</span>, label: 'New Body Scan', action: () => navigate('/capture') },
                { icon: <Sparkles className="h-4 w-4 text-primary-foreground" />, label: 'New Try-On', action: () => navigate('/tryon') },
                { icon: <Bookmark className="h-4 w-4 text-primary-foreground" />, label: 'Save a Look', action: () => navigate('/style-check') },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.8 }}
                  transition={{ delay: idx * 0.06, duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-[11px] font-semibold text-foreground bg-card border border-border rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap">
                    {item.label}
                  </span>
                  <button
                    onClick={() => { closeFab(); item.action(); }}
                    className="h-11 w-11 rounded-full bg-primary shadow-lg flex items-center justify-center active:scale-90 transition-transform"
                  >
                    {item.icon}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setFabOpen(!fabOpen)}
          className="h-12 w-12 rounded-full bg-primary shadow-lg flex items-center justify-center"
          style={{ boxShadow: '0 0 24px -4px hsl(45 88% 40% / 0.4)' }}
          aria-label={fabOpen ? 'Close menu' : 'Quick actions'}
        >
          <Plus className={`h-5 w-5 text-primary-foreground transition-transform duration-200 ease-in-out ${fabOpen ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>
    </div>
  );
});

AuthenticatedHome.displayName = 'AuthenticatedHome';

export default AuthenticatedHome;
