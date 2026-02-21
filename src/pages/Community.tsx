import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Send, Shirt, Sparkles } from 'lucide-react';
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

const RATING_LABELS = [
  { key: 'style_score', label: 'Style' },
  { key: 'color_score', label: 'Color' },
  { key: 'buy_score', label: 'Buy' },
  { key: 'suitability_score', label: 'Fit' },
] as const;

type FilterType = 'trending' | 'new' | 'similar';

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} onClick={() => onChange(n)} className="p-0.5 active:scale-110 transition-transform">
        <Star className={`h-5 w-5 ${n <= value ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
      </button>
    ))}
  </div>
);

// Placeholder post cards when no real posts exist
const PLACEHOLDER_POSTS: Omit<Post, 'user_id' | 'clothing_photo_url'>[] = [
  {
    id: 'placeholder-1',
    result_photo_url: '',
    caption: 'Casual weekend look',
    created_at: new Date().toISOString(),
    profile: { display_name: 'Style Preview' },
    avg_style: 4.2, avg_color: 3.8, avg_buy: 4.0, avg_suitability: 4.5,
    rating_count: 12,
  },
  {
    id: 'placeholder-2',
    result_photo_url: '',
    caption: 'Office ready fit check',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    profile: { display_name: 'Fit Check' },
    avg_style: 3.9, avg_color: 4.1, avg_buy: 3.5, avg_suitability: 4.2,
    rating_count: 8,
  },
];

const PlaceholderImage = ({ caption }: { caption: string }) => (
  <div className="w-full aspect-[4/5] bg-card flex flex-col items-center justify-center gap-3">
    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
      <Shirt className="h-8 w-8 text-primary/60" />
    </div>
    <div className="text-center px-6">
      <p className="text-sm font-medium text-foreground/60">{caption}</p>
      <p className="text-[11px] text-muted-foreground mt-1">Community try-on preview</p>
    </div>
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

  useEffect(() => {
    fetchPosts();
  }, [filter]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tryon_posts')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setPosts(PLACEHOLDER_POSTS as Post[]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.map(p => p.user_id))];
    const postIds = data.map(p => p.id);

    const [profilesRes, ratingsRes] = await Promise.all([
      userIds.length > 0 ? supabase.from('profiles').select('user_id, display_name').in('user_id', userIds) : { data: [] },
      postIds.length > 0 ? supabase.from('tryon_ratings').select('post_id, style_score, color_score, buy_score, suitability_score').in('post_id', postIds) : { data: [] },
    ]);

    const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
    const ratingsByPost = new Map<string, any[]>();
    (ratingsRes.data || []).forEach(r => {
      if (!ratingsByPost.has(r.post_id)) ratingsByPost.set(r.post_id, []);
      ratingsByPost.get(r.post_id)!.push(r);
    });

    let enriched = data.map(p => {
      const postRatings = ratingsByPost.get(p.id) || [];
      const count = postRatings.length;
      return {
        ...p,
        profile: profileMap.get(p.user_id) || { display_name: 'Anonymous' },
        avg_style: count ? postRatings.reduce((s: number, r: any) => s + r.style_score, 0) / count : 0,
        avg_color: count ? postRatings.reduce((s: number, r: any) => s + r.color_score, 0) / count : 0,
        avg_buy: count ? postRatings.reduce((s: number, r: any) => s + r.buy_score, 0) / count : 0,
        avg_suitability: count ? postRatings.reduce((s: number, r: any) => s + r.suitability_score, 0) / count : 0,
        rating_count: count,
      };
    });

    if (filter === 'trending') {
      enriched.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
    }

    setPosts(enriched);
    setLoading(false);
  };

  const handleSubmitRating = async (postId: string) => {
    if (!user) {
      toast({ title: 'Sign in to rate', description: 'Create an account to rate looks.', variant: 'destructive' });
      return;
    }
    if (Object.values(ratings).some(v => v === 0)) {
      toast({ title: 'Rate all categories', description: 'Please rate all 4 categories.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('tryon_ratings').insert({
      post_id: postId,
      rater_user_id: user.id,
      ...ratings,
      comment: comment || null,
    });

    if (error) {
      toast({ title: 'Error', description: error.message.includes('unique') ? 'You already rated this look.' : error.message, variant: 'destructive' });
    } else {
      trackEvent('community_rated');
      toast({ title: 'Thanks!', description: 'Your rating was submitted.' });
      setRatingPost(null);
      setRatings({ style_score: 0, color_score: 0, buy_score: 0, suitability_score: 0 });
      setComment('');
      fetchPosts();
    }
    setSubmitting(false);
  };

  const isPlaceholder = (post: Post) => post.id.startsWith('placeholder-');

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-sm mx-auto px-5 pt-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-10 w-10 rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Community</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['trending', 'new', 'similar'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                filter === f
                  ? 'gradient-drip text-primary-foreground'
                  : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              {f === 'trending' ? 'Trending' : f === 'new' ? 'New' : 'Similar Fit'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-pulse text-muted-foreground text-sm">Loading…</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-display text-lg font-bold mb-2">Be the First</h2>
            <p className="text-sm text-muted-foreground max-w-[220px] mb-6">
              Share your virtual try-on and get real ratings.
            </p>
            <Button className="rounded-xl btn-luxury text-primary-foreground h-11 px-6 font-bold" onClick={() => navigate('/tryon')}>
              <Shirt className="mr-2 h-4 w-4" /> Try On Now
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence>
              {posts.map(post => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden"
                >
                  {/* Image */}
                  {isPlaceholder(post) || !post.result_photo_url ? (
                    <PlaceholderImage caption={post.caption || 'Try-on look'} />
                  ) : (
                    <img src={post.result_photo_url} alt="Try-on look" className="w-full aspect-[4/5] object-cover" />
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-foreground">{post.profile?.display_name || 'Anonymous'}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>

                    {/* Rate CTA */}
                    {ratingPost !== post.id && !isPlaceholder(post) && (
                      <Button
                        variant="outline"
                        className="w-full rounded-xl h-10 mb-3 text-sm active:scale-95 transition-transform"
                        onClick={() => {
                          if (!user) {
                            toast({ title: 'Sign in to rate', variant: 'destructive' });
                            return;
                          }
                          setRatingPost(post.id);
                        }}
                      >
                        <Star className="mr-2 h-4 w-4" /> Rate This Look
                      </Button>
                    )}

                    {/* Ratings summary */}
                    {(post.rating_count ?? 0) > 0 && (
                      <div className="flex items-center justify-between bg-background/50 rounded-xl px-3 py-2">
                        {[
                          { label: 'Style', val: post.avg_style },
                          { label: 'Color', val: post.avg_color },
                          { label: 'Buy', val: post.avg_buy },
                          { label: 'Fit', val: post.avg_suitability },
                        ].map(r => (
                          <div key={r.label} className="text-center">
                            <p className="text-[10px] text-muted-foreground">{r.label}</p>
                            <p className="text-sm font-bold text-foreground">{(r.val ?? 0).toFixed(1)}</p>
                          </div>
                        ))}
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Ratings</p>
                          <p className="text-sm font-bold text-muted-foreground">{post.rating_count}</p>
                        </div>
                      </div>
                    )}

                    {/* Rating form */}
                    {ratingPost === post.id && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pt-3 border-t border-border mt-3">
                        {RATING_LABELS.map(({ key, label }) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{label}</span>
                            <StarRating value={ratings[key]} onChange={v => setRatings(p => ({ ...p, [key]: v }))} />
                          </div>
                        ))}
                        <Textarea placeholder="Add a comment (optional)" value={comment} onChange={e => setComment(e.target.value)} className="rounded-xl resize-none text-sm" rows={2} />
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 rounded-xl h-10" onClick={() => setRatingPost(null)}>Cancel</Button>
                          <Button className="flex-1 rounded-xl h-10 btn-luxury text-primary-foreground" onClick={() => handleSubmitRating(post.id)} disabled={submitting}>
                            <Send className="mr-2 h-3.5 w-3.5" /> Submit
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
