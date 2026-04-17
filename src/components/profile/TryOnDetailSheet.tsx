import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MessageSquare, ShoppingBag, ShoppingCart, X, Instagram, Trash2, ChevronDown, ExternalLink, Check, Pencil } from 'lucide-react';
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
import { useQueryClient, useQuery } from '@tanstack/react-query';
import ProductPreviewModal, { type ProductPreviewData } from '@/components/ui/ProductPreviewModal';
import { decodeHtmlEntities } from '@/lib/utils';
import { FullscreenImage } from '@/components/ui/fullscreen-image';

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

const normalizeUrl = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase();
  }
};

const hostLabel = (url: string) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

/** Resolves product_catalog entries for the given product URLs (best-effort). */
function useResolvedProducts(urls: string[] | null | undefined) {
  return useQuery({
    queryKey: ['tryon-shop-items', urls?.join('|')],
    enabled: !!urls && urls.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Array<{ url: string; product: ProductPreviewData | null }>> => {
      if (!urls || urls.length === 0) return [];
      const results = await Promise.all(
        urls.map(async (url) => {
          try {
            const norm = normalizeUrl(url);
            const { data } = await supabase
              .from('product_catalog')
              .select('id, image_url, name, brand, price_cents, product_url, category, currency, fit_profile, fabric_composition, style_genre, additional_images, description')
              .ilike('product_url', `${norm}%`)
              .eq('is_active', true)
              .limit(1);
            if (data?.[0]) {
              return { url, product: data[0] as ProductPreviewData };
            }
            return { url, product: null };
          } catch {
            return { url, product: null };
          }
        })
      );
      return results;
    },
  });
}

const ShopItemsList = ({
  urls,
  onClickout,
  onSelectProduct,
}: {
  urls: string[];
  onClickout: () => void;
  onSelectProduct: (product: ProductPreviewData) => void;
}) => {
  const { data: resolved, isLoading } = useResolvedProducts(urls);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <ShoppingBag className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Shop Items ({urls.length})</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(resolved || urls.map((url) => ({ url, product: null }))).map(({ url, product }, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (product) {
                onSelectProduct(product);
              } else {
                window.open(url, '_blank', 'noopener');
                onClickout();
              }
            }}
            className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/10 active:scale-[0.97] transition-transform text-left"
          >
            {product?.image_url ? (
              <img
                src={product.image_url}
                alt={decodeHtmlEntities(product.name)}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {isLoading ? (
                  <div className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                ) : (
                  <ExternalLink className="h-5 w-5 text-white/30" />
                )}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2">
              {product ? (
                <>
                  <p className="text-[9px] tracking-[0.18em] uppercase text-white/55 font-bold truncate">{product.brand}</p>
                  <p className="text-[11px] text-white font-semibold truncate">{decodeHtmlEntities(product.name)}</p>
                  {product.price_cents != null && (
                    <p className="text-[11px] text-primary font-bold mt-0.5">${(product.price_cents / 100).toFixed(0)}</p>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-white/70 font-semibold truncate">{hostLabel(url)}</p>
              )}
            </div>
            {!product && !isLoading && (
              <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                <ExternalLink className="h-2.5 w-2.5 text-white/80" />
              </span>
            )}
          </button>
        ))}
      </div>
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
  const [previewProduct, setPreviewProduct] = useState<ProductPreviewData | null>(null);

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
      await supabase.from('clothing_wardrobe').upsert({
        user_id: user.id,
        image_url: post.clothing_photo_url || post.result_photo_url,
        category: 'top',
        product_link: (post.product_urls && post.product_urls.length > 0) ? post.product_urls[0] : null,
        is_liked: true,
        source_post_id: post.id,
      }, { onConflict: 'user_id,image_url' });
      toast({ title: '❤️ Liked & saved to closet' });
    } else {
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
    const publishAt = new Date().toISOString();
    const updatePayload: { is_public: boolean; created_at?: string } = { is_public: newPublic };
    if (newPublic) updatePayload.created_at = publishAt;
    const { error } = await supabase
      .from('tryon_posts')
      .update(updatePayload)
      .eq('id', post.id)
      .eq('user_id', user.id);
    setPosting(false);
    if (error) {
      toast({ title: 'Error', description: newPublic ? 'Could not post to community.' : 'Could not remove from community.', variant: 'destructive' });
      return;
    }
    const nextCreatedAt = newPublic ? publishAt : post.created_at;
    queryClient.setQueryData(['tryon-posts', user.id], (prev: TryOnPost[] | undefined) => {
      if (!prev) return prev;
      return prev
        .map((item) => item.id === post.id ? { ...item, is_public: newPublic, created_at: nextCreatedAt } : item)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    queryClient.invalidateQueries({ queryKey: ['community-feed'], exact: false, refetchType: 'all' });
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
      toast({ title: 'Error', description: 'Could not add to closet.', variant: 'destructive' });
      return;
    }
    setAddedToWardrobe(true);
    trackEvent('wardrobe_added_from_tryon', { post_id: post.id });
    toast({ title: '👕 Saved to Closet!', description: 'You can find it in your Closet tab.' });
    queryClient.invalidateQueries({ queryKey: ['wardrobe'] });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95dvh] p-0 rounded-t-2xl glass-dark border-t border-white/10 flex flex-col overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 z-50 h-8 w-8 rounded-full bg-white/5 backdrop-blur border border-white/10 flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-white/70" />
        </button>

        {/* Image */}
        <div className="relative w-full flex-shrink-0 flex items-center justify-center overflow-hidden px-2 pt-1">
          <div className="relative inline-flex rounded-2xl overflow-hidden bg-black max-w-full">
            <div className="absolute top-3 left-3 z-10">
              <p className="text-[10px] text-white/25">{new Date(post.created_at).toLocaleDateString()}</p>
            </div>
            <FullscreenImage
              src={post.result_photo_url}
              alt={post.caption || 'Try-on result'}
              description={postedCaption}
            >
              <img
                src={post.result_photo_url}
                alt={post.caption || 'Try-on result'}
                className="max-w-full max-h-[45dvh] w-auto h-auto rounded-2xl object-contain cursor-zoom-in"
              />
            </FullscreenImage>
            {postedCaption && (
              <div className="absolute bottom-14 right-4 left-4 z-10">
                <p className="text-[13px] text-white font-medium drop-shadow-sm text-center">{postedCaption}</p>
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleLike(); }}
              className={`absolute bottom-3 left-3 z-10 h-10 w-10 rounded-full backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform ${liked ? 'bg-primary/20 border border-primary/40' : 'bg-white/5 border border-white/10'}`}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <span className="text-[20px] leading-none">🔥</span>
            </button>
          </div>
        </div>

        {/* Caption field */}
        {showCaptionForPost && (
          <div className="px-4 pt-2 flex-shrink-0">
            {editingCaption ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  maxLength={200}
                  placeholder="Add a caption…"
                  className="flex-1 h-10 bg-transparent border-b border-white/15 px-1 text-[13px] text-white placeholder:text-white/25 focus:outline-none"
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
                className="flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/60 transition-colors min-h-[44px]"
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

        {/* Actions + Shop items */}
        <div className="px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] space-y-3 overflow-y-auto flex-1 min-h-0">

          {/* Shop items grid with thumbnails */}
          {post.product_urls && post.product_urls.length > 0 && (
            <ShopItemsList
              urls={post.product_urls}
              onClickout={() => trackEvent('shop_clickout', { post_id: post.id })}
              onSelectProduct={(product) => {
                trackEvent('tryon_shop_item_preview', { post_id: post.id, brand: product.brand });
                setPreviewProduct(product);
              }}
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className={`h-11 rounded-xl text-[12px] font-bold gap-1.5 ${addedToWardrobe ? 'glass-gold text-primary border-primary/30' : 'glass text-white/60 border-white/10'}`}
              onClick={handleAddToWardrobe}
              disabled={addingToWardrobe || addedToWardrobe}
            >
              <ShoppingBag className="h-4 w-4" />
              {addingToWardrobe ? 'Adding…' : addedToWardrobe ? 'Added ✓' : 'Closet'}
            </Button>

            <Button
              variant="outline"
              className={`h-11 rounded-xl text-[12px] font-bold gap-1.5 ${isInCart(post.id) ? 'glass-gold text-primary border-primary/30' : 'glass text-white/60 border-white/10'}`}
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
              className="h-11 rounded-xl text-[12px] font-bold gap-1.5 col-span-2 glass text-white/60 border-white/10"
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
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'drip-fit-tryon.png';
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: 'Image downloaded!', description: 'Share it to Instagram Stories.' });
                  }
                } catch {
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
            className={`w-full h-11 rounded-xl text-[12px] font-bold gap-1.5 ${post.is_public ? 'glass-gold text-primary border-primary/30' : 'glass text-white/60 border-white/10'}`}
            onClick={() => {
              if (post.is_public) {
                handleToggleCommunity();
              } else if (!showCaptionForPost) {
                setShowCaptionForPost(true);
                setCaptionDraft(post.caption || '');
                setEditingCaption(true);
              } else {
                handleToggleCommunity();
              }
            }}
            disabled={posting}
          >
            <MessageSquare className="h-4 w-4" />
            {posting ? (post.is_public ? 'Removing…' : 'Posting…') : post.is_public ? 'Shared in Style Check ✓' : showCaptionForPost ? 'Post to Style Check' : 'Add Caption & Post'}
          </Button>

          {/* Delete */}
          {onDelete && (
            <>
              <Button
                variant="outline"
                className="w-full h-9 rounded-xl text-[11px] bg-white/5 border border-white/10 text-destructive hover:bg-white/10 gap-1.5"
                onClick={() => setConfirmDeleteId(post.id)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Try-On
              </Button>
              <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
                <AlertDialogContent className="max-w-[320px] rounded-2xl glass-dark border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-[15px] text-white">Delete try-on?</AlertDialogTitle>
                    <AlertDialogDescription className="text-[13px] text-white/50">This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl text-[12px] glass text-white/60">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-xl text-[12px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        if (!confirmDeleteId) return;
                        void onDelete(confirmDeleteId);
                        setConfirmDeleteId(null);
                        onOpenChange(false);
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>

        {/* Fullscreen product preview */}
        <ProductPreviewModal
          product={previewProduct}
          onClose={() => setPreviewProduct(null)}
          onShop={(product) => {
            if (product.product_url) {
              window.open(product.product_url, '_blank', 'noopener');
              trackEvent('shop_clickout', { post_id: post.id, brand: product.brand });
            }
          }}
          onTryOn={(product) => {
            setPreviewProduct(null);
            onOpenChange(false);
            navigate('/tryon', {
              state: { clothingUrl: product.image_url, productUrl: product.product_url },
            });
          }}
        />
      </SheetContent>
    </Sheet>
  );
};

export default TryOnDetailSheet;
