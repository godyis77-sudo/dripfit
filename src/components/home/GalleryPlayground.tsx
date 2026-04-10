import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ShoppingBag, Flame, Ruler, ArrowRight } from 'lucide-react';

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
    <div className="relative bg-background pb-safe-tab">
      <div className="relative z-10 px-4 pt-2">
        {/* Header — transparent, editorial */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-sans text-2xl font-bold text-white tracking-tight">DRIPFIT <span className="text-primary">✔</span></h1>
            <p className="text-xs tracking-[0.2em] uppercase <p className="text-xs tracking-[0.2em] uppercase text-foreground/70 mt-0.5 mb-3">Your Body. Mapped.</p> mt-0.5 mb-3">Your Body. Mapped.</p>
          </div>
          {!user && (
            <button
              onClick={() => navigate('/auth')}
              className="text-[11px] font-semibold text-white/40 active:opacity-70 tracking-widest uppercase"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Stats bar */}
        <p
          className="text-center text-[10px] tracking-wider uppercase text-muted-foreground/60 mb-4"
          style={{ fontFamily: '"DM Mono", monospace' }}
        >
          7,000+ pieces · 130 brands · 69 retailers
        </p>

        {/* Hero Try-On CTA — glass-gold, primary action first */}
        <div
          onClick={() => { trackEvent('gallery_hero_tryon'); navigate(hasScan ? '/tryon' : '/capture'); }}
          className={`w-full mb-3 glass-gold rounded-2xl px-5 flex items-center gap-3 active:scale-[0.97] transition-transform cursor-pointer ${!hasScan && user ? 'py-5' : 'py-3'}`}
        >
          <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 opacity-70">
            <FeatureIcon name="tryon" size={40} />
          </div>
          <div className="text-left flex-1">
            <p className="font-display text-[15px] text-white">The Infinite Closet</p>
            <p className="text-[11px] text-white/40">7,000 pieces. Your exact silhouette.</p>
            {!hasScan && user && (
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/capture'); }}
                className="mt-2.5 inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary text-primary-foreground text-[12px] font-bold tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                Start Your Scan <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Size Guide + Drip Drawer — glass-dark panels */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => navigate(user && hasScan ? '/profile/body' : '/capture')}
            className="glass-dark rounded-2xl px-3 py-3 flex items-center gap-2 active:scale-[0.97] transition-transform"
          >
            <Ruler className="h-5 w-5 text-white/60 shrink-0" />
            <div className="text-left">
              <span className="block text-sm font-semibold text-white leading-tight">Your Verified Size</span>
              <span className="block text-[11px] text-white/40 leading-tight mt-0.5">Mapped across 130 brands</span>
            </div>
          </button>

          <button
            onClick={() => navigate('/closet')}
            className="glass-dark rounded-2xl px-3 py-3 flex items-center gap-2 active:scale-[0.97] transition-transform"
          >
            <Flame className="h-5 w-5 text-white/60 shrink-0" />
            <div className="text-left">
              <span className="block text-sm font-semibold text-white leading-tight">COP / DROP</span>
              <span className="block text-[11px] text-white/40 leading-tight mt-0.5"><span className="block text-[11px] text-white/40 leading-tight mt-0.5">Your Body Twins weigh in.</span></span>
            </div>
          </button>
        </div>

        {/* Weekly Outfits Hero Section */}
        <WeeklyOutfitsSection />

        {/* One-Tap Playground — interactive split-screen */}
        <OneTapPlayground />

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
          className="w-full mb-3 py-2 rounded-xl glass-gold text-primary text-sm tracking-wide uppercase font-sans font-bold active:scale-[0.97] transition-transform flex items-center justify-center gap-1"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Browse All 7,000+ Pieces
        </button>

        {/* Product Grid — category-broken like try-on page */}
        {catalogReady ? <div className="mb-6 space-y-2">
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
        </div> : (
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
