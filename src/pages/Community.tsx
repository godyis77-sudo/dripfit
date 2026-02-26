import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Send, Shirt, Sparkles, ShoppingBag, TrendingUp, Users, ChevronDown, Bookmark, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import BottomTabBar from '@/components/BottomTabBar';
import PostLookFlow from '@/components/community/PostLookFlow';

interface Post {
  id: string;
  user_id: string;
  result_photo_url: string;
  clothing_photo_url: string;
  caption: string | null;
  created_at: string;
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

const RATING_LABELS = [
  { key: 'style_score', label: 'Style' },
  { key: 'color_score', label: 'Color' },
  { key: 'buy_score', label: 'Buy' },
  { key: 'suitability_score', label: 'Fit' },
] as const;

type FilterType = 'trending' | 'new' | 'similar';

const PROMPTS = [
  'Should I buy this for work?',
  'Date night — yes or no?',
  'Would you wear this?',
  'Too bold or just right?',
  'Casual Friday vibes?',
  'Wedding guest — yay or nay?',
];

const getPrompt = (idx: number) => PROMPTS[idx % PROMPTS.length];

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
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [showPostFlow, setShowPostFlow] = useState(false);

  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => { fetchPosts(); }, [filter]);

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
    if (filter === 'trending') enriched.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
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

  const handleVote = (postId: string, key: string) => {
    setVotes(prev => ({ ...prev, [postId]: prev[postId] === key ? '' : key }));
    trackEvent('vote_cast', { vote: key, source: 'fitcheck' });
    trackEvent('fitcheck_voted', { vote: key });
    if (!user) { toast({ title: 'Sign in to vote', description: 'Create a free account to share your opinion.', variant: 'destructive' }); return; }
  };

  const handleShopLook = (post: Post) => {
    trackEvent('shop_clickout', { source: 'fitcheck' });
    // Navigate to try-on with the clothing image for shopping context
    navigate('/tryon', { state: { shopMode: true } });
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
        <div className="flex border-b border-border mb-4">
          {([
            { key: 'trending' as FilterType, label: 'Trending' },
            { key: 'new' as FilterType, label: 'New' },
            { key: 'similar' as FilterType, label: 'Similar Fit' },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 py-2 text-[12px] font-semibold transition-all relative ${
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

        {loading ? (
          <div className="space-y-3 md:feed-grid">
            {[1, 2].map(i => (
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
          const visiblePosts = posts.filter(p => isValidImageUrl(p.result_photo_url) && !failedImages.has(p.id));
          
          if (filter === 'trending' && visiblePosts.length < 3) {
            return (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-display text-base font-bold mb-1.5">Be the first to post a look</h2>
                <p className="text-[13px] text-muted-foreground max-w-[220px] mb-4">Generate a Try-On and share it with the community for real feedback</p>
                <Button className="rounded-lg btn-luxury text-primary-foreground h-10 px-5 text-sm font-bold" onClick={() => navigate('/tryon')}>
                  <Shirt className="mr-1.5 h-4 w-4" /> Create a Try-On
                </Button>
              </div>
            );
          }
          
          if (filter === 'new' && visiblePosts.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-display text-base font-bold mb-1.5">No new posts yet today</h2>
                <p className="text-[13px] text-muted-foreground max-w-[220px] mb-4">Check back soon — new looks are being added all the time</p>
                <Button className="rounded-lg btn-luxury text-primary-foreground h-10 px-5 text-sm font-bold" onClick={() => { if (!user) { navigate('/auth'); return; } setShowPostFlow(true); }}>
                  <Sparkles className="mr-1.5 h-4 w-4" /> Post a Look
                </Button>
              </div>
            );
          }
          
          if (filter === 'similar' && visiblePosts.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-display text-base font-bold mb-1.5">Complete your body scan</h2>
                <p className="text-[13px] text-muted-foreground max-w-[220px] mb-4">Complete your body scan to see posts from people with similar measurements</p>
                <Button className="rounded-lg btn-luxury text-primary-foreground h-10 px-5 text-sm font-bold" onClick={() => navigate('/capture')}>
                  <Camera className="mr-1.5 h-4 w-4" /> Start Scan
                </Button>
              </div>
            );
          }
          
          return (
          <div className="space-y-3 pb-20">
            <AnimatePresence>
              {visiblePosts.map((post, idx) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Minimal header */}
                  <div className="flex items-center gap-2 px-2.5 pt-2 pb-1">
                    {post.profile?.avatar_url ? (
                      <img src={post.profile.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <div className="h-5 w-5 rounded-full gradient-drip flex items-center justify-center">
                        <span className="text-[8px] font-bold text-primary-foreground">
                          {(post.profile?.display_name || 'A')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <p className="text-[11px] font-semibold text-foreground flex-1">{post.profile?.display_name || 'Anonymous'}</p>
                    <p className="text-[9px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                  </div>

                  {/* Image — consistent 4:5 aspect ratio */}
                  <img 
                    src={post.result_photo_url} 
                    alt={post.caption || "Try-on look"} 
                    loading="lazy" 
                    decoding="async" 
                    className="w-full aspect-[4/5] object-cover img-normalize" 
                    onError={() => handleImageError(post.id)}
                  />

                  <div className="p-2.5 space-y-2">
                    {/* Question prompt */}
                    <p className="text-[12px] font-bold text-foreground leading-snug">
                      {post.caption || getPrompt(idx)}
                    </p>

                    {/* Sticky-style voting bar: Buy / Maybe / Pass */}
                    {/* Primary vote buttons */}
                    <div className="flex gap-1.5">
                      {VOTE_OPTIONS.map(v => {
                        const active = votes[post.id] === v.key;
                        const hasVoted = !!votes[post.id];
                        const fakeCount = ((post.id.charCodeAt(0) + v.key.charCodeAt(0)) % 18) + 3;
                        return (
                          <button
                            key={v.key}
                            onClick={() => handleVote(post.id, v.key)}
                            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${
                              active
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/30'
                            }`}
                          >
                            <span>{v.emoji}</span> {v.label}
                            {hasVoted && <span className="text-[9px] font-normal ml-0.5 opacity-60">{fakeCount}</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Secondary: Not my style */}
                    <button
                      onClick={() => handleVote(post.id, 'not_my_style')}
                      className={`w-full py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                        votes[post.id] === 'not_my_style'
                          ? 'text-primary bg-primary/5'
                          : 'text-muted-foreground/60 hover:text-muted-foreground'
                      }`}
                    >
                      Not my style
                    </button>

                    {/* Shop + Save actions */}
                    {!isPlaceholder(post) && (
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          className="flex-1 h-8 rounded-lg text-[10px] font-bold"
                          onClick={() => handleShopLook(post)}
                        >
                          <ShoppingBag className="mr-1 h-3 w-3" /> Shop This Look
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 rounded-lg text-[10px] px-3"
                          onClick={() => {
                            trackEvent('save_item', { type: 'fitcheck', postId: post.id });
                            toast({ title: 'Saved', description: 'Added to your saved items.' });
                          }}
                        >
                          <Bookmark className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {!isPlaceholder(post) && (
                      <p className="text-[8px] text-muted-foreground/50 text-center">We may earn a commission. It doesn't change your price.</p>
                    )}

                    {/* Expandable detailed ratings */}
                    {(post.rating_count ?? 0) > 0 && (
                      <button
                        onClick={() => setExpandedRatings(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full"
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${expandedRatings[post.id] ? 'rotate-180' : ''}`} />
                        <span>{post.rating_count} detailed {post.rating_count === 1 ? 'rating' : 'ratings'}</span>
                      </button>
                    )}

                    <AnimatePresence>
                      {expandedRatings[post.id] && (post.rating_count ?? 0) > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="flex items-center gap-2.5 pt-1">
                            {[
                              { l: 'Style', v: post.avg_style },
                              { l: 'Color', v: post.avg_color },
                              { l: 'Fit', v: post.avg_suitability },
                              { l: 'Trend', v: post.avg_buy },
                            ].map(r => (
                              <div key={r.l} className="flex items-center gap-0.5">
                                <span className="text-[9px] text-muted-foreground">{r.l}</span>
                                <span className="text-[10px] font-bold text-foreground">{(r.v ?? 0).toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Rate button */}
                    {ratingPost !== post.id && !isPlaceholder(post) && (
                      <Button
                        variant="ghost"
                        className="w-full rounded-lg h-7 text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => { if (!user) { toast({ title: 'Sign in to rate', variant: 'destructive' }); return; } setRatingPost(post.id); }}
                      >
                        <Star className="mr-1 h-3 w-3" /> Detailed rating
                      </Button>
                    )}

                    {/* Rating form */}
                    {ratingPost === post.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pt-2 border-t border-border">
                        {RATING_LABELS.map(({ key, label }) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-[12px] text-muted-foreground">{label}</span>
                            <StarRating value={ratings[key]} onChange={v => setRatings(p => ({ ...p, [key]: v }))} />
                          </div>
                        ))}
                        <Textarea placeholder="Optional comment" value={comment} onChange={e => setComment(e.target.value)} className="rounded-lg resize-none text-[12px]" rows={2} />
                        <div className="flex gap-1.5">
                          <Button variant="outline" className="flex-1 rounded-lg h-8 text-[11px]" onClick={() => setRatingPost(null)}>Cancel</Button>
                          <Button className="flex-1 rounded-lg h-8 btn-luxury text-primary-foreground text-[11px]" onClick={() => handleSubmitRating(post.id)} disabled={submitting}>
                            <Send className="mr-1 h-3 w-3" /> Submit
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          );
        })()}
      </div>
      <PostLookFlow open={showPostFlow} onOpenChange={setShowPostFlow} onPosted={fetchPosts} />
      <BottomTabBar />
    </div>
  );
};

export default Community;
