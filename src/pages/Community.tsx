import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Send, MessageCircle, Shirt, Sparkles, Eye, Heart, TrendingUp, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
  { key: 'buy_score', label: 'Buy It?' },
  { key: 'suitability_score', label: 'Suitability' },
] as const;

const StarRating = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} onClick={() => onChange(n)} className="p-0.5">
        <Star className={`h-5 w-5 ${n <= value ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
      </button>
    ))}
  </div>
);

const Community = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingPost, setRatingPost] = useState<string | null>(null);
  const [ratings, setRatings] = useState({ style_score: 0, color_score: 0, buy_score: 0, suitability_score: 0 });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
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

    // Fetch profiles and ratings for posts
    const userIds = [...new Set((data || []).map(p => p.user_id))];
    const postIds = (data || []).map(p => p.id);

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

    const enriched = (data || []).map(p => {
      const postRatings = ratingsByPost.get(p.id) || [];
      const count = postRatings.length;
      return {
        ...p,
        profile: profileMap.get(p.user_id) || { display_name: 'Anonymous' },
        avg_style: count ? postRatings.reduce((s, r) => s + r.style_score, 0) / count : 0,
        avg_color: count ? postRatings.reduce((s, r) => s + r.color_score, 0) / count : 0,
        avg_buy: count ? postRatings.reduce((s, r) => s + r.buy_score, 0) / count : 0,
        avg_suitability: count ? postRatings.reduce((s, r) => s + r.suitability_score, 0) / count : 0,
        rating_count: count,
      };
    });

    setPosts(enriched);
    setLoading(false);
  };

  const handleSubmitRating = async (postId: string) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to rate looks.', variant: 'destructive' });
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
      toast({ title: 'Thanks!', description: 'Your rating was submitted.' });
      setRatingPost(null);
      setRatings({ style_score: 0, color_score: 0, buy_score: 0, suitability_score: 0 });
      setComment('');
      fetchPosts();
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background px-6 py-6 pb-24">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Community Looks</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-pulse text-muted-foreground">Loading…</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-2xl gradient-drip flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="font-display text-lg font-bold mb-2">Be the First to Drip</h2>
            <p className="text-sm font-medium text-foreground/70 max-w-[250px] mb-6">
              Share your virtual try-ons and get real ratings from the community on your style, color, and fit.
            </p>
            <div className="glass rounded-2xl p-4 border border-border/30 w-full mb-6">
              <h3 className="font-display text-sm font-bold mb-3 text-center">Rate looks on</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Eye className="h-4 w-4 text-primary" />
                     <span className="text-xs font-semibold text-foreground/70">Style</span>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                   <Heart className="h-4 w-4 text-primary" />
                   <span className="text-xs font-semibold text-foreground/70">Color</span>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                   <TrendingUp className="h-4 w-4 text-primary" />
                   <span className="text-xs font-semibold text-foreground/70">Fit</span>
                 </div>
                 <div className="flex flex-col items-center gap-1">
                   <Zap className="h-4 w-4 text-primary" />
                   <span className="text-xs font-semibold text-foreground/70">Buy It?</span>
                </div>
              </div>
            </div>
            <Button className="rounded-2xl btn-3d-drip border-0 h-12 px-8 font-display font-bold uppercase tracking-wider" onClick={() => navigate('/tryon')}>
              <Shirt className="mr-2 h-4 w-4" /> Try On Something
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {posts.map(post => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="rounded-2xl overflow-hidden">
                    <img src={post.result_photo_url} alt="Try-on look" className="w-full aspect-[3/4] object-cover" />
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">{post.profile?.display_name || 'Anonymous'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                      </div>
                      {post.caption && <p className="text-sm font-medium text-foreground/80 mb-3">{post.caption}</p>}

                      {/* Average ratings */}
                      {(post.rating_count ?? 0) > 0 && (
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {[
                            { label: 'Style', val: post.avg_style },
                            { label: 'Color', val: post.avg_color },
                            { label: 'Buy', val: post.avg_buy },
                            { label: 'Fit', val: post.avg_suitability },
                          ].map(r => (
                            <div key={r.label} className="text-center">
                              <p className="text-[10px] text-muted-foreground">{r.label}</p>
                              <p className="text-sm font-bold text-foreground">{(r.val ?? 0).toFixed(1)}</p>
                              <div className="flex justify-center">
                                <Star className="h-3 w-3 fill-primary text-primary" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mb-2">{post.rating_count} rating{post.rating_count !== 1 ? 's' : ''}</p>

                      {/* Rate button / form */}
                      {ratingPost === post.id ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 mt-3 pt-3 border-t border-border">
                          {RATING_LABELS.map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">{label}</span>
                              <StarRating value={ratings[key]} onChange={v => setRatings(p => ({ ...p, [key]: v }))} />
                            </div>
                          ))}
                          <Textarea placeholder="Add a comment (optional)" value={comment} onChange={e => setComment(e.target.value)} className="rounded-xl resize-none" rows={2} />
                          <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setRatingPost(null)}>Cancel</Button>
                            <Button className="flex-1 rounded-xl" onClick={() => handleSubmitRating(post.id)} disabled={submitting}>
                              <Send className="mr-2 h-4 w-4" /> Submit
                            </Button>
                          </div>
                        </motion.div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full rounded-xl mt-1"
                          onClick={() => {
                            if (!user) {
                              toast({ title: 'Sign in to rate', description: 'Create an account to rate looks.', variant: 'destructive' });
                              return;
                            }
                            setRatingPost(post.id);
                          }}
                        >
                          <Star className="mr-2 h-4 w-4" /> Rate This Look
                        </Button>
                      )}
                    </CardContent>
                  </Card>
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
