import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, UserPlus, UserCheck, ExternalLink, Pencil, Check, ZoomIn, ZoomOut, Sparkles, Trash2, MessageCircle } from 'lucide-react';
import { detectBrandFromUrl } from '@/lib/retailerDetect';
import { GENERIC_PROMPTS } from './community-types';
import WhatsInThisLook from '@/components/community/WhatsInThisLook';
import { supabase } from '@/integrations/supabase/client';

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

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  profile?: { display_name: string | null; avatar_url?: string | null };
}

// ... keep existing code (VOTE_OPTIONS, FIT_OPTIONS, interface PostDetailSheetProps)
const VOTE_OPTIONS = [
  { key: 'buy_yes', label: 'Buy it', emoji: '🔥' },
  { key: 'buy_no', label: 'Pass', emoji: '👎' },
  { key: 'keep_shopping', label: 'Add to Cart', emoji: '🛒' },
] as const;

const FIT_OPTIONS = [
  { key: 'too_tight', label: 'Too small' },
  { key: 'perfect', label: 'Perfect' },
  { key: 'too_loose', label: 'Too big' },
] as const;

interface PostDetailSheetProps {
  post: Post | null;
  open: boolean;
  onClose: () => void;
  prompt: string;
  votes: Record<string, string[]>;
  voteCounts: Record<string, Record<string, number>>;
  onVote: (postId: string, key: string) => void;
  onComment: (postId: string, comment: string) => void;
  onFollow: (userId: string) => void;
  onNavigateProfile: (post: Post) => void;
  onShopLook: (post: Post) => void;
  onTryOn?: (post: Post) => void;
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
  onFollow,
  onNavigateProfile,
  onShopLook,
  onTryOn,
  onDelete,
  isFollowing,
  isOwnPost,
  isPlaceholder,
  currentUserId,
}: PostDetailSheetProps) => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch comments when sheet opens
  useEffect(() => {
    if (!open || !post) { setComments([]); setShowComments(false); return; }
    const fetchComments = async () => {
      const { data } = await supabase
        .from('post_comments')
        .select('id, comment_text, created_at, user_id')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true })
        .limit(50);
      if (!data || data.length === 0) { setComments([]); return; }
      // Fetch profiles for commenters
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
      setShowComments(false);
    };
    fetchComments();
  }, [open, post?.id]);

  useEffect(() => {
    if (!open || !post) return;
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [open, post?.id]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
    } else if (e.touches.length === 1 && zoom > 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsPanning(true);
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / lastDist.current;
      setZoom(prev => Math.min(4, Math.max(1, prev * scale)));
      lastDist.current = dist;
    } else if (e.touches.length === 1 && isPanning && lastTouch.current && zoom > 1) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [isPanning, zoom]);

  const handleTouchEnd = useCallback(() => {
    lastDist.current = null;
    lastTouch.current = null;
    setIsPanning(false);
    if (zoom <= 1) setPan({ x: 0, y: 0 });
  }, [zoom]);

  const toggleZoom = () => {
    if (zoom > 1) { setZoom(1); setPan({ x: 0, y: 0 }); } else { setZoom(2.5); }
  };

  const handleDoubleClick = useCallback(() => {
    if (zoom > 1) { setZoom(1); setPan({ x: 0, y: 0 }); } else { setZoom(2.5); }
  }, [zoom]);

  if (!post) return null;

  const allUrls = (post.product_urls && post.product_urls.length > 0) ? post.product_urls : [];
  const retailerUrlMap = new Map<string, string>();
  allUrls.forEach(u => {
    const { brand } = detectBrandFromUrl(u);
    if (brand && !retailerUrlMap.has(brand)) retailerUrlMap.set(brand, u);
  });
  const retailers = [...retailerUrlMap.keys()];

  const GENERIC_PROMPTS_SET = new Set(GENERIC_PROMPTS);
  const userCaption = post.caption && !GENERIC_PROMPTS_SET.has(post.caption) ? post.caption : '';
  const displayQuestion = questionText || userCaption;

  const handleSendComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText.trim());
      // Optimistically add the comment
      const newComment: Comment = {
        id: crypto.randomUUID(),
        comment_text: commentText.trim(),
        created_at: new Date().toISOString(),
        user_id: currentUserId || '',
        profile: { display_name: 'You', avatar_url: null },
      };
      setComments(prev => [...prev, newComment]);
      setShowComments(true);
      setCommentText('');
      // Scroll to new comment without shifting image
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  };

  const handleStartEditQuestion = () => { setQuestionText(displayQuestion); setEditingQuestion(true); };
  const handleSaveQuestion = () => { setEditingQuestion(false); };

  const buyYes = voteCounts[post.id]?.buy_yes ?? 0;
  const buyNo = voteCounts[post.id]?.buy_no ?? 0;
  const addToCartCount = voteCounts[post.id]?.keep_shopping ?? 0;
  const totalBuy = buyYes + buyNo;
  const buyPct = totalBuy > 0 ? Math.round((buyYes / totalBuy) * 100) : 0;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col overflow-y-auto"
          onClick={onClose}
        >
          {/* Top bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-4 pt-4 pb-2 z-10"
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
              {isOwnPost && !isPlaceholder && onDelete && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(post.id); }} aria-label="Remove post" className="h-8 px-3 rounded-full bg-red-500/20 text-red-400 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
              {!isOwnPost && !isPlaceholder && (
                <button onClick={(e) => { e.stopPropagation(); onFollow(post.user_id); }} className={`h-8 px-3 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 ${isFollowing ? 'bg-white/10 text-white' : 'bg-white text-black'}`}>
                  {isFollowing ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
              <button onClick={onClose} aria-label="Close" className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </motion.div>

          {/* Image with pinch-to-zoom */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-2"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
          >
            <div className="relative mx-auto w-full max-w-sm aspect-[3/4] overflow-hidden rounded-xl bg-background touch-none">
              <img src={post.result_photo_url} alt={post.caption || 'Try-on look'} className="absolute inset-0 h-full w-full object-contain object-top transition-transform duration-100" style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }} draggable={false} />
              <button onClick={toggleZoom} aria-label={zoom > 1 ? "Zoom out" : "Zoom in"} className="absolute bottom-3 right-4 h-8 w-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform">
                {zoom > 1 ? <ZoomOut className="h-4 w-4 text-white" /> : <ZoomIn className="h-4 w-4 text-white" />}
              </button>
            {retailers.length > 0 && zoom <= 1 && (
              <div className="absolute top-3 right-4 flex flex-col gap-1 items-end">
                {retailers.map((r) => (
                  <button key={r} onClick={() => { window.open(retailerUrlMap.get(r), '_blank', 'noopener'); }} className="text-[11px] font-bold text-white bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-transform">
                    {r}
                    <ExternalLink className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}
            {!isOwnPost && zoom <= 1 && onTryOn && (
              <button
                onClick={() => onTryOn(post)}
                className="absolute top-3 left-4 text-[11px] font-bold text-white rounded-[100px] flex items-center gap-1 active:scale-95 transition-transform"
                style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.12)', padding: '4px 10px' }}
              >
                <Sparkles className="h-2.5 w-2.5" /> Try On
              </button>
            )}
            </div>
          </motion.div>

          {/* What's In This Look */}
          <div className="px-4 pt-2" onClick={(e) => e.stopPropagation()}>
            <WhatsInThisLook
              productUrls={post.product_urls || undefined}
              clothingPhotoUrl={post.clothing_photo_url}
              variant="detail"
              onTryOn={onTryOn ? () => onTryOn(post) : undefined}
            />
          </div>

          {/* Bottom panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="px-4 pb-6 pt-3 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Editable caption */}
            <div className="flex items-center gap-2">
              {editingQuestion ? (
                <>
                  <input type="text" value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Add Caption / Comment…" className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40" autoFocus maxLength={300} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveQuestion(); }} />
                  <button onClick={handleSaveQuestion} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform">
                    Post
                  </button>
                </>
              ) : questionText ? (
                <button onClick={handleStartEditQuestion} className="flex-1 text-left">
                  <p className="text-white font-bold text-sm leading-snug">{questionText}</p>
                </button>
              ) : (
                <button onClick={() => { setQuestionText(''); setEditingQuestion(true); }} className="flex-1 h-10 rounded-lg bg-white/10 border border-white/20 px-3 flex items-center">
                  <span className="text-sm text-white/40">Add Caption / Comment…</span>
                </button>
              )}
            </div>

            {/* Outcome summary */}
            {(totalBuy > 0 || addToCartCount > 0) && (
              <div className="text-center">
                {totalBuy > 0 && (
                  <>
                    <p className="text-[16px] font-bold text-white">{buyPct}% Buy it</p>
                    <p className="text-[11px] text-white/50">{totalBuy} vote{totalBuy !== 1 ? 's' : ''}</p>
                  </>
                )}
                {addToCartCount > 0 && (
                  <p className="text-[11px] font-semibold text-white/80">{addToCartCount} added to cart</p>
                )}
              </div>
            )}

            {/* Section A: WOULD YOU BUY IT? */}
            <p className="text-[11px] text-white/50 font-bold uppercase tracking-wider">Would you buy it?</p>
            <div className="flex gap-2">
              {VOTE_OPTIONS.map(v => {
                const active = (votes[post.id] || []).includes(v.key);
                return (
                  <button
                    key={v.key}
                    onClick={() => onVote(post.id, v.key)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 flex flex-col items-center gap-0.5 ${active ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground'}`}
                  >
                    <div>
                      <span className="mr-1">{v.emoji}</span>
                      <span className="text-[11px]">{v.label}</span>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">{voteCounts[post.id]?.[v.key] ?? 0}</span>
                  </button>
                );
              })}
            </div>

            {/* Comments section */}
            {comments.length > 0 && (
              <>
                <div className="h-px bg-[hsl(0_0%_13%)]" />
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="flex items-center gap-1.5 text-[11px] text-white/50 font-bold uppercase tracking-wider"
                >
                  <MessageCircle className="h-3 w-3" />
                  {comments.length} Comment{comments.length !== 1 ? 's' : ''} · {showComments ? 'Hide' : 'Show'}
                </button>
                {showComments && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {comments.map(c => (
                      <div key={c.id} className="flex items-start gap-2">
                        {c.profile?.avatar_url ? (
                          <img src={c.profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover border border-white/10 shrink-0 mt-0.5" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[9px] font-bold text-white/70">{(c.profile?.display_name || 'A')[0].toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[11px] font-bold text-white/80">{c.profile?.display_name || 'Anonymous'}</span>
                            <span className="text-[9px] text-white/30">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-[12px] text-white/70 leading-snug break-words">{c.comment_text}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>
                )}
              </>
            )}

            {/* Chat input */}
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Drop a comment…" value={commentText} onChange={(e) => setCommentText(e.target.value)} className="flex-1 h-10 rounded-xl bg-white/10 border border-white/20 px-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-colors" maxLength={500} onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment(); }} />
              <button onClick={handleSendComment} aria-label="Send comment" className="shrink-0 h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center active:scale-90 transition-transform">
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
