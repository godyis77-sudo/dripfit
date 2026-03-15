import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, SlidersHorizontal, ExternalLink, ShoppingBag } from 'lucide-react';
import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';
import BottomTabBar from '@/components/BottomTabBar';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAuth } from '@/hooks/useAuth';
import BrandFilter from '@/components/tryon/BrandFilter';
import ProductPreviewModal from '@/components/ui/ProductPreviewModal';
import { BRAND_GENRES, type BrandGenre, getBrandGenre } from '@/lib/brandGenres';
import { useAffiliateClickout } from '@/hooks/useAffiliateClickout';

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
  { key: 'genre', label: 'Genre' },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['key'];

const GENDER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'mens', label: "Men's" },
  { key: 'womens', label: "Women's" },
] as const;

type GenderKey = typeof GENDER_OPTIONS[number]['key'];

const FIT_OPTIONS = [
  'oversized', 'boxy', 'relaxed fit', 'slim fit', 'regular fit',
  'cropped', 'tapered', 'drop shoulder', 'heavyweight', 'lightweight',
  'athletic fit', 'classic fit', 'skinny fit', 'loose fit',
] as const;

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
  // search state removed — brand filter handled by BrandFilter component
  const [sort, setSort] = useState<SortKey>('default');
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [genreFilter, setGenreFilter] = useState<BrandGenre | null>(null);
  const [fitFilter, setFitFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<CatalogProduct | null>(null);
  const { pendingClickout, beginClickout, confirmClickout, cancelClickout } =
    useAffiliateClickout({ extraProps: { source: 'browse', category } });

  // Scroll lock handled by ProductPreviewModal

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

    if (brandFilter) {
      result = result.filter(p => p.brand === brandFilter);
    }

    if (genreFilter) {
      result = result.filter(p => getBrandGenre(p.brand) === genreFilter);
    }

    if (fitFilter) {
      result = result.filter(p =>
        Array.isArray(p.fit_profile) && p.fit_profile.some(f => f === fitFilter)
      );
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
      case 'genre': {
        const genreOrder = new Map(BRAND_GENRES.map((g, i) => [g, i]));
        result.sort((a, b) => {
          const ga = getBrandGenre(a.brand);
          const gb = getBrandGenre(b.brand);
          const diff = (genreOrder.get(ga) ?? 99) - (genreOrder.get(gb) ?? 99);
          if (diff !== 0) return diff;
          return a.brand.localeCompare(b.brand);
        });
        break;
      }
    }

    return result;
  }, [products, sort, brandFilter, genreFilter, fitFilter]);

  // Compute available fits from current products (to only show relevant pills)
  const availableFits = useMemo(() => {
    const fits = new Set<string>();
    products.forEach(p => {
      if (Array.isArray(p.fit_profile)) p.fit_profile.forEach(f => fits.add(f));
    });
    return FIT_OPTIONS.filter(f => fits.has(f));
  }, [products]);

  const activeFilterCount = (brandFilter ? 1 : 0) + (genreFilter ? 1 : 0) + (fitFilter ? 1 : 0) + (sort !== 'default' ? 1 : 0) + (genderFilter !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Go back"
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
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Brand search filter */}
        <div className="px-4 pb-2">
          <BrandFilter
            gender={genderFilter === 'all' ? null : genderFilter}
            selectedBrand={brandFilter}
            onBrandChange={setBrandFilter}
          />
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
            ...(genderFilter === 'mens'
              ? [{ key: 'blazers', label: 'Suits & Blazers' }]
              : [{ key: 'dress', label: 'Dresses' }]),
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

              {/* Genre filter */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Genre</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setGenreFilter(null)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                      !genreFilter
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border border-border text-muted-foreground'
                    }`}
                  >
                    All
                  </button>
                  {BRAND_GENRES.map(genre => (
                    <button
                      key={genre}
                      onClick={() => setGenreFilter(genre === genreFilter ? null : genre)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                        genreFilter === genre
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border text-muted-foreground'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fit filter */}
              {availableFits.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Fit / Cut</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFitFilter(null)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                        !fitFilter
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border text-muted-foreground'
                      }`}
                    >
                      All
                    </button>
                    {availableFits.map(fit => (
                      <button
                        key={fit}
                        onClick={() => setFitFilter(fit === fitFilter ? null : fit)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors capitalize ${
                          fitFilter === fit
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border border-border text-muted-foreground'
                        }`}
                      >
                        {fit}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setSort('default'); setBrandFilter(null); setGenreFilter(null); setFitFilter(null); }}
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
            {brandFilter && (
              <button
                onClick={() => { setBrandFilter(null); }}
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
                  <p className="text-[11px] font-bold text-primary uppercase tracking-wider">{product.brand}</p>
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

      {/* Affiliate clickout confirmation */}
      {pendingClickout && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60" onClick={cancelClickout}>
          <div
            className="w-full max-w-sm bg-card border-t border-border rounded-t-2xl p-4 space-y-3 mb-0"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[13px] font-bold text-foreground">
              You're leaving the app to visit {pendingClickout.retailer}.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Some links may earn us a commission.
            </p>
            <div className="flex gap-2">
              <Button className="flex-1 h-10 rounded-xl btn-luxury text-primary-foreground text-[12px] font-bold" onClick={confirmClickout}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Continue to Store
              </Button>
              <Button variant="outline" className="h-10 rounded-xl text-[12px]" onClick={cancelClickout}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <ProductPreviewModal
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
        onTryOn={(p) => {
          navigate('/tryon', { state: { clothingUrl: p.image_url, productUrl: p.product_url } });
          setPreviewProduct(null);
        }}
      onShop={previewProduct?.product_url ? (p) => {
          setPreviewProduct(null);
          // Defer to next tick so the portal's click event finishes propagating
          // before the disclosure overlay renders (prevents phantom cancel)
          setTimeout(() => beginClickout(p.brand, p.product_url!), 0);
        } : undefined}
      />
      <BottomTabBar />
    </div>
  );
};

export default Browse;
