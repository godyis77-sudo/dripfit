import { forwardRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import ProductPreviewModal from '@/components/ui/ProductPreviewModal';
import { getBrandGenre, type BrandGenre } from '@/lib/brandGenres';

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
  genre?: BrandGenre | null;
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
  genre,
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

  // Scroll lock handled by ProductPreviewModal

  let visibleProducts = products;

  // Apply genre filter
  if (genre) {
    visibleProducts = visibleProducts.filter(p => getBrandGenre(p.brand) === genre);
  }

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
            className="flex items-center gap-1.5 min-h-[44px] btn-gold-3d rounded-lg px-3 py-1.5"
          >
            <p className="text-[11px] capitalize">{title}</p>
            {visibleProducts.length > 4 && (
              expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
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
              <p className="text-[11px] text-muted-foreground/70 uppercase tracking-[0.15em] mb-0.5">{product.brand}</p>
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

      <ProductPreviewModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onTryOn={onSelectProduct ? (p) => {
          onSelectProduct(p as CatalogProduct);
          setPreviewProduct(null);
        } : undefined}
        onShop={previewProduct?.product_url ? (p) => {
          trackEvent('catalog_product_clicked', { brand: p.brand, category: p.category });
          window.open(p.product_url!, '_blank', 'noopener');
        } : undefined}
      />
    </div>
  );
});

CategoryProductGrid.displayName = 'CategoryProductGrid';

export default CategoryProductGrid;
