import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, UserCheck, Trash2, Link2, Share2, Check } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { getPostedCaption } from './community-types';
import WhatsInThisLook from '@/components/community/WhatsInThisLook';
import type { LookItem } from '@/components/community/WhatsInThisLook';
import { supabase } from '@/integrations/supabase/client';
import ImageViewer from './ImageViewer';
import { trackEvent } from '@/lib/analytics';
import VotePanel from './VotePanel';
import CommentsSection from './CommentsSection';
import type { Comment } from './CommentsSection';

// Re-export VOTE_OPTIONS for consumers that imported from here
export { VOTE_OPTIONS } from './VotePanel';

interface Post {
  id: string;
  user_id: string;
  result_photo_url: string;
  clothing_photo_url: string;
  caption: string | null;
  created_at: string;
  product_urls?: string[] | null;
  profile?: { display_name: string | null; avatar_url?: string | null };
  avg_style?: number;
  avg_color?: number;
  avg_buy?: number;
  avg_suitability?: number;
  rating_count?: number;
}

interface PostDetailSheetProps {
  post: Post | null;
  open: boolean;
  onClose: () => void;
  prompt: string;
  votes: Record<string, string[]>;
  voteCounts: Record<string, Record<string, number>>;
  onVote: (postId: string, key: string) => void;
  onComment: (postId: string, comment: string) => void;
  onCaptionUpdated?: (postId: string, caption: string | null) => void;
  onFollow: (userId: string) => void;
  onNavigateProfile: (post: Post) => void;
  onShopLook: (post: Post) => void;
  onTryOn?: (post: Post) => void;
  onTryOnItem?: (item: LookItem, post: Post) => void;
  onDelete?: (postId: string) => void;
  isFollowing: boolean;
  isOwnPost: boolean;
  isPlaceholder: boolean;
  currentUserId?: string;
}

export const PostDetailSheet = ({
  post,
  open,
  onClose,
  prompt,
  votes,
  voteCounts,
  onVote,
  onComment,
  onCaptionUpdated,
  onFollow,
  onNavigateProfile,
  onShopLook,
  onTryOn,
  onTryOnItem,
  onDelete,
  isFollowing,
  isOwnPost,
  isPlaceholder,
  currentUserId,
}: PostDetailSheetProps) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCopyPostLink = async () => {
    if (!post) return;
    const url = `${window.location.origin}/style-check/${post.id}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    trackEvent('share_post_link_copied', { postId: post.id });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Fetch comments when sheet opens
  useEffect(() => {
    if (!open || !post) { setComments([]); return; }
    const fetchComments = async () => {
      const { data } = await supabase
        .from('post_comments')
        .select('id, comment_text, created_at, user_id')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true })
        .limit(50);
      if (!data || data.length === 0) { setComments([]); return; }
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setComments(data.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) || { display_name: null, avatar_url: null },
      })));
    };
    fetchComments();
  }, [open, post?.id]);

  // Reset state on open
  useEffect(() => {
    if (!open || !post) return;
    const postedCaption = getPostedCaption(post.caption);
    setQuestionText(postedCaption ?? '');
    setEditingQuestion(false);

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = '';
    };
  }, [open, post?.id, post?.caption]);

  if (!post) return null;

  // Retailer extraction
  const allUrls = (post.product_urls && post.product_urls.length > 0) ? post.product_urls : [];
  const retailerUrlMap = new Map<string, string>();
  allUrls.forEach(u => {
    const { brand } = detectBrandFromUrl(u);
    if (brand && !retailerUrlMap.has(brand)) retailerUrlMap.set(brand, u);
  });
  const retailers = [...retailerUrlMap.keys()];

  const userCaption = getPostedCaption(post.caption) ?? '';
  const displayQuestion = questionText || userCaption;

  const handleStartEditQuestion = () => { setQuestionText(displayQuestion); setEditingQuestion(true); };
  const handleSaveQuestion = async () => {
    if (!isOwnPost || !currentUserId) { setEditingQuestion(false); return; }
    const nextCaption = questionText.trim();
    setSavingCaption(true);
    const { error } = await supabase
      .from('tryon_posts')
      .update({ caption: nextCaption || null })
      .eq('id', post.id)
      .eq('user_id', currentUserId);
    setSavingCaption(false);
    if (error) { console.error('Failed to save caption', error); return; }
    onCaptionUpdated?.(post.id, nextCaption || null);
    setQuestionText(nextCaption);
    setEditingQuestion(false);
  };

  const handleSendComment = (text: string) => {
    onComment(post.id, text);
    const newComment: Comment = {
      id: crypto.randomUUID(),
      comment_text: text,
      created_at: new Date().toISOString(),
      user_id: currentUserId || '',
      profile: { display_name: 'You', avatar_url: null },
    };
    setComments(prev => [...prev, newComment]);
  };

  const sheetContent = (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] h-[100dvh] bg-black flex flex-col overflow-y-auto overscroll-y-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
            ref={scrollContainerRef}
          >
            {/* Top bar */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky top-0 flex items-center justify-between px-4 pt-3 pb-1 z-20 bg-black/80 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => onNavigateProfile(post)} className="flex items-center gap-2 active:opacity-70 transition-opacity">
                {post.profile?.avatar_url ? (
                  <img src={post.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border-2 border-white/20" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{(post.profile?.display_name || 'A')[0].toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-white">{post.profile?.display_name || 'Anonymous'}</p>
                  <p className="text-[10px] text-white/50">{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleCopyPostLink(); }} aria-label="Copy link" className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform">
                  {linkCopied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Link2 className="h-3.5 w-3.5 text-white" />}
                </button>
                {isOwnPost && !isPlaceholder && onDelete && (
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(post.id); }} aria-label="Remove post" className="h-8 px-3 rounded-full bg-destructive/20 text-destructive text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95">
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                )}
                {!isOwnPost && !isPlaceholder && (
                  <button onClick={(e) => { e.stopPropagation(); onFollow(post.user_id); }} className={`h-8 px-3 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 ${isFollowing ? 'bg-white/10 text-white' : 'bg-white text-black'}`}>
                    {isFollowing ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  aria-label="Close"
                  className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </motion.div>

            {/* Image */}
            <ImageViewer
              src={post.result_photo_url}
              alt={post.caption || 'Try-on look'}
              retailers={retailers}
              retailerUrlMap={retailerUrlMap}
            />

            {/* Caption section */}
            {isOwnPost ? (
              <div className="px-4 pt-1.5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  {editingQuestion ? (
                    <>
                      <input type="text" value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Add Caption / Comment…" className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40" autoFocus maxLength={300} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveQuestion(); }} />
                      <button onClick={handleSaveQuestion} disabled={savingCaption} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed">
                        {savingCaption ? 'Saving…' : 'Post'}
                      </button>
                    </>
                  ) : displayQuestion ? (
                    <button onClick={handleStartEditQuestion} className="flex-1 text-left">
                      <p className="text-white font-bold text-sm leading-snug">{displayQuestion}</p>
                    </button>
                  ) : (
                    <button onClick={() => { setQuestionText(''); setEditingQuestion(true); }} className="flex-1 h-10 rounded-lg bg-white/10 border border-white/20 px-3 flex items-center">
                      <span className="text-sm text-white/40">Add Caption / Comment…</span>
                    </button>
                  )}
                </div>
              </div>
            ) : displayQuestion ? (
              <div className="px-4 pt-1.5" onClick={(e) => e.stopPropagation()}>
                <p className="text-white font-bold text-sm leading-snug">{displayQuestion}</p>
              </div>
            ) : null}

            {/* What's In This Look */}
            <div className="px-4 pt-1.5" onClick={(e) => e.stopPropagation()}>
              <WhatsInThisLook
                productUrls={post.product_urls || undefined}
                clothingPhotoUrl={post.clothing_photo_url}
                variant="detail"
                onTryOn={onTryOnItem ? (item: LookItem) => onTryOnItem(item, post) : (onTryOn ? () => onTryOn(post) : undefined)}
              />
            </div>

            {/* Bottom panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="px-4 pb-4 pt-2 space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <VotePanel
                postId={post.id}
                votes={votes}
                voteCounts={voteCounts}
                onVote={onVote}
              />

              <CommentsSection
                comments={comments}
                onSendComment={handleSendComment}
                currentUserId={currentUserId}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent className="max-w-[320px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px]">Delete this post?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">This will permanently remove your post and all votes/comments. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-[12px]">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl text-[12px] bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (confirmDeleteId && onDelete) onDelete(confirmDeleteId); setConfirmDeleteId(null); }}>Delete Post</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(sheetContent, document.body) : sheetContent;
};
