import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUp, SlidersHorizontal, ExternalLink, ShoppingBag, ChevronDown } from 'lucide-react';
import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';
import { trackEvent } from '@/lib/analytics';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';
import BottomTabBar from '@/components/BottomTabBar';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { ALL_PRODUCT_CATEGORIES } from '@/components/tryon/tryon-constants';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useAuth } from '@/hooks/useAuth';
import BrandFilter from '@/components/tryon/BrandFilter';
import ProductPreviewModal from '@/components/ui/ProductPreviewModal';
import { BRAND_GENRES, type BrandGenre, getBrandGenre } from '@/lib/brandGenres';
import { useAffiliateClickout } from '@/hooks/useAffiliateClickout';
import { isCategoryVisibleForGender } from '@/lib/genderCategories';

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Categories',
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

const FIT_OPTIONS = [
  'athletic fit', 'baggy', 'bootcut', 'boxy', 'classic fit', 'cropped',
  'drop shoulder', 'fitted', 'flare', 'heavyweight', 'high rise',
  'lightweight', 'longline', 'loose fit', 'low rise', 'mid rise',
  'muscle fit', 'oversized', 'regular fit', 'relaxed fit', 'skinny fit',
  'slim fit', 'straight fit', 'tailored fit', 'tapered', 'wide leg',
] as const;

const Browse = () => {
  const { category = 'all' } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const { userGender } = useAuth();
  const defaultGender: GenderKey = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : 'all';
  const [genderOverride, setGenderOverrideRaw] = useState<GenderKey | null>(() => {
    const saved = localStorage.getItem('drip_gender_filter');
    if (saved === 'mens' || saved === 'womens' || saved === 'all') return saved;
    return null;
  });
  const setGenderOverride = (v: GenderKey) => { setGenderOverrideRaw(v); localStorage.setItem('drip_gender_filter', v); };

  // Use override if user manually selected, otherwise default to profile preference
  const genderFilter: GenderKey = genderOverride ?? defaultGender;

  // search state removed — brand filter handled by BrandFilter component
  const [sort, setSort] = useState<SortKey>('default');
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [brandFilters, setBrandFilters] = useState<string[]>([]);
  const [retailerFilter, setRetailerFilter] = useState<string | null>(null);
  const [retailerFilters, setRetailerFilters] = useState<string[]>([]);
  const [genreFilter, setGenreFilter] = useState<BrandGenre | null>(null);
  const [fitFilter, setFitFilter] = useState<string | null>(null);

  const effectiveGender = genderFilter === 'all' ? undefined : genderFilter;
  const { products, loading } = useProductCatalog(category === 'all' ? undefined : category, undefined, undefined, effectiveGender, genreFilter ?? undefined, fitFilter ?? undefined);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [genreOpen, setGenreOpen] = useState(false);
  const [retailerOpen, setRetailerOpen] = useState(false);
  const [fitOpen, setFitOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<CatalogProduct | null>(null);
  const { pendingClickout, beginClickout, confirmClickout, cancelClickout } =
    useAffiliateClickout({ extraProps: { source: 'browse', category } });
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      setShowScrollTop(scrollY > 300);
    };
    // fire on multiple targets to cover iframe quirks
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    // also poll once on mount in case already scrolled
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, { capture: true } as any);
    };
  }, []);

  // Scroll lock handled by ProductPreviewModal

  const title = CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
  usePageMeta({ title: `Browse ${title}`, description: `Shop ${title.toLowerCase()} from 130+ brands with AI size recommendations. Find your perfect fit.`, path: `/browse/${category}` });

  // Extract available brands from loaded products
  const availableRetailers = useMemo(() => {
    const retailers = [...new Set(products.map(p => p.retailer))].sort();
    return retailers;
  }, [products]);

  const availableCategories = useMemo(() => {
    return [...new Set(products.map(p => p.category))].sort();
  }, [products]);

  // Filter and sort (genre & fit are now server-side)
  const displayed = useMemo(() => {
    let result = [...products];

    if (brandFilters.length > 0) {
      result = result.filter(p => brandFilters.includes(p.brand));
    } else if (brandFilter) {
      result = result.filter(p => p.brand === brandFilter);
    }

    if (retailerFilters.length > 0) {
      result = result.filter(p => retailerFilters.includes(p.retailer));
    } else if (retailerFilter) {
      result = result.filter(p => p.retailer === retailerFilter);
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

    if (categoryFilter) {
      result = result.filter(p => p.category === categoryFilter);
    }

    return result;
  }, [products, sort, brandFilter, brandFilters, retailerFilter, retailerFilters, categoryFilter]);

  // Compute available fits from current products (to only show relevant pills)
  const availableFits = useMemo(() => {
    const fits = new Set<string>();
    products.forEach(p => {
      if (Array.isArray(p.fit_profile)) p.fit_profile.forEach(f => fits.add(f));
    });
    return FIT_OPTIONS.filter(f => fits.has(f));
  }, [products]);

  const activeFilterCount = (retailerFilters.length || (retailerFilter ? 1 : 0)) + (genreFilter ? 1 : 0) + (fitFilter ? 1 : 0) + (categoryFilter ? 1 : 0) + (sort !== 'default' ? 1 : 0) + (genderFilter !== 'all' ? 1 : 0) + (brandFilters.length || (brandFilter ? 1 : 0));

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      {/* Scrollable header block */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/home')}
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
      </div>

      <div className="px-4 pb-2">
        <BrandFilter
          gender={genderFilter === 'all' ? null : genderFilter}
          selectedBrand={brandFilter}
          onBrandChange={setBrandFilter}
        />
      </div>

      <div className="px-4 pb-2 flex gap-1.5">
        {GENDER_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setGenderOverride(opt.key)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
              genderFilter === opt.key
                ? 'btn-luxury text-primary-foreground'
                : 'bg-card border border-border text-foreground/70'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>


      {/* Sticky filter button only */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-2">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="relative w-full h-8 rounded-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all text-[13px] font-semibold btn-luxury text-primary-foreground"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
        </button>
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
                <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Sort by</p>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setSort(opt.key)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                        sort === opt.key
                          ? 'btn-luxury text-primary-foreground'
                          : 'bg-card border border-primary/30 text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'accessories', label: 'Accessories' },
                    { key: 'activewear', label: 'Activewear' },
                    { key: 'bags', label: 'Bags' },
                    { key: 'belts', label: 'Belts' },
                    { key: 'blazers', label: 'Blazers' },
                    { key: 'boots', label: 'Boots' },
                    { key: 'bottom', label: 'Bottoms' },
                    { key: 'coats', label: 'Coats' },
                    { key: 'dresses', label: 'Dresses' },
                    { key: 'hats', label: 'Hats' },
                    { key: 'heels', label: 'Heels' },
                    { key: 'hoodies', label: 'Hoodies' },
                    { key: 'jackets', label: 'Jackets' },
                    { key: 'jeans', label: 'Jeans' },
                    { key: 'jewelry', label: 'Jewelry' },
                    { key: 'jumpsuits', label: 'Jumpsuits' },
                    { key: 'leggings', label: 'Leggings' },
                    { key: 'loafers', label: 'Loafers' },
                    { key: 'loungewear', label: 'Loungewear' },
                    { key: 'outerwear', label: 'Outerwear' },
                    { key: 'pants', label: 'Pants' },
                    { key: 'polos', label: 'Polos' },
                    { key: 'sandals', label: 'Sandals' },
                    { key: 'scarves', label: 'Scarves' },
                    { key: 'shirts', label: 'Shirts' },
                    { key: 'shoes', label: 'Shoes' },
                    { key: 'shorts', label: 'Shorts' },
                    { key: 'skirts', label: 'Skirts' },
                    { key: 'sneakers', label: 'Sneakers' },
                    { key: 'sunglasses', label: 'Sunglasses' },
                    { key: 'sweaters', label: 'Sweaters' },
                    { key: 'swimwear', label: 'Swimwear' },
                    { key: 't-shirts', label: 'T-Shirts' },
                    { key: 'tops', label: 'Tops' },
                    { key: 'underwear', label: 'Underwear' },
                    { key: 'vests', label: 'Vests' },
                    { key: 'watches', label: 'Watches' },
                  ].filter(cat => cat.key === 'all' || isCategoryVisibleForGender(cat.key, genderFilter)).map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => {
                        navigate(`/browse/${cat.key}`, { replace: true });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                        (category === cat.key || CATEGORY_LABELS[category] === cat.label)
                          ? 'btn-luxury text-primary-foreground'
                          : 'bg-card border border-primary/30 text-foreground'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Retailer filter — collapsible */}
              <div>
                <button
                  onClick={() => setRetailerOpen(!retailerOpen)}
                  className="flex items-center justify-between w-full"
                >
                  <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
                    Retailer {retailerFilter ? `· ${retailerFilter}` : ''}
                  </p>
                  <ChevronDown className={`h-3.5 w-3.5 text-foreground/50 transition-transform ${retailerOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {retailerOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <button
                          onClick={() => setRetailerFilter(null)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                            !retailerFilter
                              ? 'btn-luxury text-primary-foreground'
                              : 'bg-card border border-primary/30 text-foreground'
                          }`}
                        >
                          All
                        </button>
                        {availableRetailers.map(retailer => (
                          <button
                            key={retailer}
                            onClick={() => setRetailerFilter(retailer === retailerFilter ? null : retailer)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors capitalize ${
                              retailerFilter === retailer
                                ? 'btn-luxury text-primary-foreground'
                                : 'bg-card border border-primary/30 text-foreground'
                            }`}
                          >
                            {retailer}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Genre filter — collapsible */}
              <div>
                <button
                  onClick={() => setGenreOpen(!genreOpen)}
                  className="flex items-center justify-between w-full"
                >
                  <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
                    Genre {genreFilter ? `· ${genreFilter}` : ''}
                  </p>
                  <ChevronDown className={`h-3.5 w-3.5 text-foreground/50 transition-transform ${genreOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {genreOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <button
                          onClick={() => setGenreFilter(null)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                            !genreFilter
                              ? 'btn-luxury text-primary-foreground'
                              : 'bg-card border border-primary/30 text-foreground'
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
                                ? 'btn-luxury text-primary-foreground'
                                : 'bg-card border border-primary/30 text-foreground'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Fit / Cut filter — collapsible (auto-hidden when <5 products have fit data) */}
              {availableFits.length > 0 && products.filter(p => Array.isArray(p.fit_profile) && p.fit_profile.length > 0).length >= 5 && (
                <div>
                  <button
                    onClick={() => setFitOpen(!fitOpen)}
                    className="flex items-center justify-between w-full"
                  >
                    <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
                      Fit / Cut {fitFilter ? `· ${fitFilter}` : ''}
                    </p>
                    <ChevronDown className={`h-3.5 w-3.5 text-foreground/50 transition-transform ${fitOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {fitOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <button
                            onClick={() => setFitFilter(null)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                              !fitFilter
                                ? 'btn-luxury text-primary-foreground'
                                : 'bg-card border border-primary/30 text-foreground'
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
                                  ? 'btn-luxury text-primary-foreground'
                                  : 'bg-card border border-primary/30 text-foreground'
                              }`}
                            >
                              {fit}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Clear filters */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setSort('default'); setBrandFilter(null); setRetailerFilter(null); setGenreFilter(null); setFitFilter(null); setCategoryFilter(null); }}
                  className="text-[10px] text-primary font-semibold"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product grid — broken down by category */}
      <div className="px-4 py-4 space-y-2">
        {category === 'all' && !categoryFilter ? (
          ALL_PRODUCT_CATEGORIES.map(cat => (
            <CategoryProductGrid
              key={cat.key}
              category={cat.key}
              title={cat.label}
              collapsed={true}
              maxItems={100}
              gender={effectiveGender}
              brand={brandFilter || undefined}
              genre={genreFilter}
              retailer={retailerFilter || undefined}
              fitProfile={fitFilter || undefined}
              onSelectProduct={(product) => {
                trackEvent('browse_product_preview', { brand: product.brand, category: product.category });
                setPreviewProduct(product);
              }}
            />
          ))
        ) : (
          <CategoryProductGrid
            category={categoryFilter || category}
            title={CATEGORY_LABELS[categoryFilter || category] || (categoryFilter || category).charAt(0).toUpperCase() + (categoryFilter || category).slice(1)}
            collapsed={false}
            maxItems={100}
            gender={effectiveGender}
            brand={brandFilter || undefined}
            genre={genreFilter}
            retailer={retailerFilter || undefined}
            fitProfile={fitFilter || undefined}
            onSelectProduct={(product) => {
              trackEvent('browse_product_preview', { brand: product.brand, category: product.category });
              setPreviewProduct(product);
            }}
          />
        )}
      </div>

      {/* Affiliate clickout confirmation — portaled to body to escape scroll containers */}
      {pendingClickout && createPortal(
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
        </div>,
        document.body
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

      {/* Scroll-to-top button — portaled to body */}
      {showScrollTop && createPortal(
        <motion.button
          key="scroll-top"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed z-[9999] h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl active:scale-90 transition-transform"
          style={{ right: 16, bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </motion.button>,
        document.body
      )}

      <BottomTabBar />
    </div>
  );
};

export default Browse;
