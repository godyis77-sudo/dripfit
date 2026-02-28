import { forwardRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Sparkles, Camera, Heart, ShoppingBag, Clock, TrendingUp, Shirt, MessageSquare, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { useProductCatalog, type CatalogProduct } from '@/hooks/useProductCatalog';
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

// Recommended section now uses product catalog

interface RecentItem {
  id: string;
  image_url: string;
  label: string;
  type: 'wardrobe' | 'tryon';
  created_at: string;
}

const AuthenticatedHome = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fabOpen, setFabOpen] = useState(false);
  const [trendingFits, setTrendingFits] = useState<TrendingPost[]>([]);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const fetchTrending = async () => {
      const TARGET = 6;
      let posts: TrendingPost[] = [];

      const { data: livePosts } = await supabase
        .from('tryon_posts')
        .select('id, user_id, caption, result_photo_url, created_at, is_public')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(TARGET);

      if (livePosts && livePosts.length > 0) {
        const userIds = [...new Set(livePosts.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);
        const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

        posts = livePosts.map(p => ({
          id: p.id,
          username: nameMap.get(p.user_id) || 'User',
          caption: p.caption,
          image_url: p.result_photo_url,
          like_count: 0,
          created_at: p.created_at,
          isLive: true,
        }));
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

      setTrendingFits(posts);
    };

    const fetchProfileName = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle();
      if (data?.display_name) setProfileName(data.display_name);
    };

    const fetchRecentItems = async () => {
      if (!user) return;
      const items: RecentItem[] = [];

      // Fetch recent wardrobe items
      const { data: wardrobe } = await supabase
        .from('clothing_wardrobe' as any)
        .select('id, image_url, category, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (wardrobe) {
        items.push(...(wardrobe as any[]).map(w => ({
          id: w.id,
          image_url: w.image_url,
          label: w.category || 'Wardrobe',
          type: 'wardrobe' as const,
          created_at: w.created_at,
        })));
      }

      // Fetch recent try-on results
      const { data: tryons } = await supabase
        .from('tryon_posts')
        .select('id, result_photo_url, caption, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (tryons) {
        items.push(...tryons.map(t => ({
          id: t.id,
          image_url: t.result_photo_url,
          label: t.caption || 'Try-On',
          type: 'tryon' as const,
          created_at: t.created_at,
        })));
      }

      // Sort by date, take latest 6
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentItems(items.slice(0, 6));
    };

    fetchTrending();
    fetchProfileName();
    fetchRecentItems();
  }, [user]);

  const displayName = profileName || user?.email?.split('@')[0] || '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div ref={ref} className="relative min-h-screen bg-background pb-safe-bottom">
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

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-2 mb-6"
        >
          <button
            onClick={() => { trackEvent('home_quick_scan'); navigate('/capture'); }}
            className="flex items-center gap-2.5 bg-card border border-border rounded-xl p-3 active:scale-[0.97] transition-transform min-h-[44px]"
          >
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Camera className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="text-[12px] font-bold text-foreground">New Scan</p>
              <p className="text-[10px] text-muted-foreground">60 seconds</p>
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
        </motion.div>

        {/* Trending Fits */}
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
            {trendingFits.map((fit, idx) => {
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
                  {/* Question overlay */}
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
          </div>
        </motion.div>

        {/* Recommended For You — powered by product catalog */}
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
              onClick={() => navigate('/tryon')}
              className="text-[10px] text-primary font-semibold min-h-[44px] flex items-center"
            >
              Try on →
            </button>
          </div>
          <CategoryProductGrid
            category="top"
            collapsed={false}
            maxItems={8}
            onSelectProduct={(product) => {
              if (product.product_url) {
                trackEvent('catalog_product_clicked', { brand: product.brand, category: product.category });
                window.open(product.product_url, '_blank', 'noopener');
              }
            }}
          />

          {/* Accessories section */}
          <div className="mt-3">
            <CategoryProductGrid
              category="shoes"
              title="Trending Accessories"
              collapsed={true}
              maxItems={8}
              onSelectProduct={(product) => {
                if (product.product_url) {
                  trackEvent('catalog_product_clicked', { brand: product.brand, category: product.category });
                  window.open(product.product_url, '_blank', 'noopener');
                }
              }}
            />
          </div>
        </motion.div>

        {/* Recently Saved */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <p className="section-label mb-0">Recently Saved</p>
            </div>
            <button
              onClick={() => navigate('/profile/saved')}
              className="text-[10px] text-primary font-semibold min-h-[44px] flex items-center"
            >
              View all
            </button>
          </div>
          {recentItems.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {recentItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.type === 'wardrobe' ? '/profile' : '/profile')}
                  className="shrink-0 w-[100px] bg-card border border-border rounded-xl overflow-hidden active:scale-[0.97] transition-transform"
                >
                  <div className="aspect-square bg-muted overflow-hidden">
                    <img src={item.image_url} alt={item.label} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="p-1.5 flex items-center gap-1">
                    {item.type === 'wardrobe' ? (
                      <Shirt className="h-2.5 w-2.5 text-primary shrink-0" />
                    ) : (
                      <Sparkles className="h-2.5 w-2.5 text-primary shrink-0" />
                    )}
                    <p className="text-[9px] text-muted-foreground truncate capitalize">{item.label}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => navigate('/tryon')}
                className="shrink-0 w-[100px] bg-card border border-dashed border-border rounded-xl overflow-hidden active:scale-[0.97] transition-transform"
              >
                <div className="aspect-square flex flex-col items-center justify-center gap-1">
                  <Plus className="h-5 w-5 text-muted-foreground/30" />
                  <p className="text-[9px] text-muted-foreground">Try something on</p>
                </div>
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* FAB */}
      <div className="fixed bottom-20 right-5 z-50 lg:right-[calc(50%-195px+20px)]">
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="mb-2 flex flex-col gap-1.5"
            >
              <Button
                onClick={() => { setFabOpen(false); navigate('/tryon'); }}
                variant="secondary"
                className="h-10 rounded-xl text-[11px] font-semibold shadow-lg px-4"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" /> New Try-On
              </Button>
              <Button
                onClick={() => { setFabOpen(false); navigate('/style-check'); }}
                variant="secondary"
                className="h-10 rounded-xl text-[11px] font-semibold shadow-lg px-4"
              >
                <Heart className="mr-1.5 h-3.5 w-3.5 text-primary" /> Post to Style Check
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setFabOpen(!fabOpen)}
          className="h-12 w-12 rounded-full bg-primary shadow-lg flex items-center justify-center"
          style={{ boxShadow: '0 0 24px -4px hsl(45 88% 40% / 0.4)' }}
        >
          <Plus className={`h-5 w-5 text-primary-foreground transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`} />
        </motion.button>
      </div>
    </div>
  );
});

AuthenticatedHome.displayName = 'AuthenticatedHome';

export default AuthenticatedHome;
