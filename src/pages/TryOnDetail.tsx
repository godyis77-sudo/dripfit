import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shirt, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import BottomTabBar from '@/components/BottomTabBar';

const TryOnDetail = () => {
  const { lookId } = useParams<{ lookId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  usePageTitle('Try-On');
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addingToWardrobe, setAddingToWardrobe] = useState(false);
  const [addedToWardrobe, setAddedToWardrobe] = useState(false);

  const handleAddToWardrobe = async () => {
    if (!user || !post) return;
    setAddingToWardrobe(true);
    const { error } = await supabase.from('clothing_wardrobe').insert({
      user_id: user.id,
      image_url: post.clothing_photo_url || post.result_photo_url,
      category: 'top',
      product_link: (post.product_urls && post.product_urls.length > 0) ? post.product_urls[0] : null,
    });
    setAddingToWardrobe(false);
    if (error) {
      if (error.code === '23505') {
        setAddedToWardrobe(true);
        toast({ title: 'Already saved', description: 'This item is already in your wardrobe.' });
      } else {
        toast({ title: 'Error', description: 'Could not add to wardrobe.', variant: 'destructive' });
      }
      return;
    }
    setAddedToWardrobe(true);
    trackEvent('wardrobe_added_from_tryon', { post_id: post.id });
    toast({ title: '👕 Added to Wardrobe!', description: 'You can find it in your Wardrobe tab.' });
  };

  useEffect(() => {
    if (!lookId) return;
    (async () => {
      const query = supabase
        .from('tryon_posts')
        .select('*')
        .eq('id', lookId);
      
      const { data } = await query.maybeSingle();
      if (data) {
        // Only show if public or owned by current user
        if (data.is_public || (user && data.user_id === user.id)) {
          setPost(data);
        }
      }
      setLoading(false);
    })();
  }, [lookId, user]);

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
          <Shirt className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-base font-bold text-foreground mb-1">Try-On not found</p>
          <p className="text-[12px] text-muted-foreground mb-4">This look may have been removed or is private.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => navigate('/tryon')}>
            Back to Try-On
          </Button>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold text-foreground">Try-On Detail</h1>
        </div>

        <div className="rounded-xl overflow-hidden border border-border bg-card mb-3">
          <img src={post.result_photo_url} alt={post.caption || 'Try-On'} className="w-full aspect-[3/4] object-contain bg-black" />
          <div className="p-3 space-y-2">
            {post.caption && <p className="text-[12px] text-foreground">{post.caption}</p>}
            <p className="text-[11px] text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            {post.product_urls?.[0] && (
              <Button
                variant="outline"
                className="w-full h-9 rounded-lg text-[11px] font-bold"
                onClick={() => window.open(post.product_urls[0], '_blank', 'noopener')}
              >
                Shop This Item
              </Button>
            )}
            <Button
              variant={addedToWardrobe ? 'default' : 'outline'}
              className={`w-full h-9 rounded-lg text-[11px] font-bold gap-1.5 ${addedToWardrobe ? 'bg-primary/20 text-primary border-primary/30' : ''}`}
              onClick={handleAddToWardrobe}
              disabled={addingToWardrobe || addedToWardrobe}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              {addingToWardrobe ? 'Adding…' : addedToWardrobe ? 'Added ✓' : 'Add to Wardrobe'}
            </Button>
          </div>
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default TryOnDetail;
