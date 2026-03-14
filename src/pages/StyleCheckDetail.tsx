import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, ShoppingCart } from 'lucide-react';
import { PostDetailSheet } from '@/components/community/PostDetailSheet';
import { navigateToTryOn } from '@/lib/tryonNavigate';
import { useCart } from '@/hooks/useCart';
import BottomTabBar from '@/components/BottomTabBar';

const StyleCheckDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  usePageTitle('Style Check');
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart, removeFromCart, isInCart } = useCart();

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
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', data.user_id)
          .maybeSingle();
        setPost({ ...data, profile: profile || { display_name: 'Anonymous' } });
      }
      setLoading(false);
    })();
  }, [postId]);

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
          <Button variant="ghost" size="icon" onClick={() => navigate('/style-check')} className="h-8 w-8 rounded-lg" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold text-foreground">Style Check</h1>
        </div>

        {/* Full post display */}
        <div className="rounded-xl overflow-hidden border border-border bg-card mb-3">
          <img src={post.result_photo_url} alt={post.caption || 'Style Check'} className="w-full aspect-[3/4] object-cover bg-black" />
          <div className="p-3">
            <p className="text-[11px] font-bold text-foreground">
              {post.profile?.display_name || 'Anonymous'}
            </p>
            {post.caption && <p className="text-[12px] text-muted-foreground mt-1">{post.caption}</p>}
            <p className="text-[11px] text-muted-foreground mt-1">
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
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
                className={`rounded-lg text-[11px] h-8 px-4 font-bold ${isInCart(post.id) ? 'btn-gold-3d border-transparent' : ''}`}
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
                {isInCart(post.id) ? 'In Cart ✓' : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default StyleCheckDetail;
