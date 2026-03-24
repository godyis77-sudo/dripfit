import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MessageSquare, ShoppingBag, ShoppingCart, X, Instagram, Trash2, ChevronDown, ExternalLink, Check, Pencil, Flame } from 'lucide-react';
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
import { useQueryClient } from '@tanstack/react-query';
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

const ShopDropdown = ({ urls, onClickout }: { urls: string[]; onClickout: () => void }) => {
  const [open, setOpen] = useState(false);
  const extractLabel = (url: string, idx: number) => {
    try {
      const host = new URL(url).hostname.replace('www.', '');
      return `Item ${idx + 1} — ${host}`;
    } catch {
      return `Item ${idx + 1}`;
    }
  };

  return (
    <div className="col-span-2 relative">
      <Button
        className="h-11 rounded-xl text-[12px] font-bold gap-1.5 btn-luxury text-primary-foreground w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <ShoppingBag className="h-4 w-4" />
        Shop Items
        <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </Button>
      {open && (
        <div className="mt-1.5 rounded-xl border border-border bg-card overflow-hidden shadow-lg">
          {urls.map((url, i) => (
            <button
              key={i}
              className="flex items-center gap-2 w-full px-4 py-3 text-[12px] font-medium text-foreground hover:bg-muted/50 active:bg-muted transition-colors border-b border-border last:border-b-0 min-h-[44px]"
              onClick={() => {
                window.open(url, '_blank', 'noopener');
                onClickout();
              }}
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {extractLabel(url, i)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TryOnDetailSheet = ({ post, open, onOpenChange, onPostUpdated, onDelete }: TryOnDetailSheetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToCart, removeFromCart, isInCart } = useCart();
  const [liked, setLiked] = useState(false);
  const [posting, setPosting] = useState(false);
  const [addingToWardrobe, setAddingToWardrobe] = useState(false);
  const [addedToWardrobe, setAddedToWardrobe] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showCaptionForPost, setShowCaptionForPost] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  const handleSaveCaption = async () => {
    if (!user || !post) return;
    setSavingCaption(true);
    const trimmed = captionDraft.trim();
    const { error } = await supabase
      .from('tryon_posts')
      .update({ caption: trimmed || null })
      .eq('id', post.id)
      .eq('user_id', user.id);
    setSavingCaption(false);
    if (error) {
      toast({ title: 'Error', description: 'Could not save caption.', variant: 'destructive' });
      return;
    }
    setEditingCaption(false);
    toast({ title: 'Caption saved' });
    onPostUpdated?.();
  };

  if (!post) return null;

  const postedCaption = getPostedCaption(post.caption);

  const handleLike = async () => {
    if (!user) return;
    const newLiked = !liked;
    setLiked(newLiked);
    trackEvent('tryon_liked', { post_id: post.id });

    if (newLiked) {
      // Upsert into wardrobe with is_liked
      await supabase.from('clothing_wardrobe').upsert({
        user_id: user.id,
        image_url: post.clothing_photo_url || post.result_photo_url,
        category: 'top',
        product_link: (post.product_urls && post.product_urls.length > 0) ? post.product_urls[0] : null,
        is_liked: true,
        source_post_id: post.id,
      }, { onConflict: 'user_id,image_url' });
      toast({ title: '❤️ Liked & saved to wardrobe' });
    } else {
      // Remove liked flag (update, don't delete — they may have saved it too)
      await supabase.from('clothing_wardrobe')
        .update({ is_liked: false } as any)
        .eq('user_id', user.id)
        .eq('source_post_id', post.id);
      toast({ title: 'Removed from liked' });
    }
    queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
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
    const { error } = await supabase.from('clothing_wardrobe').upsert({
      user_id: user.id,
      image_url: post.clothing_photo_url || post.result_photo_url,
      category: 'top',
      product_link: (post.product_urls && post.product_urls.length > 0) ? post.product_urls[0] : null,
      is_saved: true,
      source_post_id: post.id,
    }, { onConflict: 'user_id,image_url' });
    setAddingToWardrobe(false);
    if (error) {
      toast({ title: 'Error', description: 'Could not add to wardrobe.', variant: 'destructive' });
      return;
    }
    setAddedToWardrobe(true);
    trackEvent('wardrobe_added_from_tryon', { post_id: post.id });
    toast({ title: '👕 Saved to Wardrobe!', description: 'You can find it in your Wardrobe tab.' });
    queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
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
        <div className="relative w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden px-2 pt-1">
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black flex items-center justify-center">
          {/* Date — top left overlay */}
          <div className="absolute top-3 left-3 z-10">
            <p className="text-[11px] text-white/80 font-medium drop-shadow-sm">{new Date(post.created_at).toLocaleDateString()}</p>
          </div>
          <img
            src={post.result_photo_url}
            alt={post.caption || 'Try-on result'}
            className="max-w-full max-h-full w-auto h-auto rounded-2xl"
          />
          {/* Caption — bottom right overlay on image */}
          {postedCaption && (
            <div className="absolute bottom-3 right-14 left-14 z-10">
              <p className="text-[13px] text-white font-medium drop-shadow-sm text-center">{postedCaption}</p>
            </div>
          )}
          {/* Fire — bottom left overlay on image */}
          <button
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
            className="absolute bottom-3 left-3 z-10 h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
            aria-label={liked ? 'Unlike' : 'Like'}
          >
            <Flame className={`h-5 w-5 ${liked ? 'fill-orange-500 text-orange-500' : 'text-white'}`} />
          </button>
          </div>
        </div>

        {/* Caption field — only shown when posting to community */}
        {showCaptionForPost && (
          <div className="px-4 pt-2">
            {editingCaption ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  maxLength={200}
                  placeholder="Add a caption…"
                  className="flex-1 h-10 rounded-xl border border-border bg-muted/50 px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCaption(); }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-xl shrink-0"
                  onClick={handleSaveCaption}
                  disabled={savingCaption}
                >
                  <Check className="h-4 w-4 text-primary" />
                </Button>
              </div>
            ) : (
              <button
                className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
                onClick={() => {
                  setCaptionDraft(post.caption || '');
                  setEditingCaption(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                {postedCaption || 'Add a caption…'}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] space-y-3 overflow-y-auto">

          {post.product_urls && post.product_urls.length === 1 && (
            <Button
              className="h-11 rounded-xl text-[12px] font-bold gap-1.5 btn-luxury text-primary-foreground w-full"
              onClick={() => {
                window.open(post.product_urls![0], '_blank', 'noopener');
                trackEvent('shop_clickout', { post_id: post.id });
              }}
            >
              <ShoppingBag className="h-4 w-4" />
              Shop this Style
            </Button>
          )}

          {post.product_urls && post.product_urls.length > 1 && (
            <ShopDropdown
              urls={post.product_urls}
              onClickout={() => trackEvent('shop_clickout', { post_id: post.id })}
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={addedToWardrobe ? 'default' : 'outline'}
              className={`h-11 rounded-xl text-[12px] font-bold gap-1.5 ${addedToWardrobe ? 'bg-primary/20 text-primary border-primary/30' : ''}`}
              onClick={handleAddToWardrobe}
              disabled={addingToWardrobe || addedToWardrobe}
            >
              <ShoppingBag className="h-4 w-4" />
              {addingToWardrobe ? 'Adding…' : addedToWardrobe ? 'Added ✓' : 'Wardrobe'}
            </Button>

            <Button
              variant="outline"
              className={`h-11 rounded-xl text-[12px] font-bold gap-1.5 ${isInCart(post.id) ? 'border-primary/40 bg-primary/10' : ''}`}
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
              <ShoppingCart className="h-4 w-4" />
              {isInCart(post.id) ? 'In Cart ✓' : 'Cart'}
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
            onClick={() => {
              if (!post.is_public && !showCaptionForPost) {
                setShowCaptionForPost(true);
                setCaptionDraft(post.caption || '');
                setEditingCaption(true);
                return;
              }
              handleToggleCommunity();
            }}
            disabled={posting}
          >
            <MessageSquare className="h-4 w-4" />
            {posting ? (post.is_public ? 'Removing…' : 'Posting…') : post.is_public ? 'Shared in Style Check ✓' : showCaptionForPost ? 'Post Style Check' : 'Post Style Check'}
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
