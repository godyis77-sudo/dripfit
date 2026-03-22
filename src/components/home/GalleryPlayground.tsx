import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ShoppingBag, SlidersHorizontal, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';
import BrandLogo from '@/components/ui/BrandLogo';
import HomeFAB from '@/components/home/HomeFAB';
import DemoTryOnSection from '@/components/home/DemoTryOnSection';
import ProductPreviewModal from '@/components/ui/ProductPreviewModal';

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
  const [previewProduct, setPreviewProduct] = useState<CatalogProduct | null>(null);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const { products, loading } = useProductCatalog(
    activeCategory === 'all' ? undefined : activeCategory,
    undefined,
    undefined,
    mappedGender,
  );

  // Filter out dresses for men
  const visibleCategories = useMemo(() =>
    HERO_CATEGORIES.filter(c => !(c.key === 'dress' && userGender === 'male')),
    [userGender]
  );

  const displayProducts = useMemo(() =>
    products.filter(p => !failedIds.has(p.id)).slice(0, 40),
    [products, failedIds]
  );

  const handleTryOn = (product: CatalogProduct) => {
    trackEvent('gallery_tryon_click', { brand: product.brand, category: product.category });
    navigate('/tryon', { state: { clothingUrl: product.image_url, productUrl: product.product_url } });
  };

  const formatPrice = (cents: number | null, currency: string) => {
    if (!cents) return null;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 0 }).format(cents / 100);
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
            <p className="text-[11px] text-muted-foreground mt-0.5">Tap any item to try it on instantly</p>
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

        {/* Hero Try-On CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => { trackEvent('gallery_hero_tryon'); navigate('/tryon'); }}
          className="w-full mb-4 btn-luxury text-primary-foreground rounded-2xl px-5 py-4 flex items-center gap-3 active:scale-[0.97] transition-transform shimmer-sweep"
        >
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-left flex-1">
            <p className="text-[14px] font-bold">Virtual Try-On</p>
            <p className="text-[11px] opacity-80">Upload your photo + pick any item below</p>
          </div>
        </motion.button>

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

        {/* Demo Try-On Results */}
        <DemoTryOnSection />

        <button
          onClick={() => navigate('/browse/tops')}
          className="w-full mb-3 py-2 rounded-xl border border-primary/20 bg-card text-[11px] font-bold text-primary active:scale-[0.97] transition-transform flex items-center justify-center gap-1"
        >
          <ShoppingBag className="h-3.5 w-3.5" /> Browse All →
        </button>

        {/* Product Grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {loading && !displayProducts.length ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="rounded-xl skeleton-gold aspect-[3/4]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {displayProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => setPreviewProduct(product)}
                  className="relative rounded-xl overflow-hidden bg-card border border-border group active:scale-[0.97] transition-transform text-left"
                >
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-top rounded-2xl"
                      onError={() => setFailedIds(prev => new Set(prev).add(product.id))}
                    />
                    {/* Quick Try-On overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pt-8 pb-2 px-2 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
                      <span
                        onClick={(e) => { e.stopPropagation(); handleTryOn(product); }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 text-black text-[10px] font-bold active:scale-95 transition-transform"
                      >
                        <Sparkles className="h-3 w-3" /> Try On
                      </span>
                    </div>
                    {/* Retailer badge */}
                    <span className="absolute bottom-1.5 right-1.5 brand-label text-[9px] px-1.5 py-0.5">
                      {product.retailer}
                    </span>
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider truncate">{product.brand}</p>
                    <p className="text-[11px] font-semibold text-foreground truncate leading-tight">{product.name}</p>
                    {product.price_cents && (
                      <p className="text-[12px] font-bold text-primary mt-0.5">
                        {formatPrice(product.price_cents, product.currency)}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && displayProducts.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-[13px] font-bold text-foreground mb-1">No items found</p>
              <p className="text-[11px] text-muted-foreground">Try a different category</p>
            </div>
          )}

          {displayProducts.length > 0 && (
            <button
              onClick={() => navigate(`/browse/${activeCategory === 'all' ? 'tops' : activeCategory}`)}
              className="w-full mt-4 mb-6 py-3 rounded-xl border border-border bg-card text-[12px] font-bold text-foreground/70 active:scale-[0.97] transition-transform"
            >
              Browse All →
            </button>
          )}
        </motion.div>
      </div>

      {user && <HomeFAB />}

      {previewProduct && (
        <ProductPreviewModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
          onTryOn={() => { handleTryOn(previewProduct); setPreviewProduct(null); }}
        />
      )}
    </div>
  );
};

export default GalleryPlayground;
