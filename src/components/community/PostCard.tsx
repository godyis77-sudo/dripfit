import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, Sparkles, Trash2, User, UserPlus, UserCheck, ChevronUp, ShoppingBag } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import WhatsInThisLook from '@/components/community/WhatsInThisLook';
import type { LookItem } from '@/components/community/WhatsInThisLook';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { navigateToTryOn } from '@/lib/tryonNavigate';
import type { Post, FilterType } from './community-types';
import { getPostedCaption } from './community-types';
import { VOTE_OPTIONS, FIT_OPTIONS } from './community-types';
import { useCart } from '@/hooks/useCart';

interface PostCardProps {
  post: Post;
  index: number;
  filter: FilterType;
  votes: Record<string, string[]>;
  voteCounts: Record<string, Record<string, number>>;
  followToggles: Record<string, boolean>;
  hasScan: boolean;
  onVote: (postId: string, key: string) => void;
  onFollowToggle: (userId: string) => void;
  onDeletePost: (postId: string) => void;
  onImageError: (postId: string) => void;
  onOpenDetail: (post: Post) => void;
  onCaptionUpdated?: (postId: string, caption: string | null) => void;
}

const isPlaceholder = (post: Post) => post.id.startsWith('seed-');

/** Bottom-right badge showing clothing items — expandable, auto-populates try-on */
const TryOnClothingBadge = ({ post, navigate, toast }: { post: Post; navigate: ReturnType<typeof useNavigate>; toast: ReturnType<typeof useToast>['toast'] }) => {
  const [expanded, setExpanded] = useState(false);
  const [catalogItems, setCatalogItems] = useState<{ url: string; brand: string; name: string; image_url: string | null }[]>([]);

  const urls = (post as any).product_urls as string[] | null;

  useEffect(() => {
    if (!urls?.length) return;
    let cancelled = false;
    // Derive basic info from URLs
    const derived = urls.map(url => {
      const { brand } = detectBrandFromUrl(url);
      let name = 'Product';
      try {
        const u = new URL(url);
        const segments = u.pathname.split('/').filter(Boolean);
        const last = segments[segments.length - 1] || '';
        name = last.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 30) || u.hostname.replace('www.', '');
      } catch {}
      return { url, brand: brand || 'Shop', name, image_url: null as string | null };
    });

    // Try to enrich from catalog
    supabase
      .from('product_catalog')
      .select('product_url, image_url, name, brand')
      .in('product_url', urls)
      .then(({ data }) => {
        if (cancelled) return;
        const enriched = derived.map(d => {
          const match = data?.find(r => r.product_url === d.url);
          return match ? { ...d, image_url: match.image_url, name: match.name || d.name, brand: match.brand || d.brand } : d;
        });
        setCatalogItems(enriched);
      });

    if (!catalogItems.length) setCatalogItems(derived);
    return () => { cancelled = true; };
  }, [urls?.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectItem = (item: typeof catalogItems[0], e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to try-on with the clothing image/url pre-populated
    const imgUrl = item.image_url || post.clothing_photo_url;
    navigate('/tryon', { state: { productUrl: item.url, clothingImageUrl: imgUrl } });
    trackEvent('catalog_product_tryon', { source: 'style_check_badge' });
  };

  if (!urls?.length) return null;
  const items = catalogItems.length ? catalogItems : [];
  if (!items.length) return null;

  return (
    <div className="absolute bottom-2 right-2 z-10" onClick={e => e.stopPropagation()}>
      <AnimatePresence>
        {expanded && items.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="mb-1 flex flex-col gap-1"
          >
            {items.slice(1).map((item, idx) => (
              <button
                key={idx}
                onClick={(e) => handleSelectItem(item, e)}
                className="brand-label active:scale-95 transition-transform gap-1.5"
              >
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="h-5 w-5 rounded object-cover" />
                ) : (
                  <ShoppingBag className="h-3 w-3" />
                )}
                <span className="truncate max-w-[80px]">{item.brand}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (items.length > 1) {
            setExpanded(!expanded);
          } else {
            handleSelectItem(items[0], e);
          }
        }}
        className="flex items-center gap-0.5 rounded-[100px] text-[11px] font-bold active:scale-95 transition-transform gradient-drip text-primary-foreground px-2 py-0.5 shadow-gold-glow shimmer-sweep"
      >
        <Sparkles className="h-2 w-2" />
        Try-On
        {items.length > 1 && (
          <>
            <span className="text-[11px] opacity-70">({items.length})</span>
            <ChevronUp className={`h-2.5 w-2.5 transition-transform ${expanded ? '' : 'rotate-180'}`} />
          </>
        )}
      </button>
    </div>
  );
};
const PostCard = ({
  post, index, filter, votes, voteCounts, followToggles, hasScan,
  onVote, onFollowToggle, onDeletePost, onImageError, onOpenDetail, onCaptionUpdated,
}: PostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [localCaption, setLocalCaption] = useState(post.caption ?? '');

  useEffect(() => {
    setLocalCaption(post.caption ?? '');
  }, [post.id, post.caption]);

  const postedCaption = getPostedCaption(localCaption);
  const hasPostedCaption = !!postedCaption;

  const saveCaption = async (value: string, input?: HTMLInputElement | null) => {
    if (!user) return;
    const nextCaption = value.trim();
    const { error } = await supabase
      .from('tryon_posts')
      .update({ caption: nextCaption || null })
      .eq('id', post.id)
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Could not save caption', variant: 'destructive' });
      return;
    }

    setLocalCaption(nextCaption);
    onCaptionUpdated?.(post.id, nextCaption || null);
    toast({ title: 'Caption saved' });
    if (input) input.value = '';
  };

  const handleVoteWithCart = (postId: string, key: string) => {
    onVote(postId, key);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-card border border-border rounded-xl overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 active:opacity-70 transition-opacity min-w-0">
              {post.profile?.avatar_url ? (
                <img src={post.profile.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full gradient-drip flex items-center justify-center shrink-0">
                  <span className="text-[7px] font-bold text-primary-foreground">{(post.profile?.display_name || 'A')[0].toUpperCase()}</span>
                </div>
              )}
              <p className="text-[11px] font-semibold text-foreground truncate">{post.profile?.display_name || 'Anon'}</p>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[140px]">
            <DropdownMenuItem onClick={() => {
              const name = post.profile?.display_name || 'Anonymous';
              if (user && post.user_id === user.id) { navigate('/profile'); return; }
              navigate(`/profile/${encodeURIComponent(name)}`);
            }}>
              <User className="mr-2 h-3.5 w-3.5" /> View Profile
            </DropdownMenuItem>
            {user && post.user_id !== user.id && !isPlaceholder(post) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onFollowToggle(post.user_id)}>
                  {followToggles[post.user_id]
                    ? <><UserCheck className="mr-2 h-3.5 w-3.5 text-primary" /> Unfollow</>
                    : <><UserPlus className="mr-2 h-3.5 w-3.5" /> Follow</>
                  }
                </DropdownMenuItem>
              </>
            )}
            {user && post.user_id === user.id && !isPlaceholder(post) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setConfirmDeleteId(post.id)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove Post
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="flex-1" />
        {user && post.user_id !== user.id && !isPlaceholder(post) && (
          <span className={`shrink-0 p-0.5 ${followToggles[post.user_id] ? 'text-primary' : 'text-muted-foreground/40'}`}>
            {followToggles[post.user_id] ? <UserCheck className="h-3 w-3" /> : null}
          </span>
        )}
      </div>

      {/* Image */}
      <button onClick={() => onOpenDetail(post)} aria-label="View post detail" className="relative w-full text-left">
        <div className="relative w-full aspect-[3/4] bg-muted/30">
          <img
            src={post.result_photo_url}
            alt={post.caption || "Try-on look"}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-top"
            onError={() => onImageError(post.id)}
          />
        </div>
        {filter === 'similar' && (post as any).match_score && (
          <div
            className="absolute top-2 right-2 text-[10px] font-bold rounded-full px-1.5 py-0.5 gradient-drip text-primary-foreground shadow-gold-glow"
          >
            {(post as any).match_score}% match
          </div>
        )}
      </button>
      {hasPostedCaption && (
        <p className="text-[10px] font-bold text-foreground text-center px-2 py-1 line-clamp-2">{postedCaption}</p>
      )}

      {/* Mini comment — only for own posts */}
      {user && post.user_id === user.id && (
        <div className="px-1.5 pt-1.5 pb-1">
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="Add caption…"
              maxLength={500}
              className="flex-1 h-6 rounded-md bg-muted/50 border border-border px-2 text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 transition-colors"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                  await saveCaption((e.target as HTMLInputElement).value, e.target as HTMLInputElement);
                }
              }}
            />
            <button
              aria-label="Save caption"
              className="shrink-0 h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center active:scale-90 transition-transform"
              onClick={async (e) => {
                const input = (e.currentTarget.previousSibling as HTMLInputElement);
                if (input?.value?.trim()) {
                  await saveCaption(input.value, input);
                }
              }}
            >
              <Send className="h-2.5 w-2.5 text-primary" />
            </button>
          </div>
        </div>
      )}

      {/* Buy votes */}
      <div className="px-1.5 pt-1">
        <div className="flex gap-1">
          {VOTE_OPTIONS.map(v => {
            const active = (votes[post.id] || []).includes(v.key);
            return (
              <motion.button
                key={v.key}
                whileTap={{ scale: 1.18 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleVoteWithCart(post.id, v.key)}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-bold border transition-all flex flex-col items-center gap-0.5 ${
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                {v.emoji}
                <span className="text-[10px] font-medium leading-none">{voteCounts[post.id]?.[v.key] ?? 0}</span>
              </motion.button>
            );
          })}
        </div>
        {(() => {
          const buyYes = voteCounts[post.id]?.buy_yes ?? 0;
          const buyNo = voteCounts[post.id]?.buy_no ?? 0;
          const addToCartCount = voteCounts[post.id]?.keep_shopping ?? 0;
          const totalBuyVotes = buyYes + buyNo;

          if (totalBuyVotes === 0 && addToCartCount === 0) return null;

          const parts: string[] = [];
          if (totalBuyVotes > 0) {
            const pct = Math.round((buyYes / totalBuyVotes) * 100);
            parts.push(`${pct}% Buy it · ${totalBuyVotes} vote${totalBuyVotes !== 1 ? 's' : ''}`);
          }
          if (addToCartCount > 0) {
            parts.push(`${addToCartCount} added to cart`);
          }

          return <p className="text-[11px] font-bold text-primary mt-1 text-center">{parts.join(' · ')}</p>;
        })()}
      </div>

      {/* What's In This Look */}
      <WhatsInThisLook
        productUrls={(post as any).product_urls}
        clothingPhotoUrl={post.clothing_photo_url}
        variant="card"
        onTryOn={(item: LookItem) => navigateToTryOn(navigate, { productUrl: item.url, fallbackClothingImageUrl: item.image_url || post.clothing_photo_url, source: 'style_check_shop_style' })}
        onAddToWardrobe={async (item) => {
          if (!user) { toast({ title: 'Sign in first', variant: 'destructive' }); return; }
          const imgUrl = item.image_url || post.clothing_photo_url || '';
          await supabase.from('clothing_wardrobe').insert({ user_id: user.id, image_url: imgUrl, category: 'top', brand: item.brand !== 'Shop' ? item.brand : null, product_link: item.url || null });
          toast({ title: 'Added', description: 'Saved to your wardrobe.' });
          trackEvent('wardrobe_add_from_look', { brand: item.brand });
        }}
      />

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent className="max-w-[320px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Remove from Style Check?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">This only removes it from the feed — your try-on and wardrobe are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-[12px]">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl text-[12px] bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (confirmDeleteId) onDeletePost(confirmDeleteId); setConfirmDeleteId(null); }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default PostCard;
