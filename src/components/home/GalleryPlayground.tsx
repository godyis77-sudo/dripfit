import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { type CatalogProduct } from '@/hooks/useProductCatalog';
import FeatureIcon, { featureIcons } from '@/components/ui/FeatureIcon';

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
  const catalogReady = !authLoading && (!user || genderLoaded);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [hasScan, setHasScan] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('body_scans').select('id').eq('user_id', user.id).limit(1).then(({ data }) => {
      if (data && data.length > 0) setHasScan(true);
    });
  }, [user]);

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
      <div className="relative z-10 px-5 pt-[env(safe-area-inset-top)]">

        {/* ── Branded Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between pt-5 pb-3"
        >
          <div>
            <h1 className="font-display text-[28px] font-extrabold text-foreground uppercase tracking-tight leading-none">
              DRIPFIT <span className="text-primary text-[22px]">✔</span>
            </h1>
            <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground/50 font-sans mt-1">
              Your Body. Mapped.
            </p>
          </div>
          {!user && (
            <button
              onClick={() => navigate('/auth')}
              className="text-[11px] font-semibold text-muted-foreground/40 active:opacity-70 tracking-widest uppercase"
            >
              Sign In
            </button>
          )}
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

        {/* ── Primary Action Cards — 2-column ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-2 gap-3 mb-4"
        >
          {/* Infinite Closet */}
          <button
            onClick={() => { trackEvent('gallery_hero_tryon'); navigate(hasScan ? '/tryon' : '/capture'); }}
            className="relative rounded-2xl p-4 text-left border border-border/30 bg-secondary/20 hover:border-primary/15 active:scale-[0.97] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-[60%] h-full opacity-[0.04] bg-gradient-to-bl from-primary to-transparent" />
            <div className="h-11 w-11 rounded-xl bg-primary/[0.06] flex items-center justify-center mb-3">
              <FeatureIcon name="tryon" size={32} />
            </div>
            <p className="font-display text-[13px] font-bold text-foreground leading-tight">The Infinite Closet</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1 leading-snug">7,000 pieces. Your silhouette.</p>
            {!hasScan && user && (
              <span className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                Start Scan <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </button>

          {/* Verified Size */}
          <button
            onClick={() => navigate(user && hasScan ? '/profile/body' : '/capture')}
            className="relative rounded-2xl p-4 text-left border border-border/30 bg-secondary/20 hover:border-primary/15 active:scale-[0.97] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-[60%] h-full opacity-[0.04] bg-gradient-to-bl from-primary to-transparent" />
            <div className="h-11 w-11 rounded-xl bg-primary/[0.06] flex items-center justify-center mb-3">
              <img src={featureIcons.sizeguide} alt="" className="w-7 h-7 object-contain" />
            </div>
            <p className="font-display text-[13px] font-bold text-foreground leading-tight">Your Verified Size</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1 leading-snug">Mapped across 130 brands.</p>
          </button>
        </motion.div>

        {/* ── Secondary Actions — horizontal ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-6"
        >
          {[
            { onClick: () => { trackEvent('home_quick_scan'); navigate('/capture'); }, icon: featureIcons.post, label: hasScan ? 'Re-Scan' : 'Body Scan' },
            { onClick: () => { trackEvent('home_quick_stylecheck'); navigate('/community'); }, icon: featureIcons.stylecheck, label: 'COP / DROP' },
            { onClick: () => navigate('/closet'), icon: featureIcons.tryon, label: 'My Closet' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex-1 flex flex-col items-center justify-center rounded-xl border border-border/20 bg-secondary/10 py-3 active:scale-[0.96] transition-all min-h-[44px]"
            >
              <img src={action.icon} alt="" className="w-7 h-7 object-contain mb-1.5 opacity-70" />
              <p className="text-[10px] font-semibold text-muted-foreground/50">{action.label}</p>
            </button>
          ))}
        </motion.div>

        {/* ── Weekly Outfits ── */}
        <WeeklyOutfitsSection />

        {/* ── One-Tap Playground ── */}
        <OneTapPlayground />

        {/* ── Divider ── */}
        <div className="h-px bg-border/15 my-2 mb-5" />

        {/* ── Category pills ── */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide mb-2"
          onTouchStart={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          {visibleCategories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-all border min-h-[36px] ${
                activeCategory === cat.key
                  ? 'border-primary/30 bg-primary/[0.08] text-primary'
                  : 'border-border/20 bg-secondary/10 text-muted-foreground/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Browse All */}
        <button
          onClick={() => navigate('/browse/all')}
          className="w-full mb-4 py-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] text-primary text-[12px] tracking-[0.1em] uppercase font-bold active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Browse All 7,000+ Pieces
        </button>

        {/* Product Grid */}
        {catalogReady ? (
          <div className="mb-6 space-y-4">
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
          <div className="mb-6 grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl bg-secondary/20 aspect-[3/4] animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryPlayground;
