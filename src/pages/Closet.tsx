import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X, Flame, Heart, ShoppingBag, SlidersHorizontal, Layers, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';
import { useUserGender } from '@/hooks/useUserGender';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { hapticFeedback } from '@/lib/haptics';
import { trackEvent } from '@/lib/analytics';
import { navigateToTryOn } from '@/lib/tryonNavigate';
import GenreFilter from '@/components/catalog/GenreFilter';
import type { BrandGenre } from '@/lib/brandGenres';
import BottomTabBar from '@/components/BottomTabBar';
import PageHeader from '@/components/layout/PageHeader';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { cn, decodeHtmlEntities } from '@/lib/utils';

const SWIPE_THRESHOLD = 100;

function SwipeCard({
  product,
  isTop,
  onSwipe,
  onTryOn,
  sizeLabel,
}: {
  product: CatalogProduct;
  isTop: boolean;
  onSwipe: (dir: 'left' | 'right') => void;
  onTryOn: () => void;
  sizeLabel?: string | null;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const copOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const dropOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const isDragging = useRef(false);

  const handleDragStart = () => { isDragging.current = true; };
  const handleDragEnd = (_: any, info: PanInfo) => {
    // Delay clearing drag flag so click events fired during drag release are suppressed
    setTimeout(() => { isDragging.current = false; }, 100);
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe('right');
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe('left');
    }
  };

  const price = product.price_cents
    ? `${(product.price_cents / 100).toFixed(0)}`
    : null;

  return (
    <motion.div
      className={cn(
        'absolute inset-0 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing',
        !isTop && 'pointer-events-none'
      )}
      style={isTop ? { x, rotate } : undefined}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.6 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.6 }}
      exit={{
        x: 300,
        opacity: 0,
        transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
      }}
    >
      <OptimizedImage
        src={product.image_url}
        alt={product.name}
        className="w-full h-full"
        loadingStrategy={isTop ? 'eager' : 'lazy'}
      />

      {/* Dark gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Product info */}
      <div className="absolute bottom-0 inset-x-0 p-4 pb-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-0.5">
          {product.brand}
        </p>
        <h3 className="font-display text-lg font-semibold leading-tight line-clamp-2 mb-1">
          {decodeHtmlEntities(product.name)}
        </h3>
        <div className="flex items-center gap-2">
          {price && (
            <span className="text-sm font-bold text-primary">
              ${price}
            </span>
          )}
          {product.style_genre && (
            <span className="text-[10px] uppercase tracking-wider text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
              {product.style_genre}
            </span>
          )}
        </div>
      </div>

      {/* YOUR SIZE badge */}
      {sizeLabel && (
        <div
          className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide"
          style={{
            background: 'rgba(212,175,55,0.15)',
            border: '1px solid rgba(212,175,55,0.4)',
            color: '#D4AF37',
          }}
        >
          YOUR SIZE: {sizeLabel}
        </div>
      )}

      {/* Try-On button */}
      <button
        onClick={(e) => { e.stopPropagation(); if (!isDragging.current) onTryOn(); }}
        className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 hover:ring-primary/60 transition-all"
      >
        <ShoppingBag className="h-4 w-4 text-white" />
      </button>

      {/* COP overlay */}
      {isTop && (
        <motion.div
          className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none"
          style={{ opacity: copOpacity }}
        >
          <div className="border-4 border-primary rounded-xl px-6 py-2 rotate-[-15deg]">
            <span className="text-primary font-display text-4xl font-black tracking-wider">COP</span>
          </div>
        </motion.div>
      )}

      {/* DROP overlay */}
      {isTop && (
        <motion.div
          className="absolute inset-0 bg-destructive/20 flex items-center justify-center pointer-events-none"
          style={{ opacity: dropOpacity }}
        >
          <div className="border-4 border-destructive rounded-xl px-6 py-2 rotate-[15deg]">
            <span className="text-destructive font-display text-4xl font-black tracking-wider">DROP</span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

const CLOSET_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'tops', label: 'Tops' },
  { key: 'bottoms', label: 'Bottoms' },
  { key: 'dresses', label: 'Dresses' },
  { key: 'outerwear', label: 'Outerwear' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'activewear', label: 'Activewear' },
  { key: 'swimwear', label: 'Swimwear' },
] as const;

const GENDER_OPTIONS = [
  { key: 'all', label: 'Both' },
  { key: 'mens', label: "Men's" },
  { key: 'womens', label: "Women's" },
] as const;

export default function Closet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { gender: profileGender } = useUserGender();
  const [genderFilter, setGenderFilter] = useState<string>(profileGender ?? 'all');
  const [category, setCategory] = useState<string>('all');
  const [genre, setGenre] = useState<BrandGenre | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDir, setExitDir] = useState<'left' | 'right'>('right');
  const [showFilters, setShowFilters] = useState(false);
  const [sessionCops, setSessionCops] = useState(0);

  // Total wardrobe count (for footer link)
  const { data: wardrobeCount = 0 } = useQuery({
    queryKey: ['wardrobe-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('clothing_wardrobe')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Sync profile gender on load
  useEffect(() => {
    if (profileGender) setGenderFilter(profileGender);
  }, [profileGender]);

  const activeGender = genderFilter === 'all' ? undefined : genderFilter;

  const { products, loading } = useProductCatalog(
    category === 'all' ? undefined : category,
    undefined,
    undefined,
    activeGender,
    genre ?? undefined,
  );

  // Filter out gender-inappropriate categories from visible list
  const visibleCategories = CLOSET_CATEGORIES.filter(c => {
    if (genderFilter === 'mens' && ['dresses', 'swimwear'].includes(c.key)) return false;
    return true;
  });

  // Fetch user's size recommendations (keyed by brand_slug)
  const { data: sizeMap } = useQuery({
    queryKey: ['size-recs-map', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('size_recommendations_cache')
        .select('brand_slug, recommended_size')
        .eq('user_id', user!.id);
      if (!data?.length) return {} as Record<string, string>;
      const map: Record<string, string> = {};
      data.forEach(r => { map[r.brand_slug] = r.recommended_size; });
      return map;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  const getSizeForProduct = useCallback((product: CatalogProduct) => {
    if (!sizeMap) return null;
    const slug = product.brand?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return slug ? sizeMap[slug] ?? null : null;
  }, [sizeMap]);

  const currentProduct = products[currentIndex];
  const nextProduct = products[currentIndex + 1];

  // Prefetch the next 3 images after the visible stack
  useEffect(() => {
    for (let i = 2; i <= 4; i++) {
      const p = products[currentIndex + i];
      if (p?.image_url) {
        const img = new Image();
        img.src = p.image_url;
      }
    }
  }, [currentIndex, products]);

  const saveToWardrobe = useCallback(async (product: CatalogProduct) => {
    if (!user) {
      toast({ title: 'Sign in to save items', variant: 'destructive' });
      return;
    }
    try {
      await supabase.from('clothing_wardrobe').upsert({
        user_id: user.id,
        image_url: product.image_url,
        category: product.category || 'top',
        product_link: product.product_url,
        retailer: product.retailer,
        brand: product.brand,
        is_liked: true,
        is_saved: true,
      } as any, { onConflict: 'user_id,image_url' });
      trackEvent('closet_cop', { brand: product.brand, category: product.category });
    } catch {
      // silent
    }
  }, [user]);

  const handleSwipe = useCallback((dir: 'left' | 'right') => {
    hapticFeedback(dir === 'right' ? 'medium' : 'light');
    setExitDir(dir);

    if (dir === 'right' && currentProduct) {
      saveToWardrobe(currentProduct);
      setSessionCops(prev => prev + 1);
      toast({ title: `🔥 ${currentProduct.brand} copped!`, duration: 1500 });
    }

    setCurrentIndex(prev => prev + 1);
  }, [currentProduct, saveToWardrobe]);

  const handleTryOn = useCallback(() => {
    if (!currentProduct) return;
    navigateToTryOn(navigate, {
      productUrl: currentProduct.product_url || undefined,
      fallbackClothingImageUrl: currentProduct.image_url,
      source: 'closet_swipe',
    });
  }, [currentProduct, navigate]);

  const resetIndex = () => setCurrentIndex(0);

  const handleGenreChange = (g: BrandGenre | null) => {
    setGenre(g);
    resetIndex();
  };

  const handleGenderChange = (g: string) => {
    setGenderFilter(g);
    // Reset category if it's hidden for new gender
    if (g === 'mens' && ['dresses', 'swimwear'].includes(category)) {
      setCategory('all');
    }
    resetIndex();
  };

  const handleCategoryChange = (c: string) => {
    setCategory(c);
    resetIndex();
  };

  const isEmpty = !loading && currentIndex >= products.length;
  const hasActiveFilters = genderFilter !== 'all' || category !== 'all' || genre !== null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="The Closet"
        backTo="/home"
        actions={
          sessionCops > 0 ? (
            <button
              onClick={() => navigate('/profile?tab=wardrobe')}
              className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold tracking-wide active:scale-95 transition-transform"
              aria-label={`View ${sessionCops} copped items`}
            >
              <Flame className="h-3 w-3" />
              {sessionCops} COPPED
              <ArrowRight className="h-3 w-3" />
            </button>
          ) : undefined
        }
      />

      {/* Gender toggle */}
      <div className="px-4 pt-2 flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {GENDER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => handleGenderChange(opt.key)}
              className={cn(
                'pill flex-1 text-center',
                genderFilter === opt.key && 'pill-active'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'h-8 w-8 rounded-xl flex items-center justify-center transition-colors',
            hasActiveFilters ? 'glass-gold' : 'glass'
          )}
        >
          <SlidersHorizontal className={cn('h-3.5 w-3.5', hasActiveFilters ? 'text-primary-foreground' : 'text-muted-foreground')} />
        </button>
      </div>

      {/* Category pills */}
      <div className="px-4 pt-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {visibleCategories.map(cat => (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={cn('shrink-0 pill', category === cat.key && 'pill-active')}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible genre filter */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-4"
          >
            <GenreFilter selectedGenre={genre} onGenreChange={handleGenreChange} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card stack */}
      <div className="relative mx-auto w-[calc(100%-2rem)] max-w-[360px] aspect-[3/4] mt-3">
        {loading ? (
          <div className="absolute inset-0 rounded-2xl skeleton-gold" />
        ) : isEmpty ? (
          <div className="absolute inset-0 rounded-2xl border border-border flex flex-col items-center justify-center gap-4 text-center px-6">
            <Heart className="h-9 w-9 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-display text-base text-foreground">
                {sessionCops > 0 ? `You copped ${sessionCops} this session.` : 'That\'s the rack.'}
              </p>
              <p className="text-muted-foreground text-xs">
                {sessionCops > 0 ? 'Take it to the next step.' : 'Adjust filters or check back later.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[240px] pt-1">
              <button
                onClick={() => navigate('/profile?tab=wardrobe')}
                className="h-11 rounded-full bg-primary text-primary-foreground text-[13px] font-bold tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Flame className="h-4 w-4" /> View Your Closet
              </button>
              <button
                onClick={() => navigate('/outfits')}
                className="h-11 rounded-full border border-border bg-card text-foreground text-[13px] font-bold tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Layers className="h-4 w-4" /> Build an Outfit
              </button>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {nextProduct && (
              <SwipeCard
                key={nextProduct.id}
                product={nextProduct}
                isTop={false}
                onSwipe={() => {}}
                onTryOn={() => {}}
                sizeLabel={getSizeForProduct(nextProduct)}
              />
            )}
            {currentProduct && (
              <SwipeCard
                key={currentProduct.id}
                product={currentProduct}
                isTop
                onSwipe={handleSwipe}
                onTryOn={handleTryOn}
                sizeLabel={getSizeForProduct(currentProduct)}
              />
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Action buttons */}
      {!isEmpty && !loading && (
        <div className="flex items-center justify-center gap-6 mt-5">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => handleSwipe('left')}
            className="h-14 w-14 rounded-full border-2 border-destructive/40 flex items-center justify-center bg-destructive/10 hover:bg-destructive/20 transition-colors"
          >
            <X className="h-6 w-6 text-destructive" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => handleSwipe('right')}
            className="h-16 w-16 rounded-full border-2 border-primary/60 flex items-center justify-center bg-primary/15 hover:bg-primary/25 transition-colors "
          >
            <Flame className="h-7 w-7 text-primary" />
          </motion.button>
        </div>
      )}

      {/* Progress indicator */}
      {!isEmpty && products.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          {currentIndex + 1} / {products.length}
        </p>
      )}

      <BottomTabBar />
    </div>
  );
}
