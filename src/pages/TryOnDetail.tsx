import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shirt } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import BottomTabBar from '@/components/BottomTabBar';

const TryOnDetail = () => {
  const { lookId } = useParams<{ lookId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  usePageTitle('Try-On');
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-base font-bold text-foreground">Try-On Detail</h1>
        </div>

        <div className="rounded-xl overflow-hidden border border-border bg-card mb-3">
          <img src={post.result_photo_url} alt={post.caption || 'Try-On'} className="w-full aspect-[3/4] object-cover" />
          <div className="p-3 space-y-2">
            {post.caption && <p className="text-[12px] text-foreground">{post.caption}</p>}
            <p className="text-[9px] text-muted-foreground">
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
          </div>
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default TryOnDetail;
