import { forwardRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Sparkles, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';

interface CategoryProductGridProps {
  category: string;
  title?: string;
  collapsed?: boolean;
  onSelectProduct?: (product: CatalogProduct) => void;
  maxItems?: number;
  seed?: number;
  showViewAll?: boolean;
  priceFilter?: { min: number; max: number } | null;
  gender?: string;
  brand?: string;
}

const CategoryProductGrid = forwardRef<HTMLDivElement, CategoryProductGridProps>(({
  category,
  title,
  collapsed = true,
  onSelectProduct,
  maxItems = 8,
  seed,
  showViewAll = false,
  priceFilter,
  gender,
  brand,
}, ref) => {
  const navigate = useNavigate();
  const { products, loading } = useProductCatalog(category, brand, seed, gender);
  const [expanded, setExpanded] = useState(!collapsed);
  const [previewProduct, setPreviewProduct] = useState<CatalogProduct | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setFailedImageIds(new Set());
    setVisibleCount(PAGE_SIZE);
  }, [category, products.length]);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    if (previewProduct) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [previewProduct]);

  let visibleProducts = products;

  // Apply price filter
  if (priceFilter) {
    visibleProducts = visibleProducts.filter(p => {
      if (!p.price_cents) return false;
      const dollars = p.price_cents / 100;
      return dollars >= priceFilter.min && dollars <= priceFilter.max;
    });
  }

  if (loading && visibleProducts.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl skeleton-gold aspect-[3/4]" />
        ))}
      </div>
    );
  }

  if (visibleProducts.length === 0) {
    if (brand) {
      return (
        <div className="text-center py-8">
          <p className="text-[11px] text-muted-foreground">No items found for <span className="font-bold text-foreground">{brand}</span> in this category.</p>
        </div>
      );
    }
    return null;
  }

  const displayed = expanded ? visibleProducts.slice(0, Math.min(visibleCount, maxItems)) : visibleProducts.slice(0, 4);
  const totalAvailable = expanded ? Math.min(visibleProducts.length, maxItems) : visibleProducts.length;
  const hasMore = expanded && displayed.length < totalAvailable;

  return (
    <div ref={ref}>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 min-h-[44px]"
          >
            <p className="text-[11px] font-bold text-foreground capitalize">{title}</p>
            {visibleProducts.length > 4 && (
              expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          {showViewAll && visibleProducts.length > 0 && (
            <button
              onClick={() => navigate(`/browse/${category}`)}
              className="text-[10px] text-primary font-semibold min-h-[44px] flex items-center"
            >
              View all →
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {displayed.map(product => (
          <button
            key={product.id}
            onClick={() => {
              trackEvent('catalog_product_preview', { brand: product.brand, category: product.category });
              setPreviewProduct(product);
            }}
            className="relative rounded-2xl overflow-hidden border border-border/50 bg-card product-card text-left group"
          >
            {/* Image area — 3:4 aspect */}
            <div className="relative aspect-[3/4] bg-muted overflow-hidden">
              {failedImageIds.has(product.id) ? (
                <div className="w-full h-full flex items-center justify-center p-2 bg-muted text-center">
                  <span className="text-[10px] font-semibold text-muted-foreground line-clamp-2 uppercase tracking-wide">
                    {product.brand}
                  </span>
                </div>
              ) : (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={() => {
                    setFailedImageIds(prev => {
                      if (prev.has(product.id)) return prev;
                      const next = new Set(prev);
                      next.add(product.id);
                      return next;
                    });
                  }}
                />
              )}
              {/* Brand pill — bottom right of image */}
              <div className="absolute bottom-1.5 right-1.5">
                <span className="brand-label">{product.brand}</span>
              </div>
            </div>
            {/* Info area */}
            <div className="p-2.5 flex flex-col">
              <p className="text-[9px] text-muted-foreground/70 uppercase tracking-[0.15em] mb-0.5">{product.brand}</p>
              <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-tight h-[28px]">{product.name}</p>
              <p className="text-[12px] font-bold text-primary mt-1 h-[18px]">
                {product.price_cents ? `$${(product.price_cents / 100).toFixed(0)}` : '\u00A0'}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center mt-3">
          <Button
            className="rounded-lg btn-luxury text-primary-foreground h-10 px-6 text-xs font-bold"
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
          >
            Load More
          </Button>
        </div>
      )}

      {/* Fullscreen product preview */}
      <AnimatePresence>
        {previewProduct && createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] h-dvh w-screen bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 overflow-hidden overscroll-none"
            onClick={() => setPreviewProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative bg-card rounded-2xl overflow-hidden max-w-[280px] w-full max-h-[85vh] shadow-2xl border border-border/50 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setPreviewProduct(null)}
                className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
              >
                <X className="h-4 w-4 text-white" />
              </button>

              {/* Product image — constrained to not overflow viewport */}
              <div className="aspect-[4/5] bg-muted flex-shrink-0">
                <img
                  src={previewProduct.image_url}
                  alt={previewProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info + Actions */}
              <div className="p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{previewProduct.brand}</p>
                <p className="text-sm font-bold text-foreground mt-0.5 line-clamp-2">{previewProduct.name}</p>
                {previewProduct.price_cents && (
                  <p className="text-sm font-bold text-primary mt-1">
                    ${(previewProduct.price_cents / 100).toFixed(0)}
                  </p>
                )}

                <div className="flex gap-2 mt-3">
                  {onSelectProduct && (
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5 h-9 text-xs"
                      onClick={() => {
                        onSelectProduct(previewProduct);
                        setPreviewProduct(null);
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Try On
                    </Button>
                  )}
                  {previewProduct.product_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 h-9 text-xs"
                      onClick={() => {
                        trackEvent('catalog_product_clicked', { brand: previewProduct.brand, category: previewProduct.category });
                        window.open(previewProduct.product_url!, '_blank', 'noopener');
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Shop
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
});

CategoryProductGrid.displayName = 'CategoryProductGrid';

export default CategoryProductGrid;
