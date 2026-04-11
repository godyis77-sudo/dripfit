import { forwardRef, useEffect, useRef, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import ProductPreviewModal from '@/components/ui/ProductPreviewModal';
import { type BrandGenre } from '@/lib/brandGenres';
import { thumbnailUrl } from '@/lib/imageOptimize';

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
  brands?: string[];
  genre?: BrandGenre | null;
  retailer?: string;
  retailers?: string[];
  fitProfile?: string;
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
  brands,
  genre,
  retailer,
  retailers,
  fitProfile,
}, ref) => {
  const navigate = useNavigate();
  
  // Viewport-aware lazy loading: don't fetch until near viewport
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setNearViewport(true); observer.disconnect(); } },
      { rootMargin: '400px' } // start fetching 400px before visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { products, loading } = useProductCatalog(category, brand, seed, gender, genre ?? undefined, fitProfile, !nearViewport);
  const [expanded, setExpanded] = useState(!collapsed);
  const [previewProduct, setPreviewProduct] = useState<CatalogProduct | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { revealRef } = useScrollReveal();

  useEffect(() => {
    setFailedImageIds(new Set());
    setVisibleCount(PAGE_SIZE);
  }, [category]);

  // Scroll lock handled by ProductPreviewModal

  let visibleProducts = products;

  // Apply retailer filter (client-side)
  if (retailers && retailers.length > 0) {
    visibleProducts = visibleProducts.filter(p => retailers.includes(p.retailer));
  } else if (retailer) {
    visibleProducts = visibleProducts.filter(p => p.retailer === retailer);
  }

  // Apply brand filter (client-side for multi)
  if (brands && brands.length > 0) {
    visibleProducts = visibleProducts.filter(p => brands.includes(p.brand));
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
      <div ref={sentinelRef} className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl border border-border/50 overflow-hidden">
            <div className="aspect-[3/4] skeleton-gold" />
            <div className="p-2.5 space-y-1.5">
              <div className="h-2.5 w-3/4 rounded skeleton-gold" />
              <div className="h-2 w-1/2 rounded skeleton-gold" />
              <div className="h-3 w-1/3 rounded skeleton-gold mt-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Not yet near viewport — render a lightweight sentinel so the observer can fire
  if (!nearViewport && visibleProducts.length === 0) {
    return <div ref={sentinelRef} className="h-1" />;
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

  const COLLAPSED_COUNT = 4;
  const displayed = expanded ? visibleProducts.slice(0, Math.min(visibleCount, maxItems)) : visibleProducts.slice(0, COLLAPSED_COUNT);
  const hasMore = expanded
    ? displayed.length < Math.min(visibleProducts.length, maxItems)
    : visibleProducts.length > COLLAPSED_COUNT;

  return (
    <div ref={(node) => {
      // Forward both refs
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      sentinelRef.current = node;
    }}>
      {title && (
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 min-h-[44px] glass-gold rounded-lg px-3 py-1.5"
          >
            <p className="text-[11px] capitalize font-display font-bold text-primary">{title}</p>
            {visibleProducts.length > 4 && (
              expanded ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />
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
        {displayed.map((product, idx) => (
          <button
            key={product.id}
            ref={revealRef(idx)}
            onClick={() => {
              trackEvent('catalog_product_preview', { brand: product.brand, category: product.category });
              setPreviewProduct(product);
            }}
            className="relative rounded-2xl overflow-hidden glass-dark product-card text-left group hover:border-white/10 transition-all"
          >
            {/* Image area — 3:4 aspect */}
            <div className="relative aspect-[3/4] bg-secondary rounded-t-2xl overflow-hidden flex items-center justify-center">
              {failedImageIds.has(product.id) ? (
                <div className="w-full h-full flex items-center justify-center p-2 text-center">
                  <span className="text-[10px] font-semibold text-muted-foreground line-clamp-2 uppercase tracking-wide">
                    {product.brand}
                  </span>
                </div>
              ) : (
                <img
                  src={thumbnailUrl(product.image_url, 400)}
                  alt={product.name}
                  className="w-full h-full object-contain p-3"
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
              <p className="text-[10px] tracking-[0.15em] uppercase text-white/40 mb-0.5">{product.brand}</p>
              <p className="text-[11px] font-medium text-white line-clamp-2 leading-tight h-[28px]">{product.name}</p>
              <p className="text-[12px] font-display font-bold text-primary mt-1 h-[18px]">
                {product.price_cents ? `$${(product.price_cents / 100).toFixed(0)}` : '\u00A0'}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Load More / View More */}
      {hasMore && (
        <div className="flex justify-center mt-3">
          <Button
            className="rounded-lg glass-gold text-primary border-primary/20 h-10 px-6 text-xs tracking-wide uppercase font-bold"
            onClick={() => {
              if (!expanded) {
                setExpanded(true);
                setVisibleCount(PAGE_SIZE);
                return;
              }
              setVisibleCount(prev => prev + PAGE_SIZE);
            }}
          >
            {expanded ? 'Load More' : 'View More'}
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
