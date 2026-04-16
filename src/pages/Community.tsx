import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import { PullToRefresh } from '@/components/layout/PullToRefresh';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { navigateToTryOn } from '@/lib/tryonNavigate';
import BottomTabBar from '@/components/BottomTabBar';
import PostLookFlow from '@/components/community/PostLookFlow';
import { PostDetailSheet } from '@/components/community/PostDetailSheet';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import { useCommunityFeed } from '@/hooks/useCommunityFeed';
import { useCart } from '@/hooks/useCart';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import { ALL_PRODUCT_CATEGORIES } from '@/components/tryon/tryon-constants';
import { isValidImageUrl } from '@/components/community/community-types';
import type { Post, FilterType, TrendingSort, GenderKey } from '@/components/community/community-types';
import type { BrandGenre } from '@/lib/brandGenres';

// Sub-components
import CommunityHeader from '@/components/community/CommunityHeader';
import CommunityFilterTabs from '@/components/community/CommunityFilterTabs';
import FeedSortControls from '@/components/community/FeedSortControls';
import ShopFiltersPanel from '@/components/community/ShopFiltersPanel';
import type { SortKey } from '@/components/community/ShopFiltersPanel';
import CommunityFeedGrid from '@/components/community/CommunityFeedGrid';
import CommunitySwipeStack from '@/components/community/CommunitySwipeStack';

const FIT_OPTIONS = [
  'athletic fit', 'boxy', 'classic fit', 'cropped', 'drop shoulder',
  'heavyweight', 'lightweight', 'loose fit', 'oversized', 'regular fit',
  'relaxed fit', 'skinny fit', 'slim fit', 'tapered',
] as const;

const Community = () => {
  const navigate = useNavigate();
  usePageMeta({ title: 'Style Check', description: 'Get real feedback on your outfits from the DripFit community. Post your look and let others rate it.', path: '/style-check' });
  const { user } = useAuth();
  const { toast } = useToast();

  const [filter, setFilter] = useState<FilterType>('new');
  const [shopGender, setShopGender] = useState<GenderKey>('all');
  const [shopBrand, setShopBrand] = useState<string | null>(null);
  const [shopCategory, setShopCategory] = useState('all');
  const [shopGenre, setShopGenre] = useState<BrandGenre | null>(null);
  const [shopRetailer, setShopRetailer] = useState<string | null>(null);
  const [shopSort, setShopSort] = useState<SortKey>('default');
  const [showPostFlow, setShowPostFlow] = useState(false);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [trendingSort, setTrendingSort] = useState<TrendingSort>('hot');
  const [followingSort, setFollowingSort] = useState<TrendingSort>('newest');
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
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

  // Stable close handling for fullscreen detail view
  const closeDetail = useCallback(() => setDetailPost(null), []);

  const handleCloseDetail = useCallback(() => {
    closeDetail();
  }, [closeDetail]);

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

  const shouldShowEmpty = () => {
    if (filter === 'trending' && visiblePosts.length < 3) return true;
    if ((filter === 'new' || filter === 'similar' || filter === 'following') && visiblePosts.length === 0) return true;
    return false;
  };

  const handleRefresh = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-4 pt-2">
        <CommunityHeader cartCount={cartCount} onPostLook={onPostLook} />
        <CommunityFilterTabs filter={filter} onFilterChange={setFilter} />

        <FeedSortControls
          filter={filter}
          trendingSort={trendingSort}
          followingSort={followingSort}
          filterUserId={filterUserId}
          posts={posts}
          onTrendingSortChange={setTrendingSort}
          onFollowingSortChange={setFollowingSort}
          onFilterUserIdChange={setFilterUserId}
        />

        {filter === 'shop' ? (
          <>
            <ShopFiltersPanel
              shopCategory={shopCategory}
              shopBrand={shopBrand}
              shopGender={shopGender}
              shopGenre={shopGenre}
              shopRetailer={shopRetailer}
              shopSort={shopSort}
              availableRetailers={availableRetailers}
              availableFits={availableFits}
              onCategoryChange={setShopCategory}
              onBrandChange={setShopBrand}
              onGenderChange={setShopGender}
              onGenreChange={setShopGenre}
              onRetailerChange={setShopRetailer}
              onSortChange={setShopSort}
              onClearAll={() => { setShopBrand(null); setShopGenre(null); setShopRetailer(null); setShopGender('all'); setShopCategory('all'); setShopSort('default'); }}
            />
            <div className="space-y-2">
              {shopCategory === 'all' ? (
                ALL_PRODUCT_CATEGORIES.map(cat => (
                  <CategoryProductGrid
                    key={cat.key}
                    category={cat.key}
                    title={cat.label}
                    collapsed={true}
                    maxItems={100}
                    gender={shopGender === 'all' ? undefined : shopGender}
                    brand={shopBrand || undefined}
                    genre={shopGenre}
                    retailer={shopRetailer || undefined}
                    onSelectProduct={(product) => navigateToTryOn(navigate, { productUrl: product.product_url || undefined, fallbackClothingImageUrl: product.image_url, source: 'style_check_shop' })}
                  />
                ))
              ) : (
                <CategoryProductGrid
                  category={shopCategory}
                  title={shopCategory.charAt(0).toUpperCase() + shopCategory.slice(1)}
                  collapsed={false}
                  maxItems={100}
                  gender={shopGender === 'all' ? undefined : shopGender}
                  brand={shopBrand || undefined}
                  genre={shopGenre}
                  retailer={shopRetailer || undefined}
                  onSelectProduct={(product) => navigateToTryOn(navigate, { productUrl: product.product_url || undefined, fallbackClothingImageUrl: product.image_url, source: 'style_check_shop' })}
                />
              )}
            </div>
          </>
        ) : filter === 'swipe' ? (
          <CommunitySwipeStack
            posts={visiblePosts}
            loading={loading}
            votes={votes}
            voteCounts={voteCounts}
            failedImages={new Set()}
            onVote={handleVote}
            onOpenDetail={setDetailPost}
          />
        ) : (
          <CommunityFeedGrid
            posts={visiblePosts}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            filter={filter}
            votes={votes}
            voteCounts={voteCounts}
            followToggles={followToggles}
            hasScan={hasScan}
            userId={user?.id}
            onVote={handleVote}
            onFollowToggle={handleFollowToggle}
            onDeletePost={handleDeletePost}
            onImageError={handleImageError}
            onOpenDetail={setDetailPost}
            onCaptionUpdated={handleCaptionUpdated}
            onPostLook={onPostLook}
            onLoadMore={loadMore}
            shouldShowEmpty={shouldShowEmpty()}
          />
        )}
      </div>
      </PullToRefresh>

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
        onDelete={async (postId) => {
          setDetailPost(null);
          // Allow sheet to fully unmount and restore body overflow before proceeding
          await new Promise(r => setTimeout(r, 100));
          document.body.style.overflow = '';
          document.documentElement.style.overflow = '';
          await handleDeletePost(postId);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
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
          className="fixed z-[9999] h-11 w-11 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white/70 flex items-center justify-center shadow-xl active:scale-90 transition-transform"
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
