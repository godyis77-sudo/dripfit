import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag, Flame, Ruler } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { type CatalogProduct } from '@/hooks/useProductCatalog';
import BrandLogo from '@/components/ui/BrandLogo';
import FeatureIcon from '@/components/ui/FeatureIcon';
import HomeFAB from '@/components/home/HomeFAB';

import OneTapPlayground from '@/components/home/OneTapPlayground';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { ALL_PRODUCT_CATEGORIES } from '@/components/tryon/tryon-constants';
const WeeklyOutfitsSection = lazy(() => import('@/components/home/WeeklyOutfitsSection'));

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
  const { user, userGender, genderLoaded } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;

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
    <div className="relative bg-background pb-safe-tab aurora-bg">
      <div className="relative z-10 px-4 pt-2">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-3"
        >
          <div>
            <BrandLogo size="lg" />
            <p className="text-[11px] text-muted-foreground mt-0.5">Join 500+ early testers · Tap any item to try it on</p>
          </div>
          {!user && (
            <button
              onClick={() => navigate('/auth')}
              className="text-[11px] font-semibold text-muted-foreground active:opacity-70 tracking-widest uppercase"
            >
              Sign In
            </button>
          )}
        </motion.div>

        {/* Size Guide + Drip Drawer side by side */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            onClick={() => navigate(user && hasScan ? '/profile/body' : '/capture')}
            className="btn-luxury text-primary-foreground rounded-2xl px-3 py-3 flex items-center gap-2 active:scale-[0.97] transition-transform shimmer-sweep"
          >
            <Ruler className="h-5 w-5 text-primary-foreground shrink-0" />
            <div className="text-left">
              <span className="block text-[16px] font-extrabold tracking-tight text-primary-foreground drop-shadow-[0_1px_2px_hsl(var(--foreground)/0.25)] leading-tight">Size Guide</span>
              <span className="block text-[9px] font-semibold text-primary-foreground/90 leading-tight mt-0.5">Get your perfect fit</span>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => navigate('/closet')}
            className="btn-luxury text-primary-foreground rounded-2xl px-3 py-3 flex items-center gap-2 active:scale-[0.97] transition-transform shimmer-sweep"
          >
            <Flame className="h-5 w-5 text-primary-foreground shrink-0" />
            <div className="text-left">
              <span className="block text-[16px] font-extrabold tracking-tight text-primary-foreground drop-shadow-[0_1px_2px_hsl(var(--foreground)/0.25)] leading-tight">Walk-in Closet</span>
              <span className="block text-[9px] font-semibold text-primary-foreground/90 leading-tight mt-0.5">Swipe to fill your drip drawer</span>
            </div>
          </motion.button>
        </div>

        {/* Hero Try-On CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07 }}
          onClick={() => { trackEvent('gallery_hero_tryon'); navigate('/tryon'); }}
          className="w-full mb-4 btn-luxury text-primary-foreground rounded-2xl px-5 py-3 flex items-center gap-3 active:scale-[0.97] transition-transform shimmer-sweep"
        >
          <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <FeatureIcon name="tryon" size={40} />
          </div>
          <div className="text-left flex-1">
            <p className="text-[16px] font-extrabold tracking-tight text-primary-foreground drop-shadow-[0_1px_2px_hsl(var(--foreground)/0.25)]">Enter the Change Room—Try On</p>
            
          </div>
        </motion.button>

        {/* Weekly Outfits Hero Section */}
        <Suspense fallback={null}>
          <WeeklyOutfitsSection />
        </Suspense>


        {/* One-Tap Playground — interactive split-screen */}
        <OneTapPlayground />

        {/* Category pills */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-2"
          onTouchStart={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          {visibleCategories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors min-h-[36px] ${
                activeCategory === cat.key
                  ? 'btn-luxury text-primary-foreground'
                  : 'bg-card border border-border text-foreground/70'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </motion.div>

        <button
          onClick={() => navigate('/browse/all')}
          className="w-full mb-3 py-2 rounded-xl btn-luxury text-primary-foreground text-[11px] font-bold active:scale-[0.97] transition-transform flex items-center justify-center gap-1"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Browse All →
        </button>

        {/* Product Grid — category-broken like try-on page */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 space-y-2"
        >
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
        </motion.div>
      </div>

      {user && <HomeFAB />}
    </div>
  );
};

export default GalleryPlayground;
