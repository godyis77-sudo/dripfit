import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import BottomTabBar from '@/components/BottomTabBar';
import PostLookFlow from '@/components/community/PostLookFlow';
import { PostDetailSheet } from '@/components/community/PostDetailSheet';
import BrandFilter from '@/components/tryon/BrandFilter';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';
import PostCard from '@/components/community/PostCard';
import EmptyStates from '@/components/community/EmptyStates';
import { useCommunityFeed } from '@/hooks/useCommunityFeed';
import type { Post, FilterType, TrendingSort, GenderKey } from '@/components/community/community-types';
import { GENDER_OPTIONS, isValidImageUrl } from '@/components/community/community-types';

const Community = () => {
  const navigate = useNavigate();
  usePageTitle('Style Check');
  const { user } = useAuth();
  const { toast } = useToast();

  const [filter, setFilter] = useState<FilterType>('new');
  const [shopGender, setShopGender] = useState<GenderKey>('all');
  const [shopBrand, setShopBrand] = useState<string | null>(null);
  const [shopCategory, setShopCategory] = useState('tops');
  const [showPostFlow, setShowPostFlow] = useState(false);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [trendingSort, setTrendingSort] = useState<TrendingSort>('hot');
  const [followingSort, setFollowingSort] = useState<TrendingSort>('newest');
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [similarFitTooltip, setSimilarFitTooltip] = useState(false);

  const {
    posts, loading, votes, voteCounts, followToggles, failedImages,
    hasScan, handleVote, handleFollowToggle, handleDeletePost, handleImageError, fetchPosts,
  } = useCommunityFeed({ userId: user?.id, filter, shopGender });

  const handleShopLook = (post: Post) => {
    const urls = (post.product_urls && post.product_urls.length > 0) ? post.product_urls : (post.product_url ? [post.product_url] : []);
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
    if (!user) { toast({ title: 'Sign in to post', variant: 'destructive' }); navigate('/auth'); return; }
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

  const renderSortPills = (sorts: { key: TrendingSort; label: string }[], activeSort: TrendingSort, setSort: (s: TrendingSort) => void) => (
    <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
      {sorts.map(s => (
        <button
          key={s.key}
          onClick={() => { setSort(s.key); if (s.key !== 'user') setFilterUserId(null); }}
          className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
            activeSort === s.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
          }`}
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
    <div className="min-h-screen bg-background pb-safe-bottom">
      <div className="max-w-sm mx-auto px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8 rounded-lg">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base font-bold text-foreground">Style Check</h1>
              <p className="text-[10px] text-muted-foreground">Get real opinions before you buy</p>
            </div>
          </div>
          <Button className="rounded-lg btn-luxury text-primary-foreground h-8 px-3 text-[11px] font-bold active:scale-95 transition-transform" onClick={onPostLook}>
            <Sparkles className="mr-1 h-3 w-3" /> Post a Look
          </Button>
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
              className={`flex-1 py-2 text-[12px] font-semibold transition-all relative whitespace-nowrap px-2 flex items-center justify-center gap-0.5 ${
                filter === f.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
              {f.key === 'similar' && (
                <button onClick={(e) => { e.stopPropagation(); setSimilarFitTooltip(!similarFitTooltip); }} className="text-[9px] text-muted-foreground/60 ml-0.5">ⓘ</button>
              )}
              {filter === f.key && <motion.div layoutId="fitcheck-tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
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

        {/* Trending sub-sort */}
        {filter === 'trending' && renderSortPills(
          [{ key: 'hot', label: '🔥 Hot' }, { key: 'love', label: '👍 Top Buy' }, { key: 'newest', label: '🕐 Newest' }, { key: 'user', label: '👤 By User' }],
          trendingSort, setTrendingSort,
        )}

        {/* Following sub-sort */}
        {filter === 'following' && renderSortPills(
          [{ key: 'newest', label: '🕐 Newest' }, { key: 'hot', label: '🔥 Hot' }, { key: 'love', label: '👍 Top Buy' }, { key: 'user', label: '👤 By User' }],
          followingSort, setFollowingSort,
        )}

        {/* User filter chips */}
        {((filter === 'trending' && trendingSort === 'user') || (filter === 'following' && followingSort === 'user')) && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterUserId(null)} className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${!filterUserId ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>All</button>
            {[...new Map(posts.filter(p => p.profile?.display_name).map(p => [p.user_id, p.profile?.display_name])).entries()].map(([uid, name]) => (
              <button key={uid} onClick={() => setFilterUserId(filterUserId === uid ? null : uid)} className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${filterUserId === uid ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{name}</button>
            ))}
          </div>
        )}

        {/* Content */}
        {filter === 'shop' ? (
          <>
            <div className="flex gap-1.5 mb-3">
              {GENDER_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => setShopGender(opt.key)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${shopGender === opt.key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>{opt.label}</button>
              ))}
            </div>
            <BrandFilter gender={shopGender === 'all' ? null : shopGender} selectedBrand={shopBrand} onBrandChange={setShopBrand} />
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
              {(shopGender === 'mens'
                ? [{ key: 'tops', label: 'Tops' }, { key: 'bottoms', label: 'Bottoms' }, { key: 'outerwear', label: 'Outerwear' }, { key: 'shoes', label: 'Shoes' }, { key: 'activewear', label: 'Activewear' }, { key: 'accessories', label: 'Accessories' }]
                : [{ key: 'tops', label: 'Tops' }, { key: 'bottoms', label: 'Bottoms' }, { key: 'dresses', label: 'Dresses' }, { key: 'outerwear', label: 'Outerwear' }, { key: 'shoes', label: 'Shoes' }, { key: 'activewear', label: 'Activewear' }, { key: 'accessories', label: 'Accessories' }]
              ).map(cat => (
                <button key={cat.key} onClick={() => setShopCategory(cat.key)} className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${shopCategory === cat.key ? 'bg-primary/15 border border-primary/30 text-primary' : 'bg-card border border-border text-muted-foreground'}`}>{cat.label}</button>
              ))}
            </div>
            <CategoryProductGrid category={shopCategory} collapsed={false} maxItems={50} gender={shopGender === 'all' ? undefined : shopGender} brand={shopBrand || undefined} onSelectProduct={(product) => navigate('/tryon', { state: { productUrl: product.product_url || product.image_url } })} />
          </>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="rounded-xl border border-border overflow-hidden">
                <div className="w-full aspect-[4/5]" style={{ background: 'linear-gradient(110deg, #1A1A1A 30%, #272727 50%, #1A1A1A 70%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                <div className="p-3 space-y-2">
                  <div className="flex gap-1.5">{[1,2,3].map(j => <div key={j} className="h-8 flex-1 rounded-lg" style={{ background: 'linear-gradient(110deg, #1A1A1A 30%, #272727 50%, #1A1A1A 70%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : shouldShowEmpty(filter) ? (
          <EmptyStates filter={filter} hasScan={hasScan} userId={user?.id} onPostLook={onPostLook} />
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-20">
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
              />
            ))}
          </div>
        )}
      </div>

      <PostLookFlow open={showPostFlow} onOpenChange={setShowPostFlow} onPosted={fetchPosts} />
      <PostDetailSheet
        post={detailPost}
        open={!!detailPost}
        onClose={() => setDetailPost(null)}
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
        onDelete={handleDeletePost}
        onTryOn={(p) => {
          setDetailPost(null);
          if (p.product_url) { navigate('/tryon', { state: { productUrl: p.product_url } }); }
          else { toast({ title: 'No product linked to this look' }); }
        }}
        isFollowing={detailPost ? !!followToggles[detailPost.user_id] : false}
        isOwnPost={detailPost ? user?.id === detailPost.user_id : false}
        isPlaceholder={detailPost ? isPlaceholder(detailPost) : false}
        currentUserId={user?.id}
      />
      <BottomTabBar />
    </div>
  );
};

export default Community;
