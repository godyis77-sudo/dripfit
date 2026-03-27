import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X, Flame, Heart, ShoppingBag, SlidersHorizontal } from 'lucide-react';
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
import { cn } from '@/lib/utils';

const SWIPE_THRESHOLD = 100;

function SwipeCard({
  product,
  isTop,
  onSwipe,
  onTryOn,
}: {
  product: CatalogProduct;
  isTop: boolean;
  onSwipe: (dir: 'left' | 'right') => void;
  onTryOn: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const copOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const dropOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
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
      />

      {/* Dark gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Product info */}
      <div className="absolute bottom-0 inset-x-0 p-4 pb-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-white/70 mb-0.5">
          {product.brand}
        </p>
        <h3 className="font-display text-lg font-semibold leading-tight line-clamp-2 mb-1">
          {product.name}
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

      {/* Try-On button */}
      <button
        onClick={(e) => { e.stopPropagation(); onTryOn(); }}
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

export default function Closet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { gender } = useUserGender();
  const [genre, setGenre] = useState<BrandGenre | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDir, setExitDir] = useState<'left' | 'right'>('right');

  const { products, loading } = useProductCatalog(
    'all',
    undefined,
    undefined,
    gender ?? undefined,
    genre ?? undefined,
  );

  const currentProduct = products[currentIndex];
  const nextProduct = products[currentIndex + 1];

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

  // Reset index when filters change
  const handleGenreChange = (g: BrandGenre | null) => {
    setGenre(g);
    setCurrentIndex(0);
  };

  const isEmpty = !loading && currentIndex >= products.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="The Closet" backTo="/home" />

      <div className="px-4 pt-2">
        <GenreFilter selectedGenre={genre} onGenreChange={handleGenreChange} />
      </div>

      {/* Card stack */}
      <div className="relative mx-auto w-[calc(100%-2rem)] max-w-[360px] aspect-[3/4] mt-3">
        {loading ? (
          <div className="absolute inset-0 rounded-2xl skeleton-gold" />
        ) : isEmpty ? (
          <div className="absolute inset-0 rounded-2xl border border-border flex flex-col items-center justify-center gap-3 text-center px-6">
            <Heart className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              No more items! Change your genre filter or check back later.
            </p>
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
              />
            )}
            {currentProduct && (
              <SwipeCard
                key={currentProduct.id}
                product={currentProduct}
                isTop
                onSwipe={handleSwipe}
                onTryOn={handleTryOn}
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
            className="h-16 w-16 rounded-full border-2 border-primary/60 flex items-center justify-center bg-primary/15 hover:bg-primary/25 transition-colors shadow-gold-glow"
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
