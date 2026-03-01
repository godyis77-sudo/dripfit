import { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingBag, Sparkles, ExternalLink, X } from 'lucide-react';
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
}

const CategoryProductGrid = ({
  category,
  title,
  collapsed = true,
  onSelectProduct,
  maxItems = 8,
  seed,
}: CategoryProductGridProps) => {
  const { products, loading } = useProductCatalog(category, undefined, seed);
  const [expanded, setExpanded] = useState(!collapsed);
  const [previewProduct, setPreviewProduct] = useState<CatalogProduct | null>(null);

  if (loading && products.length === 0) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="shrink-0 w-[80px] aspect-square rounded-lg skeleton-gold" />
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  const displayed = expanded ? products.slice(0, maxItems) : products.slice(0, 4);

  return (
    <div>
      {title && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mb-2 w-full"
        >
          <p className="text-[11px] font-bold text-foreground capitalize">{title}</p>
          {products.length > 4 && (
            expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      )}
      <div className="grid grid-cols-4 gap-1.5">
        {displayed.map(product => (
          <button
            key={product.id}
            onClick={() => {
              trackEvent('catalog_product_preview', { brand: product.brand, category: product.category });
              setPreviewProduct(product);
            }}
            className="relative rounded-lg overflow-hidden border border-border bg-card active:scale-95 transition-transform group"
          >
            <div className="aspect-square bg-muted">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget.parentElement!.parentElement as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="p-1">
              <p className="text-[8px] text-muted-foreground truncate">{product.brand}</p>
              <p className="text-[9px] font-medium text-foreground truncate">{product.name}</p>
              {product.price_cents && (
                <p className="text-[9px] font-bold text-primary">
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

            {/* Product info */}
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

            {/* Action buttons */}
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
