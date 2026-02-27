import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, UserPlus, UserCheck, ExternalLink, Pencil, Check } from 'lucide-react';
import { detectRetailer } from '@/lib/retailerDetect';
import { getBestRetailerForItem } from '@/lib/retailerLinks';

interface Post {
  id: string;
  user_id: string;
  result_photo_url: string;
  clothing_photo_url: string;
  caption: string | null;
  created_at: string;
  product_url?: string | null;
  profile?: { display_name: string | null; avatar_url?: string | null };
  avg_style?: number;
  avg_color?: number;
  avg_buy?: number;
  avg_suitability?: number;
  rating_count?: number;
}

const VOTE_OPTIONS = [
  { key: 'love', label: 'Love it', emoji: '❤️' },
  { key: 'buy', label: 'Buy it', emoji: '🔥' },
  { key: 'keep_shopping', label: 'Keep shopping', emoji: '🛒' },
] as const;

interface PostDetailSheetProps {
  post: Post | null;
  open: boolean;
  onClose: () => void;
  prompt: string;
  votes: Record<string, string>;
  onVote: (postId: string, key: string) => void;
  onComment: (postId: string, comment: string) => void;
  onFollow: (userId: string) => void;
  onNavigateProfile: (post: Post) => void;
  onShopLook: (post: Post) => void;
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
  onVote,
  onComment,
  onFollow,
  onNavigateProfile,
  onShopLook,
  isFollowing,
  isOwnPost,
  isPlaceholder,
}: PostDetailSheetProps) => {
  const [commentText, setCommentText] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [questionText, setQuestionText] = useState('');

  if (!post) return null;

  const retailer = post.product_url
    ? detectRetailer(post.product_url)
    : getBestRetailerForItem(null, post.caption?.toLowerCase().includes('dress') ? 'dress' : 'top');

  const displayQuestion = questionText || post.caption || prompt;

  const handleSendComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText.trim());
      setCommentText('');
    }
  };

  const handleStartEditQuestion = () => {
    setQuestionText(displayQuestion);
    setEditingQuestion(true);
  };

  const handleSaveQuestion = () => {
    setEditingQuestion(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-black flex flex-col"
          onClick={onClose}
        >
          {/* Top bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-4 pt-4 pb-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onNavigateProfile(post)}
              className="flex items-center gap-2 active:opacity-70 transition-opacity"
            >
              {post.profile?.avatar_url ? (
                <img src={post.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border-2 border-white/20" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {(post.profile?.display_name || 'A')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">{post.profile?.display_name || 'Anonymous'}</p>
                <p className="text-[10px] text-white/50">
                  {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-2">
              {!isOwnPost && !isPlaceholder && (
                <button
                  onClick={(e) => { e.stopPropagation(); onFollow(post.user_id); }}
                  className={`h-8 px-3 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 ${
                    isFollowing
                      ? 'bg-white/10 text-white'
                      : 'bg-white text-black'
                  }`}
                >
                  {isFollowing ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex items-center justify-center px-2 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={post.result_photo_url}
              alt={post.caption || 'Try-on look'}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
            {/* Retailer badge */}
            {retailer && (
              <button
                onClick={() => onShopLook(post)}
                className="absolute top-3 right-4 text-[11px] font-bold text-white bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                {retailer}
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </motion.div>

          {/* Bottom panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="px-4 pb-6 pt-3 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Editable question */}
            <div className="flex items-start gap-2">
              {editingQuestion ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveQuestion(); }}
                  />
                  <button onClick={handleSaveQuestion} className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center active:scale-90">
                    <Check className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="flex-1 text-white font-bold text-sm leading-snug">{displayQuestion}</p>
                  <button
                    onClick={handleStartEditQuestion}
                    className="shrink-0 h-7 w-7 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <Pencil className="h-3 w-3 text-white/70" />
                  </button>
                </>
              )}
            </div>

            {/* Emoji votes */}
            <div className="flex gap-2">
              {VOTE_OPTIONS.map(v => {
                const active = votes[post.id] === v.key;
                return (
                  <button
                    key={v.key}
                    onClick={() => onVote(post.id, v.key)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                      active
                        ? 'border-white bg-white/20 text-white'
                        : 'border-white/20 text-white/70'
                    }`}
                  >
                    <span className="mr-1">{v.emoji}</span>
                    <span className="text-[11px]">{v.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Chat input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Drop a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 h-10 rounded-xl bg-white/10 border border-white/20 px-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-colors"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendComment(); }}
              />
              <button
                onClick={handleSendComment}
                className="shrink-0 h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Rating count */}
            {(post.rating_count ?? 0) > 0 && (
              <p className="text-[11px] text-white/40 text-center">
                {post.rating_count} {post.rating_count === 1 ? 'rating' : 'ratings'}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
