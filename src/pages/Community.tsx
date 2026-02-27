import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Send, Shirt, Sparkles, ShoppingBag, TrendingUp, Users, ChevronDown, Bookmark, Camera, MessageSquare, Flame, Search, Ruler, UserPlus, UserCheck, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { detectRetailer } from '@/lib/retailerDetect';
import { getBestRetailerForItem } from '@/lib/retailerLinks';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { getFollowingIds } from '@/hooks/useFollow';
import BottomTabBar from '@/components/BottomTabBar';
import PostLookFlow from '@/components/community/PostLookFlow';
import { PostDetailSheet } from '@/components/community/PostDetailSheet';

interface Post {
  id: string;
  user_id: string;
  result_photo_url: string;
  clothing_photo_url: string;
  caption: string | null;
  created_at: string;
  product_url?: string | null;
  profile?: { display_name: string | null; avatar_url?: string | null };
  avg_style?: number;
  avg_color?: number;
  avg_buy?: number;
  avg_suitability?: number;
  rating_count?: number;
}

const VOTE_OPTIONS = [
  { key: 'love', label: 'Love it', emoji: '❤️' },
  { key: 'buy', label: 'Buy it', emoji: '🔥' },
  { key: 'keep_shopping', label: 'Keep shopping', emoji: '🛒' },
] as const;

type TrendingSort = 'hot' | 'love' | 'buy' | 'newest' | 'user';

const RATING_LABELS = [
  { key: 'style_score', label: 'Style' },
  { key: 'color_score', label: 'Color' },
  { key: 'buy_score', label: 'Buy' },
  { key: 'suitability_score', label: 'Fit' },
] as const;

type FilterType = 'trending' | 'new' | 'similar' | 'shop' | 'following';

interface Retailer {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string;
  category: string;
  is_active: boolean;
}

const PROMPTS = [
  'Would you wear this?',
  'Date night — yes or no?',
  'Should I buy this for work?',
  'Too bold or just right?',
  'Casual Friday vibes?',
  'Wedding guest — yay or nay?',
  'Could you pull this off?',
  'Brunch outfit material?',
  'Festival ready or nah?',
  'Office appropriate?',
  'First date energy?',
  'Streetwear or try again?',
  'Summer vacation fit?',
  'Would you rock this to the gym?',
  'Cozy enough for a movie night?',
  'Drip or skip?',
  'Airport outfit check',
  'Night out — cop or drop?',
  'Is this giving main character?',
  'Rate this vibe 1-10',
  'Hot take — overdressed or perfect?',
  'Would you steal this look?',
  'Dinner party ready?',
  'Spring wardrobe essential?',
  'Weekend errand fit?',
];

const getPrompt = (postId: string, idx: number) => {
  // Hash-based selection for variety — same post always gets same prompt
  const hash = postId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PROMPTS[(hash + idx) % PROMPTS.length];
};

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} onClick={() => onChange(n)} className="p-0.5 active:scale-110 transition-transform">
        <Star className={`h-3.5 w-3.5 ${n <= value ? 'fill-primary text-primary' : 'text-muted-foreground/40'}`} />
      </button>
    ))}
  </div>
);

interface SeedPost {
  id: string;
  username: string;
  caption: string | null;
  image_url: string;
  like_count: number;
  created_at: string;
}

const seedToPost = (s: SeedPost): Post => ({
  id: `seed-${s.id}`,
  user_id: '',
  result_photo_url: s.image_url,
  clothing_photo_url: '',
  caption: s.caption,
  created_at: s.created_at,
  profile: { display_name: s.username },
  avg_style: 0,
  avg_color: 0,
  avg_buy: 0,
  avg_suitability: 0,
  rating_count: s.like_count,
});



const Community = () => {
  const navigate = useNavigate();
  usePageTitle('Fit Check');
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('new');
  const [expandedRatings, setExpandedRatings] = useState<Record<string, boolean>>({});
  const [ratingPost, setRatingPost] = useState<string | null>(null);
  const [ratings, setRatings] = useState({ style_score: 0, color_score: 0, buy_score: 0, suitability_score: 0 });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [votes, setVotes] = useState<Record<string, string[]>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<string, number>>>({});
  const [showPostFlow, setShowPostFlow] = useState(false);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [trendingSort, setTrendingSort] = useState<TrendingSort>('hot');
  const [followingSort, setFollowingSort] = useState<TrendingSort>('newest');
  const [filterUserId, setFilterUserId] = useState<string | null>(null);

  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [retailersLoading, setRetailersLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followToggles, setFollowToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (filter === 'shop') {
      fetchRetailers();
    } else if (filter === 'following') {
      fetchFollowingFeed();
    } else {
      fetchPosts();
    }
  }, [filter]);

  // Load following IDs for follow buttons
  useEffect(() => {
    if (!user) return;
    getFollowingIds(user.id).then(ids => {
      setFollowingIds(ids);
      const toggles: Record<string, boolean> = {};
      ids.forEach(id => { toggles[id] = true; });
      setFollowToggles(toggles);
    });
  }, [user]);

  const fetchFollowingFeed = async () => {
    if (!user) { setPosts([]); setLoading(false); return; }
    setLoading(true);
    const ids = followingIds.length > 0 ? followingIds : await getFollowingIds(user.id);
    if (ids.length === 0) { setPosts([]); setLoading(false); return; }
    const { data } = await supabase.from('tryon_posts').select('*').eq('is_public', true).in('user_id', ids).order('created_at', { ascending: false }).limit(50);
    if (!data || data.length === 0) { setPosts([]); setLoading(false); return; }
    const userIds = [...new Set(data.map(p => p.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const enriched = data.map(p => ({ ...p, profile: profileMap.get(p.user_id) || { display_name: 'Anonymous' }, rating_count: 0 }));
    setPosts(enriched);
    setLoading(false);
  };

  const handleFollowToggle = async (targetUserId: string) => {
    if (!user) { toast({ title: 'Sign in to follow', variant: 'destructive' }); navigate('/auth'); return; }
    const isCurrentlyFollowing = followToggles[targetUserId];
    setFollowToggles(prev => ({ ...prev, [targetUserId]: !isCurrentlyFollowing }));
    if (isCurrentlyFollowing) {
      await supabase.from('user_follows' as any).delete().eq('follower_id', user.id).eq('following_id', targetUserId);
      setFollowingIds(prev => prev.filter(id => id !== targetUserId));
      trackEvent('user_unfollowed');
    } else {
      await supabase.from('user_follows' as any).insert({ follower_id: user.id, following_id: targetUserId } as any);
      setFollowingIds(prev => [...prev, targetUserId]);
      trackEvent('user_followed');
    }
    // Refresh the Following tab if active
    if (filter === 'following') {
      setTimeout(() => fetchFollowingFeed(), 300);
    }
  };

  const fetchRetailers = async () => {
    setRetailersLoading(true);
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setRetailers((data as unknown as Retailer[]) || []);
    } catch (e) {
      console.error('Failed to fetch retailers:', e);
    } finally {
      setRetailersLoading(false);
    }
  };

  const isValidImageUrl = (url: string | null | undefined): boolean => {
    if (!url || url === '') return false;
    if (url.includes('placeholder') || url.includes('undefined')) return false;
    return true;
  };

  const handleImageError = (postId: string) => {
    setFailedImages(prev => new Set(prev).add(postId));
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tryon_posts').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(50);
    if (error) { console.error(error); setLoading(false); return; }
    if (!data || data.length === 0) {
      // Fetch seed posts as fallback
      const { data: seeds } = await supabase.from('seed_posts').select('*').eq('is_public', true).order('created_at', { ascending: false });
      if (seeds && seeds.length > 0) {
        const validSeeds = (seeds as SeedPost[]).filter(s => isValidImageUrl(s.image_url));
        const seedPosts = validSeeds.map(seedToPost);
        if (filter === 'trending') seedPosts.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
        setPosts(seedPosts);
      } else {
        setPosts([]);
      }
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.map(p => p.user_id))];
    const postIds = data.map(p => p.id);
    const [profilesRes, ratingsRes] = await Promise.all([
      userIds.length > 0 ? supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds) : { data: [] },
      postIds.length > 0 ? supabase.from('tryon_ratings').select('post_id, style_score, color_score, buy_score, suitability_score').in('post_id', postIds) : { data: [] },
    ]);

    const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
    const ratingsByPost = new Map<string, any[]>();
    (ratingsRes.data || []).forEach(r => { if (!ratingsByPost.has(r.post_id)) ratingsByPost.set(r.post_id, []); ratingsByPost.get(r.post_id)!.push(r); });

    let enriched = data.map(p => {
      const pr = ratingsByPost.get(p.id) || [];
      const c = pr.length;
      return { ...p, profile: profileMap.get(p.user_id) || { display_name: 'Anonymous' }, avg_style: c ? pr.reduce((s: number, r: any) => s + r.style_score, 0) / c : 0, avg_color: c ? pr.reduce((s: number, r: any) => s + r.color_score, 0) / c : 0, avg_buy: c ? pr.reduce((s: number, r: any) => s + r.buy_score, 0) / c : 0, avg_suitability: c ? pr.reduce((s: number, r: any) => s + r.suitability_score, 0) / c : 0, rating_count: c };
    });
    if (filter === 'trending') enriched.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0)); // initial sort; real trending sort uses voteCounts applied later
    setPosts(enriched);
    setLoading(false);
  };

  const handleSubmitRating = async (postId: string) => {
    if (!user) { toast({ title: 'Sign in to rate', variant: 'destructive' }); return; }
    if (Object.values(ratings).some(v => v === 0)) { toast({ title: 'Rate all categories', variant: 'destructive' }); return; }
    setSubmitting(true);
    const { error } = await supabase.from('tryon_ratings').insert({ post_id: postId, rater_user_id: user.id, ...ratings, comment: comment || null });
    if (error) { toast({ title: 'Error', description: error.message.includes('unique') ? 'You already rated this look.' : error.message, variant: 'destructive' }); }
    else { trackEvent('community_rated'); toast({ title: 'Rating submitted!' }); setRatingPost(null); setRatings({ style_score: 0, color_score: 0, buy_score: 0, suitability_score: 0 }); setComment(''); fetchPosts(); }
    setSubmitting(false);
  };

  // Load vote counts and user's own votes from DB
  const loadVoteCounts = async (postIds: string[]) => {
    if (postIds.length === 0) return;
    const { data: allVotes } = await supabase.from('community_votes' as any).select('post_id, vote_key, user_id').in('post_id', postIds);
    if (!allVotes) return;
    const counts: Record<string, Record<string, number>> = {};
    const userVotes: Record<string, string[]> = {};
    (allVotes as any[]).forEach((v: any) => {
      if (!counts[v.post_id]) counts[v.post_id] = { love: 0, buy: 0, keep_shopping: 0 };
      counts[v.post_id][v.vote_key] = (counts[v.post_id][v.vote_key] || 0) + 1;
      if (user && v.user_id === user.id) {
        if (!userVotes[v.post_id]) userVotes[v.post_id] = [];
        userVotes[v.post_id].push(v.vote_key);
      }
    });
    setVoteCounts(prev => ({ ...prev, ...counts }));
    setVotes(prev => ({ ...prev, ...userVotes }));
  };

  // Load counts when posts change
  useEffect(() => {
    if (posts.length > 0) {
      loadVoteCounts(posts.map(p => p.id));
    }
  }, [posts, user]);

  const handleVote = async (postId: string, key: string) => {
    if (!user) { toast({ title: 'Sign in to vote', description: 'Create a free account to share your opinion.', variant: 'destructive' }); return; }
    
    const currentVotes = votes[postId] || [];
    const hasKey = currentVotes.includes(key);
    
    let newVotes: string[];
    if (key === 'keep_shopping') {
      // keep_shopping is exclusive — toggle it, remove love/buy
      if (hasKey) {
        newVotes = [];
      } else {
        newVotes = ['keep_shopping'];
        // Remove love/buy from DB
        for (const k of currentVotes) {
          if (k !== 'keep_shopping') {
            await supabase.from('community_votes' as any).delete().eq('post_id', postId).eq('user_id', user.id).eq('vote_key', k);
          }
        }
      }
    } else {
      // love/buy can coexist, but remove keep_shopping if present
      if (hasKey) {
        newVotes = currentVotes.filter(v => v !== key);
      } else {
        newVotes = [...currentVotes.filter(v => v !== 'keep_shopping'), key];
        // Remove keep_shopping from DB if it was there
        if (currentVotes.includes('keep_shopping')) {
          await supabase.from('community_votes' as any).delete().eq('post_id', postId).eq('user_id', user.id).eq('vote_key', 'keep_shopping');
        }
      }
    }
    
    // Optimistic update
    setVotes(prev => ({ ...prev, [postId]: newVotes }));
    setVoteCounts(prev => {
      const postCounts = { ...(prev[postId] || { love: 0, buy: 0, keep_shopping: 0 }) };
      // Decrement removed keys
      for (const k of currentVotes) {
        if (!newVotes.includes(k)) postCounts[k] = Math.max(0, (postCounts[k] || 0) - 1);
      }
      // Increment added keys
      for (const k of newVotes) {
        if (!currentVotes.includes(k)) postCounts[k] = (postCounts[k] || 0) + 1;
      }
      return { ...prev, [postId]: postCounts };
    });
    
    // Persist: toggle in DB
    if (hasKey) {
      await supabase.from('community_votes' as any).delete().eq('post_id', postId).eq('user_id', user.id).eq('vote_key', key);
    } else {
      await supabase.from('community_votes' as any).insert({ post_id: postId, user_id: user.id, vote_key: key } as any);
    }
    
    trackEvent('vote_cast', { vote: key, source: 'fitcheck' });
    trackEvent('fitcheck_voted', { vote: key });
  };

  const handleShopLook = (post: Post) => {
    trackEvent('shop_clickout', { source: 'fitcheck', hasProductUrl: !!post.product_url });
    if (post.product_url) {
      window.open(post.product_url, '_blank', 'noopener');
    } else {
      const query = encodeURIComponent(post.caption || 'outfit');
      window.open(`https://www.google.com/search?tbm=shop&q=${query}`, '_blank', 'noopener');
    }
  };

  const isPlaceholder = (post: Post) => post.id.startsWith('seed-');

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
              <h1 className="text-base font-bold text-foreground">Fit Check</h1>
              <p className="text-[10px] text-muted-foreground">Get real opinions before you buy</p>
            </div>
          </div>
          <Button
            className="rounded-lg btn-luxury text-primary-foreground h-8 px-3 text-[11px] font-bold active:scale-95 transition-transform"
            onClick={() => { trackEvent('fitcheck_post_started'); if (!user) { toast({ title: 'Sign in to post', variant: 'destructive' }); navigate('/auth'); return; } setShowPostFlow(true); }}
          >
            <Sparkles className="mr-1 h-3 w-3" /> Post a Look
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-border mb-4 overflow-x-auto no-scrollbar">
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
              className={`flex-1 py-2 text-[12px] font-semibold transition-all relative whitespace-nowrap px-2 ${
                filter === f.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
              {filter === f.key && (
                <motion.div layoutId="fitcheck-tab" className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Trending sub-sort pills */}
        {filter === 'trending' && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
            {([
              { key: 'hot' as TrendingSort, label: '🔥 Hot' },
              { key: 'love' as TrendingSort, label: '❤️ Top Liked' },
              { key: 'buy' as TrendingSort, label: '🛍️ Top Buy' },
              { key: 'newest' as TrendingSort, label: '🕐 Newest' },
              { key: 'user' as TrendingSort, label: '👤 By User' },
            ]).map(s => (
              <button
                key={s.key}
                onClick={() => { setTrendingSort(s.key); if (s.key !== 'user') setFilterUserId(null); }}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
                  trendingSort === s.key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* User filter chips when "By User" is selected */}
        {((filter === 'trending' && trendingSort === 'user') || (filter === 'following' && followingSort === 'user')) && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterUserId(null)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
                !filterUserId ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              All
            </button>
            {[...new Map(posts.filter(p => p.profile?.display_name).map(p => [p.user_id, p.profile?.display_name])).entries()].map(([uid, name]) => (
              <button
                key={uid}
                onClick={() => setFilterUserId(filterUserId === uid ? null : uid)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
                  filterUserId === uid ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Following sub-sort pills */}
        {filter === 'following' && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
            {([
              { key: 'newest' as TrendingSort, label: '🕐 Newest' },
              { key: 'hot' as TrendingSort, label: '🔥 Hot' },
              { key: 'love' as TrendingSort, label: '❤️ Top Liked' },
              { key: 'buy' as TrendingSort, label: '🛍️ Top Buy' },
              { key: 'user' as TrendingSort, label: '👤 By User' },
            ]).map(s => (
              <button
                key={s.key}
                onClick={() => { setFollowingSort(s.key); if (s.key !== 'user') setFilterUserId(null); }}
                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
                  followingSort === s.key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {filter === 'shop' ? (
          retailersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-xl skeleton-gold" />
              ))}
            </div>
          ) : retailers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="h-8 w-8 text-primary mb-3" />
              <h2 className="font-display text-base font-bold mb-1">No retailers yet</h2>
              <p className="text-[13px] text-muted-foreground">Retailers will appear here soon</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="py-2.5 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Retailer</th>
                    <th className="py-2.5 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Category</th>
                    <th className="py-2.5 px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {retailers.map((r, idx) => (
                    <tr key={r.id} className={`${idx < retailers.length - 1 ? 'border-b border-border' : ''} hover:bg-muted/20 transition-colors`}>
                      <td className="py-2.5 px-3">
                        <span className="text-[13px] font-semibold text-foreground">{r.name}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] text-muted-foreground capitalize">{r.category}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-[11px] font-bold text-primary hover:text-primary"
                          onClick={() => {
                            trackEvent('retailer_click', { retailer: r.name });
                            window.open(r.website_url, '_blank', 'noopener');
                          }}
                        >
                          Shop →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="w-full aspect-[4/5] skeleton-gold" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-2/3 rounded skeleton-gold" />
                  <div className="h-3 w-1/2 rounded skeleton-gold" />
                  <div className="flex gap-1.5 mt-2">
                    <div className="h-8 flex-1 rounded-lg skeleton-gold" />
                    <div className="h-8 flex-1 rounded-lg skeleton-gold" />
                    <div className="h-8 flex-1 rounded-lg skeleton-gold" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (() => {
          let visiblePosts = posts.filter(p => isValidImageUrl(p.result_photo_url) && !failedImages.has(p.id));

          // Apply trending sub-sort using vote counts
          if (filter === 'trending' && visiblePosts.length > 0) {
            const getCount = (id: string, key: string) => voteCounts[id]?.[key] ?? 0;
            switch (trendingSort) {
              case 'hot':
                visiblePosts = [...visiblePosts].sort((a, b) => (getCount(b.id, 'love') + getCount(b.id, 'buy')) - (getCount(a.id, 'love') + getCount(a.id, 'buy')));
                break;
              case 'love':
                visiblePosts = [...visiblePosts].sort((a, b) => getCount(b.id, 'love') - getCount(a.id, 'love'));
                break;
              case 'buy':
                visiblePosts = [...visiblePosts].sort((a, b) => getCount(b.id, 'buy') - getCount(a.id, 'buy'));
                break;
              case 'newest':
                visiblePosts = [...visiblePosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
              case 'user':
                visiblePosts = [...visiblePosts].sort((a, b) => (a.profile?.display_name || '').localeCompare(b.profile?.display_name || ''));
                break;
            }
          }

          // Apply following sub-sort
          if (filter === 'following' && visiblePosts.length > 0) {
            const getCountF = (id: string, key: string) => voteCounts[id]?.[key] ?? 0;
            switch (followingSort) {
              case 'hot':
                visiblePosts = [...visiblePosts].sort((a, b) => (getCountF(b.id, 'love') + getCountF(b.id, 'buy')) - (getCountF(a.id, 'love') + getCountF(a.id, 'buy')));
                break;
              case 'love':
                visiblePosts = [...visiblePosts].sort((a, b) => getCountF(b.id, 'love') - getCountF(a.id, 'love'));
                break;
              case 'buy':
                visiblePosts = [...visiblePosts].sort((a, b) => getCountF(b.id, 'buy') - getCountF(a.id, 'buy'));
                break;
              case 'newest':
                visiblePosts = [...visiblePosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
              case 'user':
                visiblePosts = [...visiblePosts].sort((a, b) => (a.profile?.display_name || '').localeCompare(b.profile?.display_name || ''));
                break;
            }
          }

          // Apply user filter when "By User" is active and a user is selected
          if (filterUserId) {
            visiblePosts = visiblePosts.filter(p => p.user_id === filterUserId);
          }

          if (filter === 'trending' && visiblePosts.length < 3) {
            return (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Flame className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-[18px] font-bold text-foreground mb-1.5">Trending looks will appear here</h2>
                <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5">Post your first try-on and ask the community. The more votes a look gets, the higher it trends.</p>
                <Button className="w-4/5 h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={() => { if (!user) { navigate('/auth'); return; } setShowPostFlow(true); }}>
                  Post a Look
                </Button>
              </div>
            );
          }

          if (filter === 'new' && visiblePosts.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-[18px] font-bold text-foreground mb-1.5">No new looks today — yet</h2>
                <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5">New posts appear here as community members share their try-ons. Check back soon or be the first to post.</p>
                <Button className="w-4/5 h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={() => { if (!user) { navigate('/auth'); return; } setShowPostFlow(true); }}>
                  Be the First to Post
                </Button>
              </div>
            );
          }

          if (filter === 'similar' && visiblePosts.length === 0) {
            // Check if user has scanned
            const hasScan = !!localStorage.getItem('dripcheck_scans') && JSON.parse(localStorage.getItem('dripcheck_scans') || '[]').length > 0;
            if (!hasScan) {
              return (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Ruler className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-[18px] font-bold text-foreground mb-1.5">See looks from people with your body type</h2>
                  <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5">Complete a quick body scan so we can show you try-ons from people with similar measurements.</p>
                  <Button className="w-4/5 h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={() => navigate('/capture')}>
                    Start Body Scan
                  </Button>
                </div>
              );
            }
            return (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-[18px] font-bold text-foreground mb-1.5">No similar fits yet</h2>
                <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5">We're matching looks to your measurements. As more people with similar measurements post, they'll appear here.</p>
                <Button className="w-4/5 h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={() => { if (!user) { navigate('/auth'); return; } setShowPostFlow(true); }}>
                  Post Your Own Look
                </Button>
              </div>
            );
          }

          if (filter === 'following' && visiblePosts.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-[18px] font-bold text-foreground mb-1.5">Your custom feed is empty</h2>
                <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5">Follow people in the community to build a personalized feed of their looks and fit checks.</p>
                <Button className="w-4/5 h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={() => setFilter('new')}>
                  Browse New Looks
                </Button>
              </div>
            );
          }
          
          return (
          <div className="grid grid-cols-2 gap-2 pb-20">
            {visiblePosts.map((post, idx) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                {/* Compact header */}
                <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 active:opacity-70 transition-opacity min-w-0"
                      >
                        {post.profile?.avatar_url ? (
                          <img src={post.profile.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full gradient-drip flex items-center justify-center shrink-0">
                            <span className="text-[7px] font-bold text-primary-foreground">
                              {(post.profile?.display_name || 'A')[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <p className="text-[9px] font-semibold text-foreground truncate">{post.profile?.display_name || 'Anon'}</p>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[140px]">
                      <DropdownMenuItem
                        onClick={() => {
                          const name = post.profile?.display_name || 'Anonymous';
                          if (user && post.user_id === user.id) { navigate('/profile'); return; }
                          navigate(`/profile/${encodeURIComponent(name)}`);
                        }}
                      >
                        <User className="mr-2 h-3.5 w-3.5" /> View Profile
                      </DropdownMenuItem>
                      {user && post.user_id !== user.id && !isPlaceholder(post) && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleFollowToggle(post.user_id)}>
                            {followToggles[post.user_id]
                              ? <><UserCheck className="mr-2 h-3.5 w-3.5 text-primary" /> Unfollow</>
                              : <><UserPlus className="mr-2 h-3.5 w-3.5" /> Follow</>
                            }
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="flex-1" />
                  {user && post.user_id !== user.id && !isPlaceholder(post) && (
                    <span className={`shrink-0 p-0.5 ${followToggles[post.user_id] ? 'text-primary' : 'text-muted-foreground/40'}`}>
                      {followToggles[post.user_id] ? <UserCheck className="h-3 w-3" /> : null}
                    </span>
                  )}
                </div>

                {/* Image — square aspect for grid, tap to open detail */}
                <button onClick={() => setDetailPost(post)} className="relative w-full text-left">
                  <img 
                    src={post.result_photo_url} 
                    alt={post.caption || "Try-on look"} 
                    loading="lazy" 
                    decoding="async" 
                    className="w-full aspect-square object-cover" 
                    onError={() => handleImageError(post.id)}
                  />
                  {/* Caption overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-1.5 px-2">
                    <p className="text-white font-bold text-[10px] leading-snug line-clamp-2">
                      {post.caption || getPrompt(post.id, idx)}
                    </p>
                  </div>
                  {/* Retailer badge */}
                  {(() => {
                    const retailer = post.product_url
                      ? detectRetailer(post.product_url)
                      : getBestRetailerForItem(null, post.caption?.toLowerCase().includes('dress') ? 'dress' : 'top');
                    return retailer ? (
                      <span className="absolute top-1.5 right-1.5 text-[8px] font-bold text-white bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                        {retailer}
                      </span>
                    ) : null;
                  })()}
                </button>

                {/* Compact vote row */}
                <div className="flex gap-1 px-1.5 pt-1.5">
                  {VOTE_OPTIONS.map(v => {
                    const active = (votes[post.id] || []).includes(v.key);
                    return (
                      <button
                        key={v.key}
                        onClick={() => handleVote(post.id, v.key)}
                        className={`flex-1 py-1.5 rounded-md text-[9px] font-bold border transition-all active:scale-95 flex flex-col items-center gap-0.5 ${
                          active
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground'
                        }`}
                      >
                        {v.emoji}
                        <span className="text-[8px] font-medium leading-none">{voteCounts[post.id]?.[v.key] ?? 0}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Mini chat box */}
                <div className="px-1.5 pt-1 pb-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Say something…"
                      className="flex-1 h-6 rounded-md bg-muted/50 border border-border px-2 text-[9px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (!user) { toast({ title: 'Sign in to comment', variant: 'destructive' }); return; }
                          trackEvent('fitcheck_reaction', { postId: post.id, comment: val });
                          toast({ title: 'Sent!', description: val });
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button
                      className="shrink-0 h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center active:scale-90 transition-transform"
                      onClick={(e) => {
                        const input = (e.currentTarget.previousSibling as HTMLInputElement);
                        if (input?.value?.trim()) {
                          if (!user) { toast({ title: 'Sign in to comment', variant: 'destructive' }); return; }
                          trackEvent('fitcheck_reaction', { postId: post.id, comment: input.value.trim() });
                          toast({ title: 'Sent!', description: input.value.trim() });
                          input.value = '';
                        }
                      }}
                    >
                      <Send className="h-2.5 w-2.5 text-primary" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          );
        })()}
      </div>
      <PostLookFlow open={showPostFlow} onOpenChange={setShowPostFlow} onPosted={fetchPosts} />
      <PostDetailSheet
        post={detailPost}
        open={!!detailPost}
        onClose={() => setDetailPost(null)}
        prompt={detailPost ? getPrompt(detailPost.id, posts.indexOf(detailPost)) : ''}
        votes={votes}
        voteCounts={voteCounts}
        onVote={handleVote}
        onComment={(postId, val) => {
          if (!user) { toast({ title: 'Sign in to comment', variant: 'destructive' }); return; }
          trackEvent('fitcheck_reaction', { postId, comment: val });
          toast({ title: 'Sent!', description: val });
        }}
        onFollow={handleFollowToggle}
        onNavigateProfile={(p) => {
          setDetailPost(null);
          const name = p.profile?.display_name || 'Anonymous';
          if (user && p.user_id === user.id) { navigate('/profile'); return; }
          navigate(`/profile/${encodeURIComponent(name)}`);
        }}
        onShopLook={handleShopLook}
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
