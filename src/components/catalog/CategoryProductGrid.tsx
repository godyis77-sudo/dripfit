import { useEffect, useState } from 'react';
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
}

const CategoryProductGrid = ({
  category,
  title,
  collapsed = true,
  onSelectProduct,
  maxItems = 8,
  seed,
  showViewAll = false,
  priceFilter,
  gender,
}: CategoryProductGridProps) => {
  const navigate = useNavigate();
  const { products, loading } = useProductCatalog(category, undefined, seed, gender);
  const [expanded, setExpanded] = useState(!collapsed);
  const [previewProduct, setPreviewProduct] = useState<CatalogProduct | null>(null);
  const [hiddenProductIds, setHiddenProductIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setHiddenProductIds(new Set());
  }, [category, products.length]);

  const hideProduct = (productId: string) => {
    setHiddenProductIds(prev => {
      if (prev.has(productId)) return prev;
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
  };

  let visibleProducts = products.filter(product => !hiddenProductIds.has(product.id));

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

  if (visibleProducts.length === 0) return null;

  const displayed = expanded ? visibleProducts.slice(0, maxItems) : visibleProducts.slice(0, 4);

  return (
    <div>
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
      <div className="grid grid-cols-2 gap-2.5">
        {displayed.map(product => (
          <button
            key={product.id}
            onClick={() => {
              trackEvent('catalog_product_preview', { brand: product.brand, category: product.category });
              setPreviewProduct(product);
            }}
            className="relative rounded-xl overflow-hidden border border-border bg-card active:scale-[0.97] transition-transform group text-left"
          >
            {/* Image area — 3:4 aspect, ~68% of card */}
            <div className="relative aspect-[3/4] bg-muted overflow-hidden">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth < 120 || img.naturalHeight < 120) {
                    hideProduct(product.id);
                  }
                }}
                onError={() => hideProduct(product.id)}
              />
              {/* Brand pill — bottom right of image */}
              <div className="absolute bottom-1.5 right-1.5 bg-background/80 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                <span className="text-[8px] font-bold text-foreground uppercase tracking-wider">{product.brand}</span>
              </div>
              {/* Size badge slot — top right, empty for now */}
              <div className="absolute top-1.5 right-1.5" />
            </div>
            {/* Info area */}
            <div className="p-2.5">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">{product.brand}</p>
              <p className="text-[11px] font-bold text-foreground line-clamp-2 leading-tight min-h-[28px]">{product.name}</p>
              {product.price_cents && (
                <p className="text-[12px] font-bold text-primary mt-1">
                  ${(product.price_cents / 100).toFixed(0)}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Fullscreen product preview */}
      <AnimatePresence>
        {previewProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center"
            onClick={() => setPreviewProduct(null)}
          >
            <button
              onClick={() => setPreviewProduct(null)}
              className="absolute top-4 right-4 z-[101] h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={previewProduct.image_url}
              alt={previewProduct.name}
              className="max-w-[85%] max-h-[55vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-center px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs text-white/60 uppercase tracking-wider">{previewProduct.brand}</p>
              <p className="text-base font-semibold text-white mt-0.5">{previewProduct.name}</p>
              {previewProduct.price_cents && (
                <p className="text-sm font-bold text-primary mt-1">
                  ${(previewProduct.price_cents / 100).toFixed(0)}
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-5 flex gap-3 px-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {onSelectProduct && (
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    onSelectProduct(previewProduct);
                    setPreviewProduct(null);
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Try On
                </Button>
              )}
              {previewProduct.product_url && (
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-white/20 text-white hover:bg-white/10"
                  onClick={() => {
                    trackEvent('catalog_product_clicked', { brand: previewProduct.brand, category: previewProduct.category });
                    window.open(previewProduct.product_url!, '_blank', 'noopener');
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Shop
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryProductGrid;
