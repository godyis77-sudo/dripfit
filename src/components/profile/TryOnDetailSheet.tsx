import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Heart, MessageSquare, ShoppingBag, ShoppingCart, X, Instagram, Trash2, Sparkles } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { generateTryOnShareCard } from '@/lib/shareImage';
import { useCart } from '@/hooks/useCart';
import { getPostedCaption } from '@/components/community/community-types';
interface TryOnPost {
  id: string;
  result_photo_url: string;
  clothing_photo_url?: string;
  caption: string | null;
  is_public: boolean;
  created_at: string;
  product_urls?: string[] | null;
}

interface TryOnDetailSheetProps {
  post: TryOnPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated?: () => void;
  onDelete?: (id: string) => void;
}

const TryOnDetailSheet = ({ post, open, onOpenChange, onPostUpdated, onDelete }: TryOnDetailSheetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { addToCart, removeFromCart, isInCart } = useCart();
  const [liked, setLiked] = useState(false);
  const [posting, setPosting] = useState(false);
  const [addingToWardrobe, setAddingToWardrobe] = useState(false);
  const [addedToWardrobe, setAddedToWardrobe] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!post) return null;

  const postedCaption = getPostedCaption(post.caption);

  const handleLike = () => {
    setLiked(prev => !prev);
    trackEvent('tryon_liked', { post_id: post.id });
    toast({ title: liked ? 'Removed from favorites' : '❤️ Added to favorites' });
  };

  const handleToggleCommunity = async () => {
    if (!user) return;
    setPosting(true);
    const newPublic = !post.is_public;
    const { error } = await supabase
      .from('tryon_posts')
      .update({ is_public: newPublic })
      .eq('id', post.id)
      .eq('user_id', user.id);
    setPosting(false);
    if (error) {
      toast({ title: 'Error', description: newPublic ? 'Could not post to community.' : 'Could not remove from community.', variant: 'destructive' });
      return;
    }
    trackEvent(newPublic ? 'tryon_posted_to_community' : 'tryon_posted_to_community', { post_id: post.id });
    toast({ title: newPublic ? '🔥 Posted!' : 'Removed', description: newPublic ? 'Your look is now live in the community feed.' : 'Removed from Style Check Feed.' });
    onPostUpdated?.();
  };

  const handleAddToWardrobe = async () => {
    if (!user) return;
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95dvh] p-0 rounded-t-2xl bg-background border-t border-border flex flex-col overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-50 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Image */}
        <div className="relative w-full flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden">
          {/* Date — top left overlay */}
          <div className="absolute top-3 left-3 z-10">
            <p className="text-[11px] text-white/80 font-medium drop-shadow-sm">{new Date(post.created_at).toLocaleDateString()}</p>
          </div>
          <img
            src={post.result_photo_url}
            alt={post.caption || 'Try-on result'}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Actions */}
        <div className="px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] space-y-3 overflow-y-auto">
          {postedCaption && (
            <p className="text-[13px] text-foreground font-medium">{postedCaption}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={liked ? 'default' : 'outline'}
              className="h-11 rounded-xl text-[12px] font-bold gap-1.5"
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
              {liked ? 'Liked' : 'Like'}
            </Button>

            <Button
              variant={addedToWardrobe ? 'default' : 'outline'}
              className={`h-11 rounded-xl text-[12px] font-bold gap-1.5 ${addedToWardrobe ? 'bg-primary/20 text-primary border-primary/30' : ''}`}
              onClick={handleAddToWardrobe}
              disabled={addingToWardrobe || addedToWardrobe}
            >
              <ShoppingBag className="h-4 w-4" />
              {addingToWardrobe ? 'Adding…' : addedToWardrobe ? 'Added ✓' : 'Add to Wardrobe'}
            </Button>

            <Button
              variant="outline"
              className={`h-11 rounded-xl text-[12px] font-bold gap-1.5 col-span-2 ${isInCart(post.id) ? 'border-primary/40 bg-primary/10' : ''}`}
              onClick={() => {
                if (isInCart(post.id)) {
                  removeFromCart(post.id);
                } else {
                  addToCart({
                    post_id: post.id,
                    image_url: post.clothing_photo_url || post.result_photo_url,
                    caption: post.caption,
                    product_urls: post.product_urls || null,
                    clothing_photo_url: post.clothing_photo_url || post.result_photo_url,
                  });
                }
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              {isInCart(post.id) ? 'In Cart ✓' : 'Add to Cart'}
            </Button>

            <Button
              className="h-11 rounded-xl text-[12px] font-bold gap-1.5 btn-luxury text-primary-foreground col-span-2"
              onClick={() => {
                onOpenChange(false);
                navigate('/tryon', {
                  state: {
                    clothingImageUrl: post.clothing_photo_url || undefined,
                    productUrl: (post.product_urls && post.product_urls.length > 0) ? post.product_urls[0] : undefined,
                  },
                });
                trackEvent('tryon_from_detail_sheet', { post_id: post.id });
              }}
            >
              <Sparkles className="h-4 w-4" />
              Try-On This Look
            </Button>

            <Button
              variant="outline"
              className="h-11 rounded-xl text-[12px] font-bold gap-1.5 col-span-2"
              onClick={async () => {
                try {
                  const blob = await generateTryOnShareCard({
                    resultImageUrl: post.result_photo_url,
                    caption: post.caption,
                  });
                  const file = new File([blob], 'drip-fit-tryon.png', { type: 'image/png' });

                  if (navigator.share && navigator.canShare?.({ files: [file] })) {
                    await navigator.share({
                      title: post.caption || 'Check my fit on DRIPFIT ✔!',
                      files: [file],
                    });
                    trackEvent('tryon_shared_instagram', { post_id: post.id });
                  } else {
                    // Fallback: download the branded image
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'drip-fit-tryon.png';
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: 'Image downloaded!', description: 'Share it to Instagram Stories.' });
                  }
                } catch {
                  // Fallback: copy URL
                  await navigator.clipboard.writeText(post.result_photo_url);
                  toast({ title: 'Link copied!', description: 'Paste it into Instagram Stories.' });
                }
              }}
            >
              <Instagram className="h-4 w-4" />
              Share to Instagram
            </Button>
          </div>

          <Button
            variant="outline"
            className={`w-full h-11 rounded-xl text-[12px] font-bold gap-1.5 ${post.is_public ? 'border-primary/40 bg-primary/10' : ''}`}
            onClick={handleToggleCommunity}
            disabled={posting}
          >
            <MessageSquare className="h-4 w-4" />
            {posting ? (post.is_public ? 'Removing…' : 'Posting…') : post.is_public ? 'Shared in Style Check ✓' : 'Post to Community'}
          </Button>

          {/* Delete */}
          {onDelete && (
            <>
              <Button
                variant="outline"
                className="w-full h-9 rounded-xl text-[11px] text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
                onClick={() => setConfirmDeleteId(post.id)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Try-On
              </Button>
              <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                <AlertDialogContent className="max-w-[320px] rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[15px]">Delete try-on?</AlertDialogTitle>
                    <AlertDialogDescription className="text-[13px]">This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl text-[12px]">Cancel</AlertDialogCancel>
                    <AlertDialogAction className="rounded-xl text-[12px] bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (confirmDeleteId) onDelete(confirmDeleteId); setConfirmDeleteId(null); }}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TryOnDetailSheet;
