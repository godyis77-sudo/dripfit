import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowUp, Sparkles, Loader2, ShoppingCart, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { navigateToTryOn } from '@/lib/tryonNavigate';
import BottomTabBar from '@/components/BottomTabBar';
import PostLookFlow from '@/components/community/PostLookFlow';
import { PostDetailSheet } from '@/components/community/PostDetailSheet';
import BrandFilter from '@/components/tryon/BrandFilter';
import { BRAND_GENRES } from '@/lib/brandGenres';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import PostCard from '@/components/community/PostCard';
import EmptyStates from '@/components/community/EmptyStates';
import { useCommunityFeed } from '@/hooks/useCommunityFeed';
import { useCart } from '@/hooks/useCart';
import type { Post, FilterType, TrendingSort, GenderKey } from '@/components/community/community-types';
import { GENDER_OPTIONS, isValidImageUrl } from '@/components/community/community-types';
import type { BrandGenre } from '@/lib/brandGenres';
import { useProductCatalog } from '@/hooks/useProductCatalog';

const SHOP_CATEGORIES = [
  { key: 'all', label: 'All' }, { key: 'tops', label: 'Tops' }, { key: 't-shirts', label: 'T-Shirts' },
  { key: 'shirts', label: 'Shirts' }, { key: 'polos', label: 'Polos' }, { key: 'sweaters', label: 'Sweaters' },
  { key: 'hoodies', label: 'Hoodies' }, { key: 'bottom', label: 'Bottoms' }, { key: 'pants', label: 'Pants' },
  { key: 'jeans', label: 'Jeans' }, { key: 'shorts', label: 'Shorts' }, { key: 'skirts', label: 'Skirts' },
  { key: 'leggings', label: 'Leggings' }, { key: 'dresses', label: 'Dresses' }, { key: 'jumpsuits', label: 'Jumpsuits' },
  { key: 'outerwear', label: 'Outerwear' }, { key: 'jackets', label: 'Jackets' }, { key: 'coats', label: 'Coats' },
  { key: 'blazers', label: 'Blazers' }, { key: 'vests', label: 'Vests' }, { key: 'shoes', label: 'Shoes' },
  { key: 'sneakers', label: 'Sneakers' }, { key: 'boots', label: 'Boots' }, { key: 'sandals', label: 'Sandals' },
  { key: 'loafers', label: 'Loafers' }, { key: 'heels', label: 'Heels' }, { key: 'activewear', label: 'Activewear' },
  { key: 'swimwear', label: 'Swimwear' }, { key: 'accessories', label: 'Accessories' }, { key: 'bags', label: 'Bags' },
  { key: 'hats', label: 'Hats' }, { key: 'jewelry', label: 'Jewelry' }, { key: 'belts', label: 'Belts' },
];

const SORT_OPTIONS = [
  { key: 'default', label: 'Recommended' },
  { key: 'price_asc', label: 'Price: Low → High' },
  { key: 'price_desc', label: 'Price: High → Low' },
  { key: 'brand_az', label: 'Brand: A → Z' },
  { key: 'genre', label: 'Genre' },
] as const;

type SortKey = typeof SORT_OPTIONS[number]['key'];

const FIT_OPTIONS = [
  'oversized', 'boxy', 'relaxed fit', 'slim fit', 'regular fit',
  'cropped', 'tapered', 'drop shoulder', 'heavyweight', 'lightweight',
  'athletic fit', 'classic fit', 'skinny fit', 'loose fit',
] as const;

const Community = () => {
  const navigate = useNavigate();
  usePageTitle('Style Check');
  const { user } = useAuth();
  const { toast } = useToast();

  const [filter, setFilter] = useState<FilterType>('new');
  const [shopGender, setShopGender] = useState<GenderKey>('all');
  const [shopBrand, setShopBrand] = useState<string | null>(null);
  const [shopCategory, setShopCategory] = useState('tops');
  const [shopGenre, setShopGenre] = useState<BrandGenre | null>(null);
  const [shopRetailer, setShopRetailer] = useState<string | null>(null);
  const [shopSort, setShopSort] = useState<SortKey>('default');
  const [showPostFlow, setShowPostFlow] = useState(false);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [trendingSort, setTrendingSort] = useState<TrendingSort>('hot');
  const [followingSort, setFollowingSort] = useState<TrendingSort>('newest');
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [similarFitTooltip, setSimilarFitTooltip] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [shopFiltersOpen, setShopFiltersOpen] = useState(false);
  const [shopGenreOpen, setShopGenreOpen] = useState(false);
  const [shopFitOpen, setShopFitOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Product catalog for retailer/fit pills
  const { products: shopProducts } = useProductCatalog(
    shopCategory === 'all' || shopCategory === 'tops' ? undefined : shopCategory,
    undefined, undefined,
    shopGender === 'all' ? undefined : shopGender
  );

  const availableRetailers = React.useMemo(() => {
    return [...new Set(shopProducts.map(p => p.retailer))].sort();
  }, [shopProducts]);

  const availableFits = React.useMemo(() => {
    const fits = new Set<string>();
    shopProducts.forEach(p => {
      if (Array.isArray(p.fit_profile)) p.fit_profile.forEach(f => fits.add(f));
    });
    return FIT_OPTIONS.filter(f => fits.has(f));
  }, [shopProducts]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close detail sheet on browser/hardware back button
  const closeDetail = useCallback(() => setDetailPost(null), []);

  useEffect(() => {
    if (detailPost) {
      window.history.pushState({ detailOpen: true }, '');
      const onPopState = () => closeDetail();
      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }
  }, [detailPost, closeDetail]);

  const handleCloseDetail = useCallback(() => {
    if (detailPost) {
      window.history.back();
    }
  }, [detailPost]);

  const {
    posts, loading, loadingMore, hasMore, loadMore,
    votes, voteCounts, followToggles, failedImages,
    hasScan, handleVote, handleFollowToggle, handleDeletePost, handleImageError, fetchPosts, setPosts,
  } = useCommunityFeed({ userId: user?.id, filter, shopGender });
  const { count: cartCount } = useCart();

  const handleShopLook = (post: Post) => {
    const urls = (post.product_urls && post.product_urls.length > 0) ? post.product_urls : [];
    trackEvent('shop_clickout', { source: 'fitcheck', hasProductUrl: urls.length > 0, itemCount: urls.length });
    const seen = new Set<string>();
    urls.forEach((u: string) => {
      const { brand } = detectBrandFromUrl(u);
      const key = brand || u;
      if (!seen.has(key)) { seen.add(key); window.open(u, '_blank', 'noopener'); }
    });
  };

  const onPostLook = () => {
    trackEvent('fitcheck_post_started');
    if (!user) { toast({ title: 'Sign in to post', variant: 'destructive' }); navigate(`/auth?returnTo=${encodeURIComponent('/style-check')}`); return; }
    setShowPostFlow(true);
  };

  const isPlaceholder = (post: Post) => post.id.startsWith('seed-');

  // Sort visible posts
  const getVisiblePosts = () => {
    let visible = posts.filter(p => isValidImageUrl(p.result_photo_url) && !failedImages.has(p.id));
    const getCount = (id: string, key: string) => voteCounts[id]?.[key] ?? 0;

    const sortByKey = (sort: TrendingSort) => {
      switch (sort) {
        case 'hot': visible = [...visible].sort((a, b) => (getCount(b.id, 'buy_yes') + getCount(b.id, 'buy_no')) - (getCount(a.id, 'buy_yes') + getCount(a.id, 'buy_no'))); break;
        case 'love': visible = [...visible].sort((a, b) => getCount(b.id, 'buy_yes') - getCount(a.id, 'buy_yes')); break;
        case 'buy': visible = [...visible].sort((a, b) => getCount(b.id, 'buy_no') - getCount(a.id, 'buy_no')); break;
        case 'newest': visible = [...visible].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
        case 'user': visible = [...visible].sort((a, b) => (a.profile?.display_name || '').localeCompare(b.profile?.display_name || '')); break;
      }
    };

    if (filter === 'trending') sortByKey(trendingSort);
    if (filter === 'following') sortByKey(followingSort);
    if (filterUserId) visible = visible.filter(p => p.user_id === filterUserId);
    return visible;
  };

  const visiblePosts = getVisiblePosts();

  const handleCaptionUpdated = useCallback((postId: string, caption: string | null) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, caption } : p));
    setDetailPost(prev => prev && prev.id === postId ? { ...prev, caption } : prev);
  }, [setPosts]);

  const renderSortPills = (sorts: { key: TrendingSort; label: string }[], activeSort: TrendingSort, setSort: (s: TrendingSort) => void) => (
    <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
      {sorts.map(s => (
        <button
          key={s.key}
          onClick={() => { setSort(s.key); if (s.key !== 'user') setFilterUserId(null); }}
          className={`pill ${activeSort === s.key ? 'pill-active' : ''}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  const shouldShowEmpty = (f: FilterType) => {
    if (f === 'trending' && visiblePosts.length < 3) return true;
    if ((f === 'new' || f === 'similar' || f === 'following') && visiblePosts.length === 0) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      <div className="px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg" aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base font-bold text-foreground">Style Check</h1>
              <p className="text-[10px] text-muted-foreground">Get real opinions before you buy</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate('/cart')}
              className="relative h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <Button className="rounded-lg btn-luxury text-primary-foreground h-8 px-3 text-[11px] font-bold active:scale-95 transition-transform" onClick={onPostLook} aria-label="Create new post">
              <Sparkles className="mr-1 h-3 w-3" /> Post a Look
            </Button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-border mb-4 overflow-x-auto no-scrollbar relative">
          {([
            { key: 'new' as FilterType, label: 'New' },
            { key: 'following' as FilterType, label: 'Following' },
            { key: 'trending' as FilterType, label: 'Trending' },
            { key: 'similar' as FilterType, label: 'Similar Fit' },
            { key: 'shop' as FilterType, label: 'Shop' },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-label={f.key === 'shop' ? 'Open filters' : `Change sort order`}
              className={`flex-1 py-1.5 min-h-[32px] text-[12px] font-bold transition-all relative whitespace-nowrap px-2 flex items-center justify-center gap-0.5 ${
                filter === f.key ? 'btn-gold-3d text-primary-foreground rounded-lg' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
              {f.key === 'similar' && (
                <button onClick={(e) => { e.stopPropagation(); setSimilarFitTooltip(!similarFitTooltip); }} aria-label="What is Similar Fit?" className={`text-[11px] ml-0.5 ${filter === f.key ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>ⓘ</button>
              )}
            </button>
          ))}
          <AnimatePresence>
            {similarFitTooltip && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50" onClick={() => setSimilarFitTooltip(false)} />
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute top-full mt-1 right-[20%] z-50 w-[240px] bg-card border border-border rounded-xl p-3 shadow-xl">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Similar Fit shows outfits posted by people with measurements closest to yours. Their ratings are more relevant to how clothes will fit you specifically.</p>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Sort toggle for trending/following */}
        {(filter === 'trending' || filter === 'following') && (
          <div className="mb-3">
            <button
              onClick={() => setShowSortOptions(!showSortOptions)}
              className="flex items-center gap-1.5 pill pill-active text-[11px]"
              aria-label="Toggle sort options"
            >
              <SlidersHorizontal className="h-3 w-3" />
              {filter === 'trending'
                ? [{ key: 'hot', label: '🔥 Hot' }, { key: 'love', label: '👍 Top Buy' }, { key: 'newest', label: '🕐 Newest' }, { key: 'user', label: '👤 By User' }].find(s => s.key === trendingSort)?.label
                : [{ key: 'newest', label: '🕐 Newest' }, { key: 'hot', label: '🔥 Hot' }, { key: 'love', label: '👍 Top Buy' }, { key: 'user', label: '👤 By User' }].find(s => s.key === followingSort)?.label
              }
            </button>
            <AnimatePresence>
              {showSortOptions && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
                    {(filter === 'trending'
                      ? [{ key: 'hot' as TrendingSort, label: '🔥 Hot' }, { key: 'love' as TrendingSort, label: '👍 Top Buy' }, { key: 'newest' as TrendingSort, label: '🕐 Newest' }, { key: 'user' as TrendingSort, label: '👤 By User' }]
                      : [{ key: 'newest' as TrendingSort, label: '🕐 Newest' }, { key: 'hot' as TrendingSort, label: '🔥 Hot' }, { key: 'love' as TrendingSort, label: '👍 Top Buy' }, { key: 'user' as TrendingSort, label: '👤 By User' }]
                    ).map(s => (
                      <button
                        key={s.key}
                        onClick={() => {
                          if (filter === 'trending') setTrendingSort(s.key);
                          else setFollowingSort(s.key);
                          if (s.key !== 'user') setFilterUserId(null);
                          setShowSortOptions(false);
                        }}
                        className={`pill ${(filter === 'trending' ? trendingSort : followingSort) === s.key ? 'pill-active' : ''}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* User filter chips */}
        {((filter === 'trending' && trendingSort === 'user') || (filter === 'following' && followingSort === 'user')) && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterUserId(null)} aria-label="Show all users" className={`pill ${!filterUserId ? 'pill-active' : ''}`}>All</button>
            {[...new Map(posts.filter(p => p.profile?.display_name).map(p => [p.user_id, p.profile?.display_name])).entries()].map(([uid, name]) => (
              <button key={uid} onClick={() => setFilterUserId(filterUserId === uid ? null : uid)} aria-label={`Filter by ${name}`} className={`pill ${filterUserId === uid ? 'pill-active' : ''}`}>{name}</button>
            ))}
          </div>
        )}

        {/* Content */}
        {filter === 'shop' ? (
          <>
            {/* Filters button */}
            {(() => {
              const activeCount = (shopBrand ? 1 : 0) + (shopGenre ? 1 : 0) + (shopRetailer ? 1 : 0) + (shopGender !== 'all' ? 1 : 0) + (shopCategory !== 'tops' ? 1 : 0) + (shopSort !== 'default' ? 1 : 0);
              return (
                <div className="mb-3">
                  <button
                    onClick={() => setShopFiltersOpen(!shopFiltersOpen)}
                    className="relative w-full h-11 rounded-xl flex items-center justify-center gap-2 active:scale-[0.97] transition-all text-[13px] font-semibold btn-luxury text-primary-foreground"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
                  </button>
                </div>
              );
            })()}

            <AnimatePresence>
              {shopFiltersOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border border-border rounded-xl bg-card mb-3"
                >
                  <div className="px-4 py-3 space-y-3">
                    {/* Sort */}
                    <div>
                      <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Sort by</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SORT_OPTIONS.map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => setShopSort(opt.key)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                              shopSort === opt.key
                                ? 'btn-luxury text-primary-foreground'
                                : 'bg-background border border-border text-foreground/70'
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
                      <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                        {SHOP_CATEGORIES.map(cat => (
                          <button key={cat.key} onClick={() => setShopCategory(cat.key)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${shopCategory === cat.key ? 'btn-luxury text-primary-foreground' : 'bg-background border border-border text-foreground/70'}`}>{cat.label}</button>
                        ))}
                      </div>
                    </div>

                    {/* Brand */}
                    <div>
                      <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Brand</p>
                      <BrandFilter gender={shopGender === 'all' ? null : shopGender} selectedBrand={shopBrand} onBrandChange={setShopBrand} />
                    </div>

                    {/* Retailer pills */}
                    <div>
                      <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-1.5">Retailer</p>
                      <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                        <button
                          onClick={() => setShopRetailer(null)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                            !shopRetailer ? 'btn-luxury text-primary-foreground' : 'bg-background border border-border text-foreground/70'
                          }`}
                        >All</button>
                        {availableRetailers.map(retailer => (
                          <button
                            key={retailer}
                            onClick={() => setShopRetailer(retailer === shopRetailer ? null : retailer)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors capitalize ${
                              shopRetailer === retailer ? 'btn-luxury text-primary-foreground' : 'bg-background border border-border text-foreground/70'
                            }`}
                          >{retailer}</button>
                        ))}
                      </div>
                    </div>

                    {/* Genre — collapsible */}
                    <div>
                      <button onClick={() => setShopGenreOpen(!shopGenreOpen)} className="flex items-center justify-between w-full">
                        <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider">
                          Genre {shopGenre ? `· ${shopGenre}` : ''}
                        </p>
                        <ChevronDown className={`h-3.5 w-3.5 text-foreground/50 transition-transform ${shopGenreOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {shopGenreOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              <button onClick={() => setShopGenre(null)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${!shopGenre ? 'btn-luxury text-primary-foreground' : 'bg-background border border-border text-foreground/70'}`}>All</button>
                              {BRAND_GENRES.map(genre => (
                                <button key={genre} onClick={() => setShopGenre(genre === shopGenre ? null : genre)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${shopGenre === genre ? 'btn-luxury text-primary-foreground' : 'bg-background border border-border text-foreground/70'}`}>{genre}</button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Fit / Cut — collapsible */}
                    {availableFits.length > 0 && (
                      <div>
                        <button onClick={() => setShopFitOpen(!shopFitOpen)} className="flex items-center justify-between w-full">
                          <p className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider">Fit / Cut</p>
                          <ChevronDown className={`h-3.5 w-3.5 text-foreground/50 transition-transform ${shopFitOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {shopFitOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {availableFits.map(fit => (
                                  <button key={fit} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors capitalize bg-background border border-border text-foreground/70">{fit}</button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Clear */}
                    {((shopBrand ? 1 : 0) + (shopGenre ? 1 : 0) + (shopRetailer ? 1 : 0) + (shopGender !== 'all' ? 1 : 0) + (shopCategory !== 'tops' ? 1 : 0) + (shopSort !== 'default' ? 1 : 0)) > 0 && (
                      <button onClick={() => { setShopBrand(null); setShopGenre(null); setShopRetailer(null); setShopGender('all'); setShopCategory('tops'); setShopSort('default'); }} className="text-[10px] text-primary font-semibold">Clear all filters</button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <CategoryProductGrid category={shopCategory} collapsed={false} maxItems={50} gender={shopGender === 'all' ? undefined : shopGender} brand={shopBrand || undefined} genre={shopGenre} onSelectProduct={(product) => navigateToTryOn(navigate, { productUrl: product.product_url || undefined, fallbackClothingImageUrl: product.image_url, source: 'style_check_shop' })} />
          </>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border border-border overflow-hidden">
                <div className="w-full aspect-[4/5] skeleton-gold" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 w-3/4 rounded skeleton-gold" />
                  <div className="flex gap-1.5">{[1,2,3].map(j => <div key={j} className="h-7 flex-1 rounded-lg skeleton-gold" />)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : shouldShowEmpty(filter) ? (
          <EmptyStates filter={filter} hasScan={hasScan} userId={user?.id} onPostLook={onPostLook} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 pb-4">
              {visiblePosts.map((post, idx) => (
                <PostCard
                  key={post.id}
                  post={post}
                  index={idx}
                  filter={filter}
                  votes={votes}
                  voteCounts={voteCounts}
                  followToggles={followToggles}
                  hasScan={hasScan}
                  onVote={handleVote}
                  onFollowToggle={handleFollowToggle}
                  onDeletePost={handleDeletePost}
                  onImageError={handleImageError}
                  onOpenDetail={setDetailPost}
                  onCaptionUpdated={handleCaptionUpdated}
                />
              ))}
            </div>
            {hasMore && !loading && (
              <div className="flex justify-center pb-20 pt-2">
                <Button
                  className="rounded-lg btn-luxury text-primary-foreground h-10 px-6 text-xs font-bold"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loadingMore ? 'Loading…' : 'Load More'}
                </Button>
              </div>
            )}
            {!hasMore && visiblePosts.length > 0 && (
              <p className="text-center text-[10px] text-muted-foreground pb-20 pt-2">You've seen it all ✨</p>
            )}
          </>
        )}
      </div>

      <PostLookFlow open={showPostFlow} onOpenChange={setShowPostFlow} onPosted={fetchPosts} />
      <PostDetailSheet
        post={detailPost}
        open={!!detailPost}
        onClose={handleCloseDetail}
        prompt={detailPost?.caption || ''}
        votes={votes}
        voteCounts={voteCounts}
        onVote={handleVote}
        onComment={async (postId, val) => {
          if (!user) { toast({ title: 'Sign in to comment', variant: 'destructive' }); return; }
          if (!val.trim()) return;
          const { error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, comment_text: val.trim() });
          if (error) { toast({ title: 'Could not post comment', variant: 'destructive' }); }
          else { trackEvent('fitcheck_comment', { postId }); toast({ title: 'Comment posted!' }); }
        }}
        onFollow={handleFollowToggle}
        onNavigateProfile={(p) => {
          setDetailPost(null);
          const name = p.profile?.display_name || 'Anonymous';
          if (user && p.user_id === user.id) { navigate('/profile'); return; }
          navigate(`/profile/${encodeURIComponent(name)}`);
        }}
        onShopLook={handleShopLook}
        onDelete={(postId) => { setDetailPost(null); handleDeletePost(postId); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onTryOn={(p) => {
          setDetailPost(null);
          const urls = p.product_urls;
          if (urls && urls.length > 0) {
            navigateToTryOn(navigate, { productUrl: urls[0], fallbackClothingImageUrl: p.clothing_photo_url, source: 'style_check_detail' });
          } else {
            navigateToTryOn(navigate, { fallbackClothingImageUrl: p.clothing_photo_url, source: 'style_check_detail' });
          }
        }}
        onTryOnItem={(item, p) => {
          setDetailPost(null);
          navigateToTryOn(navigate, { productUrl: item.url, fallbackClothingImageUrl: item.image_url || p.clothing_photo_url, source: 'style_check_detail_item' });
        }}
        isFollowing={detailPost ? !!followToggles[detailPost.user_id] : false}
        isOwnPost={detailPost ? user?.id === detailPost.user_id : false}
        isPlaceholder={detailPost ? isPlaceholder(detailPost) : false}
        currentUserId={user?.id}
        onCaptionUpdated={handleCaptionUpdated}
      />
      {filter === 'shop' && showScrollTop && createPortal(
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed z-[9999] h-11 w-11 rounded-full bg-primary/50 text-primary-foreground flex items-center justify-center shadow-xl active:scale-90 transition-transform"
          style={{ right: 16, bottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}
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

export default Community;
