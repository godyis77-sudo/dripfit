import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, SlidersHorizontal, X, Sparkles, ExternalLink, Search } from 'lucide-react';
import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/hooks/useAuth';

const CATEGORY_LABELS: Record<string, string> = {
  tops: 'Tops',
  bottom: 'Bottoms',
  bottoms: 'Bottoms',
  dress: 'Dresses',
  dresses: 'Dresses',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  footwear: 'Shoes',
  accessories: 'Accessories',
  bags: 'Bags',
  hats: 'Hats',
  jewelry: 'Jewelry',
  sunglasses: 'Sunglasses',
};

const SORT_OPTIONS = [
  { key: 'default', label: 'Recommended' },
  { key: 'price_asc', label: 'Price: Low → High' },
  { key: 'price_desc', label: 'Price: High → Low' },
  { key: 'brand_az', label: 'Brand: A → Z' },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['key'];

const GENDER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'mens', label: "Men's" },
  { key: 'womens', label: "Women's" },
] as const;

type GenderKey = typeof GENDER_OPTIONS[number]['key'];

const Browse = () => {
  const { category = 'tops' } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { userGender } = useAuth();
  const defaultGender: GenderKey = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : 'all';
  const [genderOverride, setGenderOverride] = useState<GenderKey | null>(null);

  // Use override if user manually selected, otherwise default to profile preference
  const genderFilter: GenderKey = genderOverride ?? defaultGender;
  const effectiveGender = genderFilter === 'all' ? undefined : genderFilter;

  const { products, loading } = useProductCatalog(category, undefined, undefined, effectiveGender);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('default');
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<CatalogProduct | null>(null);

  const title = CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
  usePageTitle(`Browse ${title}`);

  // Extract available brands from loaded products
  const availableBrands = useMemo(() => {
    const brands = [...new Set(products.map(p => p.brand))].sort();
    return brands;
  }, [products]);

  // Filter and sort
  const displayed = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      );
    }

    if (brandFilter) {
      result = result.filter(p => p.brand === brandFilter);
    }

    switch (sort) {
      case 'price_asc':
        result.sort((a, b) => (a.price_cents ?? 0) - (b.price_cents ?? 0));
        break;
      case 'price_desc':
        result.sort((a, b) => (b.price_cents ?? 0) - (a.price_cents ?? 0));
        break;
      case 'brand_az':
        result.sort((a, b) => a.brand.localeCompare(b.brand));
        break;
    }

    return result;
  }, [products, search, sort, brandFilter]);

  const activeFilterCount = (brandFilter ? 1 : 0) + (sort !== 'default' ? 1 : 0) + (genderFilter !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen bg-background pb-safe-bottom">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-transform"
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <div>
              <h1 className="text-base font-bold text-foreground">{title}</h1>
              <p className="text-[10px] text-muted-foreground">{displayed.length} items</p>
            </div>
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="relative h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-transform"
          >
            <SlidersHorizontal className="h-4 w-4 text-foreground" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="pl-9 h-9 text-[12px] bg-card border-border rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Gender toggle */}
        <div className="px-4 pb-2 flex gap-1.5">
          {GENDER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setGenderOverride(opt.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                genderFilter === opt.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>


        <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {[
            { key: 'tops', label: 'Tops' },
            { key: 'bottom', label: 'Bottoms' },
            { key: 'dress', label: 'Dresses' },
            { key: 'outerwear', label: 'Outerwear' },
            { key: 'shoes', label: 'Shoes' },
            { key: 'accessories', label: 'Accessories' },
          ].map(cat => (
            <button
              key={cat.key}
              onClick={() => navigate(`/browse/${cat.key}`, { replace: true })}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                (category === cat.key || CATEGORY_LABELS[category] === cat.label)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-card"
          >
            <div className="px-4 py-3 space-y-3">
              {/* Sort */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Sort by</p>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setSort(opt.key)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                        sort === opt.key
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border text-muted-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand filter */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Brand</p>
                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                  <button
                    onClick={() => setBrandFilter(null)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                      !brandFilter
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border border-border text-muted-foreground'
                    }`}
                  >
                    All
                  </button>
                  {availableBrands.map(brand => (
                    <button
                      key={brand}
                      onClick={() => setBrandFilter(brand === brandFilter ? null : brand)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors capitalize ${
                        brandFilter === brand
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border text-muted-foreground'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setSort('default'); setBrandFilter(null); }}
                  className="text-[10px] text-primary font-semibold"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product grid */}
      <div className="px-4 py-4">
        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-[3/4] rounded-xl skeleton-gold" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">No items found</p>
            {(search || brandFilter) && (
              <button
                onClick={() => { setSearch(''); setBrandFilter(null); }}
                className="text-primary text-[11px] font-semibold mt-2"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayed.map((product, idx) => (
              <motion.button
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                onClick={() => {
                  trackEvent('browse_product_preview', { brand: product.brand, category: product.category });
                  setPreviewProduct(product);
                }}
                className="bg-card border border-border rounded-xl overflow-hidden active:scale-[0.97] transition-transform text-left"
              >
                <div className="aspect-square bg-muted relative">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = 'none';
                      const fallback = img.parentElement?.querySelector('.fallback-badge');
                      if (fallback) (fallback as HTMLElement).style.display = 'flex';
                    }}
                  />
                  <div className="fallback-badge hidden absolute inset-0 items-center justify-center bg-muted">
                    <span className="text-[10px] text-muted-foreground font-semibold capitalize">{product.brand}</span>
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-[10px] text-muted-foreground capitalize">{product.brand}</p>
                  <p className="text-[12px] font-semibold text-foreground line-clamp-2 leading-tight mt-0.5">{product.name}</p>
                  {product.price_cents && (
                    <p className="text-[12px] font-bold text-primary mt-1">
                      ${(product.price_cents / 100).toFixed(0)}
                    </p>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}
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
              <Button
                className="flex-1 gap-2"
                onClick={() => {
                  navigate('/tryon', { state: { clothingUrl: previewProduct.image_url, productUrl: previewProduct.product_url } });
                  setPreviewProduct(null);
                }}
              >
                <Sparkles className="h-4 w-4" />
                Try On
              </Button>
              {previewProduct.product_url && (
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-white/20 text-white hover:bg-white/10"
                  onClick={() => {
                    trackEvent('browse_product_clicked', { brand: previewProduct.brand, category: previewProduct.category });
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

export default Browse;
