import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Send, Shirt, Sparkles, Heart, ShoppingBag, X, ThumbsUp, TrendingUp, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import BottomTabBar from '@/components/BottomTabBar';

interface Post {
  id: string;
  user_id: string;
  result_photo_url: string;
  clothing_photo_url: string;
  caption: string | null;
  created_at: string;
  profile?: { display_name: string | null };
  avg_style?: number;
  avg_color?: number;
  avg_buy?: number;
  avg_suitability?: number;
  rating_count?: number;
}

const REACTIONS = [
  { key: 'love', label: 'Love it', icon: Heart },
  { key: 'buy', label: 'Buy it', icon: ShoppingBag },
  { key: 'keep', label: 'Keep shopping', icon: ThumbsUp },
  { key: 'nope', label: 'Not my style', icon: X },
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

const PLACEHOLDER_POSTS: Omit<Post, 'user_id' | 'clothing_photo_url'>[] = [
  { id: 'placeholder-1', result_photo_url: '', caption: 'Should I buy this for work?', created_at: new Date().toISOString(), profile: { display_name: 'Style Preview' }, avg_style: 4.2, avg_color: 3.8, avg_buy: 4.0, avg_suitability: 4.5, rating_count: 12 },
  { id: 'placeholder-2', result_photo_url: '', caption: 'Date night — yes or no?', created_at: new Date(Date.now() - 86400000).toISOString(), profile: { display_name: 'Fit Check' }, avg_style: 3.9, avg_color: 4.1, avg_buy: 3.5, avg_suitability: 4.2, rating_count: 8 },
];

const PlaceholderImage = ({ caption }: { caption: string }) => (
  <div className="w-full aspect-[4/5] bg-gradient-to-b from-card to-background flex flex-col items-center justify-center gap-1.5">
    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
      <Shirt className="h-6 w-6 text-primary/40" />
    </div>
    <p className="text-[11px] font-medium text-muted-foreground">{caption}</p>
  </div>
);

const Community = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('new');
  const [ratingPost, setRatingPost] = useState<string | null>(null);
  const [ratings, setRatings] = useState({ style_score: 0, color_score: 0, buy_score: 0, suitability_score: 0 });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string>>({});

  useEffect(() => { fetchPosts(); }, [filter]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tryon_posts').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(50);
    if (error) { console.error(error); setLoading(false); return; }
    if (!data || data.length === 0) { setPosts(PLACEHOLDER_POSTS as Post[]); setLoading(false); return; }

    const userIds = [...new Set(data.map(p => p.user_id))];
    const postIds = data.map(p => p.id);
    const [profilesRes, ratingsRes] = await Promise.all([
      userIds.length > 0 ? supabase.from('profiles').select('user_id, display_name').in('user_id', userIds) : { data: [] },
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

  const handleReaction = (postId: string, key: string) => {
    setReactions(prev => ({ ...prev, [postId]: prev[postId] === key ? '' : key }));
    trackEvent('fitcheck_reaction', { reaction: key });
    if (!user) { toast({ title: 'Sign in to react', description: 'Create a free account to share your opinion.', variant: 'destructive' }); return; }
  };

  const isPlaceholder = (post: Post) => post.id.startsWith('placeholder-');

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
            onClick={() => { trackEvent('fitcheck_post_started'); navigate('/tryon'); }}
          >
            <Sparkles className="mr-1 h-3 w-3" /> Post a Look
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-4">
          {([
            { key: 'trending' as FilterType, label: '🔥 Trending', icon: TrendingUp },
            { key: 'new' as FilterType, label: 'New', icon: Sparkles },
            { key: 'similar' as FilterType, label: 'Similar Fit', icon: Users },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95 ${
                filter === f.key ? 'gradient-drip text-primary-foreground' : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
                <div className="w-full aspect-[4/5] bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-display text-base font-bold mb-1.5">Be the first to post</h2>
            <p className="text-[13px] text-muted-foreground max-w-[220px] mb-4">Create a Try-On and get honest feedback from the community.</p>
            <Button className="rounded-lg btn-luxury text-primary-foreground h-10 px-5 text-sm font-bold" onClick={() => navigate('/tryon')}>
              <Shirt className="mr-1.5 h-4 w-4" /> Create a Try-On
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {posts.map((post, idx) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Image */}
                  {isPlaceholder(post) || !post.result_photo_url ? (
                    <PlaceholderImage caption={post.caption || 'Try-on look'} />
                  ) : (
                    <img src={post.result_photo_url} alt="Try-on" className="w-full aspect-[4/5] object-cover" />
                  )}

                  <div className="p-2.5 space-y-2">
                    {/* Author + date */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full gradient-drip flex items-center justify-center">
                          <span className="text-[9px] font-bold text-primary-foreground">
                            {(post.profile?.display_name || 'A')[0].toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[12px] font-semibold text-foreground">{post.profile?.display_name || 'Anonymous'}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>

                    {/* Question prompt */}
                    <p className="text-[13px] font-bold text-foreground leading-snug">
                      {post.caption || getPrompt(idx)}
                    </p>

                    {/* Quick reactions */}
                    <div className="flex gap-1.5 flex-wrap">
                      {REACTIONS.map(r => {
                        const active = reactions[post.id] === r.key;
                        return (
                          <button
                            key={r.key}
                            onClick={() => handleReaction(post.id, r.key)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all active:scale-95 ${
                              active
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/30'
                            }`}
                          >
                            <r.icon className="h-3 w-3" />
                            {r.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Score metrics */}
                    {(post.rating_count ?? 0) > 0 && (
                      <div className="flex items-center gap-2.5 pt-0.5">
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
                        <span className="text-[9px] text-muted-foreground ml-auto">{post.rating_count} {post.rating_count === 1 ? 'vote' : 'votes'}</span>
                      </div>
                    )}

                    {/* Rate button */}
                    {ratingPost !== post.id && !isPlaceholder(post) && (
                      <Button
                        variant="ghost"
                        className="w-full rounded-lg h-8 text-[11px] text-muted-foreground hover:text-foreground active:scale-[0.97] transition-transform"
                        onClick={() => { if (!user) { toast({ title: 'Sign in to rate', description: 'Create a free account to share your opinion.', variant: 'destructive' }); return; } setRatingPost(post.id); }}
                      >
                        <Star className="mr-1 h-3 w-3" /> Rate this look
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
                            <Send className="mr-1 h-3 w-3" /> Submit Rating
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
};

export default Community;
