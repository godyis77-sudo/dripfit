import { forwardRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Camera, Heart, ShoppingBag, TrendingUp, MessageSquare, Bookmark } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import CategoryProductGrid from '@/components/catalog/CategoryProductGrid';

const PROMPTS = [
  'Should I buy this for work?',
  'Date night — yes or no?',
  'Would you wear this?',
  'Too bold or just right?',
  'Casual Friday vibes?',
  'Wedding guest — yay or nay?',
];
const getPrompt = (idx: number) => PROMPTS[idx % PROMPTS.length];

interface TrendingPost {
  id: string;
  username: string;
  caption: string | null;
  image_url: string;
  like_count: number;
  created_at: string;
  isLive?: boolean;
}

/* ── Price filter config ── */
const PRICE_FILTERS = [
  { label: 'All Prices', min: 0, max: Infinity },
  { label: 'Under $50', min: 0, max: 50 },
  { label: '$50–200', min: 50, max: 200 },
  { label: '$200–500', min: 200, max: 500 },
  { label: 'Luxury', min: 500, max: Infinity },
] as const;

const AuthenticatedHome = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { user, userGender } = useAuth();
  const mappedGender = userGender === 'male' ? 'mens' : userGender === 'female' ? 'womens' : undefined;
  const [fabOpen, setFabOpen] = useState(false);
  const [trendingFits, setTrendingFits] = useState<TrendingPost[]>([]);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [hasScan, setHasScan] = useState<boolean | null>(null);
  const [activePriceIdx, setActivePriceIdx] = useState(0);

  useEffect(() => {
    let stale = false;

    const fetchTrending = async () => {
      const TARGET = 6;
      let posts: TrendingPost[] = [];

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      if (user) {
        const { data: livePosts } = await supabase
          .from('tryon_posts')
          .select('id, user_id, caption, result_photo_url, created_at, is_public')
          .eq('is_public', true)
          .neq('user_id', user.id)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(TARGET);

        if (livePosts && livePosts.length > 0) {
          const userIds = [...new Set(livePosts.map(p => p.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', userIds);
          const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

          const postIds = livePosts.map(p => p.id);
          const { data: votes } = await supabase
            .from('community_votes')
            .select('post_id')
            .in('post_id', postIds);
          const voteCounts = new Map<string, number>();
          votes?.forEach(v => voteCounts.set(v.post_id, (voteCounts.get(v.post_id) || 0) + 1));

          posts = livePosts
            .map(p => ({
              id: p.id,
              username: nameMap.get(p.user_id) || 'User',
              caption: p.caption,
              image_url: p.result_photo_url,
              like_count: voteCounts.get(p.id) || 0,
              created_at: p.created_at,
              isLive: true,
            }))
            .sort((a, b) => b.like_count - a.like_count);
        }
      }

      if (posts.length < TARGET) {
        const remaining = TARGET - posts.length;
        const { data: seeds } = await supabase
          .from('seed_posts')
          .select('*')
          .eq('is_public', true)
          .order('like_count', { ascending: false })
          .limit(remaining);
        if (seeds) {
          posts = [...posts, ...seeds.map(s => ({ ...s, isLive: false }))];
        }
      }

      if (!stale) setTrendingFits(posts);
    };

    const fetchProfileName = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle();
      if (!stale && data?.display_name) setProfileName(data.display_name);
    };

    const checkScanStatus = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('body_scans')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (!stale) setHasScan(!!data);
    };

    fetchTrending();
    fetchProfileName();
    checkScanStatus();

    return () => { stale = true; };
  }, [user]);

  const displayName = profileName || user?.email?.split('@')[0] || '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const priceFilter = activePriceIdx === 0 ? null : { min: PRICE_FILTERS[activePriceIdx].min, max: PRICE_FILTERS[activePriceIdx].max };

  const closeFab = useCallback(() => setFabOpen(false), []);

  return (
    <div ref={ref} className="relative min-h-screen bg-background pb-safe-bottom">
      {/* Scrim for FAB */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={closeFab}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 px-5 pt-5">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <p className="text-muted-foreground text-[12px]">{greeting}{displayName ? ',' : '!'}</p>
          {displayName && <h1 className="font-display text-xl font-bold text-foreground">{displayName}</h1>}
        </motion.div>

        {/* ━━━ FIX 2: Context-aware Quick Actions ━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-2 mb-6"
        >
          {hasScan ? (
            <>
              <button
                onClick={() => { trackEvent('home_quick_scan'); navigate('/capture'); }}
                className="flex items-center gap-2.5 bg-card border border-border rounded-xl p-3 active:scale-[0.97] transition-transform min-h-[44px]"
              >
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <span className="text-base">📐</span>
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-bold text-foreground">Update Scan</p>
                  <p className="text-[10px] text-muted-foreground">Refresh your measurements</p>
                </div>
              </button>
              <button
                onClick={() => { trackEvent('home_quick_tryon'); navigate('/tryon'); }}
                className="flex items-center gap-2.5 bg-card border border-border rounded-xl p-3 active:scale-[0.97] transition-transform min-h-[44px]"
              >
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-bold text-foreground">Try-On</p>
                  <p className="text-[10px] text-muted-foreground">See it on you</p>
                </div>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { trackEvent('home_quick_scan'); navigate('/capture'); }}
                className="flex items-center gap-2.5 bg-card border border-border rounded-xl p-3 active:scale-[0.97] transition-transform min-h-[44px]"
              >
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <span className="text-base">📷</span>
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-bold text-foreground">Get Your Size</p>
                  <p className="text-[10px] text-muted-foreground">2 photos · 60 seconds</p>
                </div>
              </button>
              <div className="flex items-center gap-2.5 bg-card border border-border rounded-xl p-3 opacity-55">
                <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-bold text-foreground">Try-On</p>
                  <p className="text-[10px] text-muted-foreground">Complete a scan first</p>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* ━━━ FIX 3: Trending Fits — community content ━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <p className="section-label mb-0">Trending Fits</p>
            </div>
            <button
              onClick={() => navigate('/style-check')}
              className="text-[10px] text-primary font-semibold min-h-[44px] flex items-center"
            >
              See all
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {trendingFits.slice(0, 6).map((fit, idx) => {
              const question = fit.caption || getPrompt(idx);
              return (
                <button
                  key={fit.id}
                  onClick={() => navigate('/style-check')}
                  className="relative bg-card border border-border rounded-xl overflow-hidden aspect-[3/4] group active:scale-[0.97] transition-transform"
                >
                  <img
                    src={fit.image_url}
                    alt={fit.caption || 'Trending fit'}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/20" />
                  <div className="absolute inset-x-0 bottom-6 px-1.5">
                    <p className="text-white font-bold text-[11px] leading-tight line-clamp-2">
                      {question.endsWith('?') && (
                        <MessageSquare className="inline h-2.5 w-2.5 mr-0.5 opacity-50 -mt-0.5" />
                      )}
                      {question}
                    </p>
                  </div>
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded-lg px-1.5 py-0.5">
                    <Heart className="h-2.5 w-2.5 text-primary" />
                    <span className="text-[9px] font-bold text-foreground">{fit.like_count}</span>
                  </div>
                  <div className="absolute top-1.5 left-1.5">
                    <span className="text-[8px] font-bold text-white bg-black/40 backdrop-blur-sm rounded-lg px-1 py-0.5">{fit.username}</span>
                  </div>
                </button>
              );
            })}
            {/* Placeholder cards if fewer than 3 community posts */}
            {trendingFits.filter(f => f.isLive).length < 3 &&
              Array.from({ length: Math.max(0, 3 - trendingFits.filter(f => f.isLive).length) }).map((_, i) => (
                <button
                  key={`placeholder-${i}`}
                  onClick={() => navigate('/tryon')}
                  className="relative bg-card border border-dashed border-border rounded-xl overflow-hidden aspect-[3/4] flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                  <p className="text-[10px] font-medium text-muted-foreground text-center px-2">Be first to post a look</p>
                </button>
              ))}
          </div>
        </motion.div>

        {/* ━━━ FIX 5: Price filter chips ━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mb-3"
        >
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {PRICE_FILTERS.map((filter, idx) => (
              <button
                key={filter.label}
                onClick={() => setActivePriceIdx(idx)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors min-h-[36px] border ${
                  activePriceIdx === idx
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ━━━ FIX 1: Product grids — 2 column layout ━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-primary" />
              <p className="section-label mb-0">Recommended for you</p>
            </div>
            <button
              onClick={() => navigate('/browse/tops')}
              className="text-[10px] text-primary font-semibold min-h-[44px] flex items-center"
            >
              Try on →
            </button>
          </div>
          {[
            { category: 'tops', title: 'Tops', seed: 42 },
            { category: 'bottom', title: 'Bottoms', seed: 314 },
            { category: 'dress', title: 'Dresses', seed: 628 },
            { category: 'outerwear', title: 'Outerwear', seed: 1597 },
            { category: 'shoes', title: 'Shoes', seed: 2718 },
            { category: 'accessories', title: 'Trending Accessories', seed: 7777 },
          ].map((section, idx) => (
            <div key={section.category} className={idx > 0 ? 'mt-3' : ''}>
              <CategoryProductGrid
                category={section.category}
                title={idx > 0 ? section.title : undefined}
                collapsed={idx > 0}
                maxItems={8}
                seed={section.seed}
                showViewAll={true}
                priceFilter={priceFilter}
                gender={mappedGender}
                onSelectProduct={(product) => {
                  trackEvent('catalog_product_tryon', { brand: product.brand, category: product.category });
                  navigate('/tryon', { state: { clothingUrl: product.image_url, productUrl: product.product_url } });
                }}
              />
            </div>
          ))}
        </motion.div>

        {/* Gender nudge banner */}
        {!userGender && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="mb-4"
          >
            <button
              onClick={() => navigate('/profile/settings')}
              className="w-full bg-card border border-primary/20 rounded-xl p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="h-9 w-9 rounded-xl gradient-drip flex items-center justify-center shrink-0">
                <ShoppingBag className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="text-left flex-1">
                <p className="text-[12px] font-bold text-foreground">Personalize your picks</p>
                <p className="text-[10px] text-muted-foreground">Tell us how you shop for better recommendations</p>
              </div>
              <span className="text-[10px] font-bold text-primary shrink-0">Set →</span>
            </button>
          </motion.div>
        )}

        {/* ━━━ FIX 6: Recently Saved removed ━━━ */}
        {/* Contextual upsell if user hasn't scanned */}
        {hasScan === false && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8"
          >
            <button
              onClick={() => navigate('/capture')}
              className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-[12px] font-bold text-foreground">Get personalized size recommendations</p>
                <p className="text-[10px] text-muted-foreground">Complete a 60-second body scan for perfect fit</p>
              </div>
            </button>
          </motion.div>
        )}
      </div>

      {/* ━━━ FIX 4: Speed-dial FAB ━━━ */}
      <div className="fixed bottom-20 right-5 z-50 lg:right-[calc(50%-195px+20px)]">
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-3 flex flex-col gap-2.5 items-end"
            >
              {[
                { icon: <span className="text-sm">📷</span>, label: 'New Body Scan', action: () => navigate('/capture') },
                { icon: <Sparkles className="h-4 w-4 text-primary-foreground" />, label: 'New Try-On', action: () => navigate('/tryon') },
                { icon: <Bookmark className="h-4 w-4 text-primary-foreground" />, label: 'Save a Look', action: () => navigate('/style-check') },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 12, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.8 }}
                  transition={{ delay: idx * 0.06, duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-[11px] font-semibold text-foreground bg-card border border-border rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap">
                    {item.label}
                  </span>
                  <button
                    onClick={() => { closeFab(); item.action(); }}
                    className="h-11 w-11 rounded-full bg-primary shadow-lg flex items-center justify-center active:scale-90 transition-transform"
                  >
                    {item.icon}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setFabOpen(!fabOpen)}
          className="h-12 w-12 rounded-full bg-primary shadow-lg flex items-center justify-center"
          style={{ boxShadow: '0 0 24px -4px hsl(45 88% 40% / 0.4)' }}
          aria-label={fabOpen ? 'Close menu' : 'Quick actions'}
        >
          <Plus className={`h-5 w-5 text-primary-foreground transition-transform duration-200 ease-in-out ${fabOpen ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>
    </div>
  );
});

AuthenticatedHome.displayName = 'AuthenticatedHome';

export default AuthenticatedHome;
