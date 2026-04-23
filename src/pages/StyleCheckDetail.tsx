import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, ShoppingCart, Link2, Check, Share2, Flame, ShoppingBag } from 'lucide-react';
import { navigateToTryOn } from '@/lib/tryonNavigate';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import BottomTabBar from '@/components/BottomTabBar';
import NextStepBar from '@/components/flow/NextStepBar';

const StyleCheckDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [votes, setVotes] = useState<{ key: string; count: number }[]>([]);
  const { addToCart, removeFromCart, isInCart } = useCart();

  // Dynamic OG meta — set once post loads
  const ogImageUrl = post?.result_photo_url || '';
  const ogTitle = post ? `${post.profile?.display_name || 'DripFit User'} — Style Check` : 'Style Check';
  const ogDesc = post?.caption || 'Check out this virtual try-on on DripFitCheck!';

  usePageMeta({
    title: ogTitle,
    description: ogDesc,
    ogImage: ogImageUrl,
  });

  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data } = await supabase
        .from('tryon_posts')
        .select('*')
        .eq('id', postId)
        .eq('is_public', true)
        .maybeSingle();
      if (data) {
        const [{ data: profile }, { data: voteRows }] = await Promise.all([
          supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', data.user_id)
            .maybeSingle(),
          supabase
            .from('community_votes')
            .select('vote_key')
            .eq('post_id', postId),
        ]);
        setPost({ ...data, profile: profile || { display_name: 'Anonymous' } });
        // Tally vote keys
        const tally: Record<string, number> = {};
        (voteRows || []).forEach(v => { tally[v.vote_key] = (tally[v.vote_key] || 0) + 1; });
        setVotes(Object.entries(tally).map(([key, count]) => ({ key, count })));
      }
      setLoading(false);
    })();
  }, [postId]);

  // Compute community verdict — % of "buy"/"cop"-leaning votes
  const verdict = useMemo(() => {
    const total = votes.reduce((s, v) => s + v.count, 0);
    if (total === 0) return null;
    const positive = votes
      .filter(v => v.key === 'buy_yes' || v.key === 'keep_shopping' || v.key === 'cop')
      .reduce((s, v) => s + v.count, 0);
    return { pct: Math.round((positive / total) * 100), total };
  }, [votes]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/style-check/${postId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    trackEvent('share_post_link_copied', { postId });
    toast({ title: 'Link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/style-check/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: ogTitle,
          text: ogDesc,
          url,
        });
        trackEvent('style_check_share', { postId: postId! });
      } else {
        handleCopyLink();
      }
    } catch { /* cancelled */ }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
        <div className="text-center pt-20">
          <p className="text-base font-bold text-foreground mb-1">Post not found</p>
          <p className="text-[12px] text-muted-foreground mb-4">This post may have been removed or made private.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate('/style-check')}>
            Back to Style Check
          </Button>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      <div className="max-w-sm mx-auto px-4 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/style-check')} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold text-foreground flex-1 uppercase">Style Check</h1>
          <Button variant="ghost" size="icon" onClick={handleCopyLink} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]" aria-label="Copy link">
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Link2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleShare} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]" aria-label="Share">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Full post display */}
        <div className="rounded-xl overflow-hidden border border-border bg-card mb-3">
          <img src={post.result_photo_url} alt={post.caption || 'Style Check'} className="w-full aspect-[3/4] object-cover bg-black rounded-xl" />
          <div className="p-3">
            <p className="text-[11px] font-bold text-foreground">
              {post.profile?.display_name || 'Anonymous'}
            </p>
            {post.caption && <p className="text-[12px] text-muted-foreground mt-1">{post.caption}</p>}
            <p className="text-[11px] text-muted-foreground mt-1">
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>

            {/* Community Verdict — soft signal next to Buy */}
            {verdict && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5">
                <Flame className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-bold tracking-wide text-primary">
                  VERDICT: COP {verdict.pct}%
                </span>
                <span className="text-[10px] text-muted-foreground">· {verdict.total} {verdict.total === 1 ? 'vote' : 'votes'}</span>
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="rounded-lg btn-luxury text-primary-foreground text-[11px] h-8 px-4 font-bold"
                onClick={() => {
                  const urls = post.product_urls as string[] | null;
                  navigateToTryOn(navigate, {
                    productUrl: urls?.[0],
                    fallbackClothingImageUrl: post.clothing_photo_url,
                    source: 'style_check_detail_page',
                  });
                }}
              >
                <Sparkles className="mr-1 h-3 w-3" /> Try-On This Look
              </Button>
              <Button
                size="sm"
                variant="outline"
                className={`rounded-lg text-[11px] h-8 px-4 font-bold ${isInCart(post.id) ? 'btn-gold-3d border-transparent text-primary-foreground' : ''}`}
                onClick={() => {
                  if (isInCart(post.id)) {
                    removeFromCart(post.id);
                  } else {
                    addToCart({
                      post_id: post.id,
                      image_url: post.result_photo_url,
                      caption: post.caption,
                      product_urls: post.product_urls || null,
                      clothing_photo_url: post.clothing_photo_url || post.result_photo_url,
                    });
                  }
                }}
              >
                <ShoppingCart className="mr-1 h-3 w-3" />
                {isInCart(post.id) ? 'In Cart ✓' : 'Shop It'}
              </Button>
            </div>
          </div>
        </div>

        {/* Infinite Closet loop — back to discovery */}
        <NextStepBar
          step={1}
          eyebrow="KEEP THE LOOP GOING"
          title="Discover more drip"
          subtitle="Swipe new pieces into your closet"
          to="/closet"
          icon={ShoppingBag}
          trackId="post_detail_to_closet"
        />
      </div>
      <BottomTabBar />
    </div>
  );
};

export default StyleCheckDetail;
