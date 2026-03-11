import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Heart, MessageSquare, ShoppingBag, X, Instagram, Trash2, Sparkles } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { generateTryOnShareCard } from '@/lib/shareImage';

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
  const [liked, setLiked] = useState(false);
  const [posting, setPosting] = useState(false);
  const [addingToWardrobe, setAddingToWardrobe] = useState(false);
  const [addedToWardrobe, setAddedToWardrobe] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!post) return null;

  const handleLike = () => {
    setLiked(prev => !prev);
    trackEvent('tryon_liked', { post_id: post.id });
    toast({ title: liked ? 'Removed from favorites' : '❤️ Added to favorites' });
  };

  const handlePostToCommunity = async () => {
    if (!user) return;
    if (post.is_public) {
      toast({ title: 'Already posted', description: 'This try-on is already public.' });
      return;
    }
    setPosting(true);
    const { error } = await supabase
      .from('tryon_posts')
      .update({ is_public: true })
      .eq('id', post.id)
      .eq('user_id', user.id);
    setPosting(false);
    if (error) {
      toast({ title: 'Error', description: 'Could not post to community.', variant: 'destructive' });
      return;
    }
    trackEvent('tryon_posted_to_community', { post_id: post.id });
    toast({ title: '🔥 Posted!', description: 'Your look is now live in the community feed.' });
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

        {/* Full-screen image — maximized */}
        <div className="relative w-full flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden">
          <img
            src={post.result_photo_url}
            alt={post.caption || 'Try-on result'}
            className="w-full h-full object-contain"
          />
          {/* Delete icon — top left */}
          {onDelete && (
            <button
              type="button"
              aria-label="Delete try-on"
              className="absolute top-3 left-3 z-50 h-9 w-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors active:scale-90"
              onClick={() => setConfirmDeleteId(post.id)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {/* Date badge */}
          <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
            <p className="text-[10px] text-white font-medium">{new Date(post.created_at).toLocaleDateString()}</p>
          </div>
          {/* Public badge */}
          <div className="absolute bottom-3 right-3">
            <span className={`text-[9px] font-bold px-2 py-1 rounded-full backdrop-blur-sm ${post.is_public ? 'bg-primary/80 text-primary-foreground' : 'bg-black/50 text-white'}`}>
              {post.is_public ? 'Public' : 'Private'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pt-4 pb-6 space-y-3">
          {post.caption && (
            <p className="text-[13px] text-foreground font-medium">{post.caption}</p>
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
              Try On This Look
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
                      title: post.caption || 'Check my fit on DRIPFITCHECK!',
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

          {!post.is_public && (
            <Button
              className="w-full h-11 rounded-xl text-[12px] font-bold btn-luxury text-primary-foreground gap-1.5"
              onClick={handlePostToCommunity}
              disabled={posting}
            >
              <MessageSquare className="h-4 w-4" />
              {posting ? 'Posting…' : 'Post to Community'}
            </Button>
          )}

          {post.is_public && (
            <div className="flex items-center gap-1.5 justify-center py-1">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <p className="text-[11px] text-muted-foreground">Already shared in Fit Check Feed</p>
            </div>
          )}

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
