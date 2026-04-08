import { useState, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { scrollIntoViewIfNeeded } from '@/lib/autoScroll';

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  profile?: { display_name: string | null; avatar_url?: string | null };
}

interface CommentsSectionProps {
  comments: Comment[];
  onSendComment: (text: string) => void;
  currentUserId?: string;
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const CommentsSection = ({ comments, onSendComment, currentUserId }: CommentsSectionProps) => {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    const trimmed = commentText.trim();
    if (!trimmed) return;
    onSendComment(trimmed);
    setCommentText('');
    setShowComments(true);
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  };

  return (
    <>
      {/* Comments list */}
      {comments.length > 0 && (
        <div ref={commentsSectionRef}>
          <div className="h-px bg-white/5" />
          <button
            onClick={() => {
              const next = !showComments;
              setShowComments(next);
              if (next) {
                setTimeout(() => {
                  if (commentsSectionRef.current) {
                    scrollIntoViewIfNeeded(commentsSectionRef.current);
                  }
                }, 100);
              }
            }}
            className="flex items-center gap-1.5 text-[11px] text-white/40 font-bold uppercase tracking-wider py-1"
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
                      <span className="text-[11px] font-bold text-white/70">{(c.profile?.display_name || 'A')[0].toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[11px] font-bold text-white/80">{c.profile?.display_name || 'Anonymous'}</span>
                      <span className="text-[11px] text-white/30">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-[12px] text-white/70 leading-snug break-words">{c.comment_text}</p>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Chat input — borderless editorial style */}
      <div className="flex items-center gap-2 pb-[env(safe-area-inset-bottom,16px)]">
        <input
          type="text"
          placeholder="Drop a comment…"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="flex-1 h-10 bg-transparent border-b border-white/10 px-1 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
          maxLength={500}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
        />
        <button
          onClick={handleSend}
          aria-label="Send comment"
          className="shrink-0 h-10 w-10 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Send className="h-4 w-4 text-primary" />
        </button>
      </div>
    </>
  );
};

export default CommentsSection;
export type { Comment };
