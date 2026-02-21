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
        <Star className={`h-4 w-4 ${n <= value ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
      </button>
    ))}
  </div>
);

const PLACEHOLDER_POSTS: Omit<Post, 'user_id' | 'clothing_photo_url'>[] = [
  { id: 'placeholder-1', result_photo_url: '', caption: 'Casual weekend look', created_at: new Date().toISOString(), profile: { display_name: 'Style Preview' }, avg_style: 4.2, avg_color: 3.8, avg_buy: 4.0, avg_suitability: 4.5, rating_count: 12 },
  { id: 'placeholder-2', result_photo_url: '', caption: 'Office ready fit', created_at: new Date(Date.now() - 86400000).toISOString(), profile: { display_name: 'Fit Check' }, avg_style: 3.9, avg_color: 4.1, avg_buy: 3.5, avg_suitability: 4.2, rating_count: 8 },
];

const PlaceholderImage = ({ caption }: { caption: string }) => (
  <div className="w-full aspect-[4/5] bg-card flex flex-col items-center justify-center gap-2">
    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
      <Shirt className="h-6 w-6 text-primary/50" />
    </div>
    <p className="text-[13px] font-medium text-foreground/50">{caption}</p>
    <p className="text-[10px] text-muted-foreground">Community preview</p>
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
    if (error) { toast({ title: 'Error', description: error.message.includes('unique') ? 'Already rated.' : error.message, variant: 'destructive' }); }
    else { trackEvent('community_rated'); toast({ title: 'Thanks!' }); setRatingPost(null); setRatings({ style_score: 0, color_score: 0, buy_score: 0, suitability_score: 0 }); setComment(''); fetchPosts(); }
    setSubmitting(false);
  };

  const isPlaceholder = (post: Post) => post.id.startsWith('placeholder-');

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-sm mx-auto px-4 pt-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold text-foreground">Community</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-4">
          {(['trending', 'new', 'similar'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-95 ${
                filter === f ? 'gradient-drip text-primary-foreground' : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              {f === 'trending' ? 'Trending' : f === 'new' ? 'New' : 'Similar Fit'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-muted-foreground text-[13px]">Loading…</motion.div>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-display text-base font-bold mb-1.5">Be the First</h2>
            <p className="text-[13px] text-muted-foreground max-w-[200px] mb-4">Share your virtual try-on and get real ratings.</p>
            <Button className="rounded-lg btn-luxury text-primary-foreground h-10 px-5 text-sm font-bold" onClick={() => navigate('/tryon')}>
              <Shirt className="mr-1.5 h-4 w-4" /> Try On Now
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {posts.map(post => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl overflow-hidden">
                  {isPlaceholder(post) || !post.result_photo_url ? (
                    <PlaceholderImage caption={post.caption || 'Try-on look'} />
                  ) : (
                    <img src={post.result_photo_url} alt="Try-on" className="w-full aspect-[4/5] object-cover" />
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[13px] font-semibold text-foreground">{post.profile?.display_name || 'Anonymous'}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>

                    {ratingPost !== post.id && !isPlaceholder(post) && (
                      <Button variant="outline" className="w-full rounded-lg h-9 mb-2 text-[12px] active:scale-[0.97] transition-transform" onClick={() => { if (!user) { toast({ title: 'Sign in to rate', variant: 'destructive' }); return; } setRatingPost(post.id); }}>
                        <Star className="mr-1.5 h-3.5 w-3.5" /> Rate This Look
                      </Button>
                    )}

                    {(post.rating_count ?? 0) > 0 && (
                      <div className="flex items-center justify-between bg-background/50 rounded-lg px-2.5 py-1.5">
                        {[{ l: 'Style', v: post.avg_style }, { l: 'Color', v: post.avg_color }, { l: 'Buy', v: post.avg_buy }, { l: 'Fit', v: post.avg_suitability }].map(r => (
                          <div key={r.l} className="text-center">
                            <p className="text-[9px] text-muted-foreground">{r.l}</p>
                            <p className="text-[13px] font-bold text-foreground">{(r.v ?? 0).toFixed(1)}</p>
                          </div>
                        ))}
                        <div className="text-center">
                          <p className="text-[9px] text-muted-foreground">Votes</p>
                          <p className="text-[13px] font-bold text-muted-foreground">{post.rating_count}</p>
                        </div>
                      </div>
                    )}

                    {ratingPost === post.id && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-2 border-t border-border mt-2">
                        {RATING_LABELS.map(({ key, label }) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-[13px] text-muted-foreground">{label}</span>
                            <StarRating value={ratings[key]} onChange={v => setRatings(p => ({ ...p, [key]: v }))} />
                          </div>
                        ))}
                        <Textarea placeholder="Comment (optional)" value={comment} onChange={e => setComment(e.target.value)} className="rounded-lg resize-none text-[13px]" rows={2} />
                        <div className="flex gap-1.5">
                          <Button variant="outline" className="flex-1 rounded-lg h-9 text-[12px]" onClick={() => setRatingPost(null)}>Cancel</Button>
                          <Button className="flex-1 rounded-lg h-9 btn-luxury text-primary-foreground text-[12px]" onClick={() => handleSubmitRating(post.id)} disabled={submitting}>
                            <Send className="mr-1.5 h-3 w-3" /> Submit
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
