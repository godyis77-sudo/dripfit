import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Send, Sparkles, Trash2, User, UserPlus, UserCheck } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import WhatsInThisLook from '@/components/community/WhatsInThisLook';
import type { Post, FilterType } from './community-types';
import { VOTE_OPTIONS, FIT_OPTIONS } from './community-types';

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
}

const isPlaceholder = (post: Post) => post.id.startsWith('seed-');

const PostCard = ({
  post, index, filter, votes, voteCounts, followToggles, hasScan,
  onVote, onFollowToggle, onDeletePost, onImageError, onOpenDetail,
}: PostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

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
              <p className="text-[9px] font-semibold text-foreground truncate">{post.profile?.display_name || 'Anon'}</p>
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
                <DropdownMenuItem onClick={() => onDeletePost(post.id)} className="text-destructive focus:text-destructive">
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
            className="absolute inset-0 h-full w-full object-contain"
            onError={() => onImageError(post.id)}
          />
        </div>
        {post.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-6 pb-1.5 px-2">
            <p className="text-white font-bold text-[10px] leading-snug line-clamp-2">{post.caption}</p>
          </div>
        )}
        {filter === 'similar' && (post as any).match_score && (
          <div
            className="absolute top-2 right-2 text-[10px] font-bold text-white rounded-full px-2 py-0.5"
            style={{ background: 'rgba(184, 150, 12, 0.92)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            {(post as any).match_score}% match
          </div>
        )}
        {!(user && post.user_id === user.id) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const urls = (post as any).product_urls;
              if (urls && urls.length > 0) {
                navigate('/tryon', { state: { productUrl: urls[0] } });
              } else {
                toast({ title: 'No product linked to this look' });
              }
            }}
            className="absolute top-2 left-2 text-[11px] font-bold text-white rounded-[100px] flex items-center gap-1 active:scale-95 transition-transform"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.12)', padding: '4px 10px' }}
          >
            <Sparkles className="h-2.5 w-2.5" /> Try On
          </button>
        )}
      </button>

      {/* Buy votes */}
      <div className="px-1.5 pt-1.5">
        <div className="flex gap-1">
          {VOTE_OPTIONS.map(v => {
            const active = (votes[post.id] || []).includes(v.key);
            return (
              <motion.button
                key={v.key}
                whileTap={{ scale: 1.18 }}
                transition={{ duration: 0.2 }}
                onClick={() => onVote(post.id, v.key)}
                className={`flex-1 py-1.5 rounded-md text-[9px] font-bold border transition-all flex flex-col items-center gap-0.5 ${
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                {v.emoji}
                <span className="text-[8px] font-medium leading-none">{voteCounts[post.id]?.[v.key] ?? 0}</span>
              </motion.button>
            );
          })}
        </div>
        {(() => {
          const buyYes = voteCounts[post.id]?.buy_yes ?? 0;
          const total = buyYes + (voteCounts[post.id]?.buy_no ?? 0) + (voteCounts[post.id]?.keep_shopping ?? 0);
          if (total > 0) {
            const pct = Math.round((buyYes / total) * 100);
            return <p className="text-[9px] font-bold text-primary mt-1 text-center">{pct}% Buy it · {total} vote{total !== 1 ? 's' : ''}</p>;
          }
          return null;
        })()}
      </div>

      {/* Fit votes */}
      <div className="mx-1.5 my-1 h-px bg-[hsl(0_0%_13%)]" />
      <div className="px-1.5 pb-1">
        <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider mb-1">How does it fit?</p>
        {hasScan ? (
          <div className="flex gap-1">
            {FIT_OPTIONS.map(f => {
              const active = (votes[post.id] || []).includes(f.key);
              return (
                <motion.button
                  key={f.key}
                  whileTap={{ scale: 1.18 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => onVote(post.id, f.key)}
                  className={`flex-1 py-1 rounded-md text-[8px] font-bold border transition-all ${
                    active ? 'border-primary/60 bg-primary/5 text-primary' : 'border-border/50 text-muted-foreground/60'
                  }`}
                >
                  {f.label}
                </motion.button>
              );
            })}
          </div>
        ) : (
          <button onClick={() => navigate('/capture')} className="text-[9px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            Complete a scan to rate the fit →
          </button>
        )}
      </div>

      {/* What's In This Look */}
      <WhatsInThisLook
        productUrls={(post as any).product_urls}
        clothingPhotoUrl={post.clothing_photo_url}
        variant="card"
        onTryOn={() => navigate('/tryon')}
        onAddToWardrobe={async (item) => {
          if (!user) { toast({ title: 'Sign in first', variant: 'destructive' }); return; }
          const imgUrl = item.image_url || post.clothing_photo_url || '';
          await supabase.from('clothing_wardrobe').insert({ user_id: user.id, image_url: imgUrl, category: 'top', brand: item.brand !== 'Shop' ? item.brand : null, product_link: item.url || null });
          toast({ title: 'Added', description: 'Saved to your wardrobe.' });
          trackEvent('wardrobe_add_from_look', { brand: item.brand });
        }}
      />

      {/* Mini comment */}
      <div className="px-1.5 pt-1 pb-1.5">
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Comment…"
            maxLength={500}
            className="flex-1 h-6 rounded-md bg-muted/50 border border-border px-2 text-[9px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 transition-colors"
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                const val = (e.target as HTMLInputElement).value.trim();
                if (!user) { toast({ title: 'Sign in to comment', variant: 'destructive' }); return; }
                const { error } = await supabase.from('post_comments').insert({ post_id: post.id, user_id: user.id, comment_text: val });
                if (error) { toast({ title: 'Could not post comment', variant: 'destructive' }); return; }
                trackEvent('fitcheck_comment', { postId: post.id });
                toast({ title: 'Comment posted!' });
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
          <button
            aria-label="Send comment"
            className="shrink-0 h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center active:scale-90 transition-transform"
            onClick={async (e) => {
              const input = (e.currentTarget.previousSibling as HTMLInputElement);
              if (input?.value?.trim()) {
                if (!user) { toast({ title: 'Sign in to comment', variant: 'destructive' }); return; }
                const { error } = await supabase.from('post_comments').insert({ post_id: post.id, user_id: user.id, comment_text: input.value.trim() });
                if (error) { toast({ title: 'Could not post comment', variant: 'destructive' }); return; }
                trackEvent('fitcheck_comment', { postId: post.id });
                toast({ title: 'Comment posted!' });
                input.value = '';
              }
            }}
          >
            <Send className="h-2.5 w-2.5 text-primary" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PostCard;
