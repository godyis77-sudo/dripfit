import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, ShoppingBag } from 'lucide-react';
import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';
import { trackEvent } from '@/lib/analytics';

interface CategoryProductGridProps {
  category: string;
  title?: string;
  collapsed?: boolean;
  onSelectProduct?: (product: CatalogProduct) => void;
  maxItems?: number;
}

const CategoryProductGrid = ({
  category,
  title,
  collapsed = true,
  onSelectProduct,
  maxItems = 8,
}: CategoryProductGridProps) => {
  const { products, loading } = useProductCatalog(category);
  const [expanded, setExpanded] = useState(!collapsed);

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
              if (onSelectProduct) {
                onSelectProduct(product);
              } else if (product.product_url) {
                trackEvent('catalog_product_clicked', { brand: product.brand, category: product.category });
                window.open(product.product_url, '_blank', 'noopener');
              }
            }}
            className="relative rounded-lg overflow-hidden border border-border bg-card active:scale-95 transition-transform group"
          >
            <div className="aspect-square bg-muted">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
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
            {product.product_url && (
              <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ShoppingBag className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryProductGrid;
