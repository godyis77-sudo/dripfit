import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import PostCard from './PostCard';
import { FeedCardSkeletons } from '@/components/ui/skeleton';
import EmptyStates from './EmptyStates';
import type { Post, FilterType } from './community-types';

interface CommunityFeedGridProps {
  posts: Post[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  filter: FilterType;
  votes: Record<string, string[]>;
  voteCounts: Record<string, Record<string, number>>;
  followToggles: Record<string, boolean>;
  hasScan: boolean;
  userId?: string;
  onVote: (postId: string, key: string) => void;
  onFollowToggle: (userId: string) => void;
  onDeletePost: (postId: string) => void;
  onImageError: (postId: string) => void;
  onOpenDetail: (post: Post) => void;
  onCaptionUpdated: (postId: string, caption: string | null) => void;
  onPostLook: () => void;
  onLoadMore: () => void;
  shouldShowEmpty: boolean;
}

const CommunityFeedGrid = ({
  posts, loading, loadingMore, hasMore, filter,
  votes, voteCounts, followToggles, hasScan, userId,
  onVote, onFollowToggle, onDeletePost, onImageError, onOpenDetail, onCaptionUpdated,
  onPostLook, onLoadMore, shouldShowEmpty,
}: CommunityFeedGridProps) => {
  const { revealRef } = useScrollReveal();
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-white/5 overflow-hidden bg-black/30">
            <div className="w-full aspect-[4/5] skeleton-gold" />
            <div className="p-2.5 space-y-1.5">
              <div className="h-3 w-3/4 rounded skeleton-gold" />
              <div className="flex gap-1.5">{[1, 2, 3].map(j => <div key={j} className="h-7 flex-1 rounded-lg skeleton-gold" />)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (shouldShowEmpty) {
    return <EmptyStates filter={filter} hasScan={hasScan} userId={userId} onPostLook={onPostLook} />;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 pb-4">
        {posts.map((post, idx) => (
          <div key={post.id} ref={revealRef(idx)}>
          <PostCard
            key={post.id}
            post={post}
            index={idx}
            filter={filter}
            votes={votes}
            voteCounts={voteCounts}
            followToggles={followToggles}
            hasScan={hasScan}
            onVote={onVote}
            onFollowToggle={onFollowToggle}
            onDeletePost={onDeletePost}
            onImageError={onImageError}
            onOpenDetail={onOpenDetail}
            onCaptionUpdated={onCaptionUpdated}
          />
          </div>
        ))}
      </div>
      {hasMore && !loading && (
        <div className="flex justify-center pb-20 pt-2">
          <Button
            className="rounded-lg bg-white/5 backdrop-blur-md border border-white/10 text-white/70 h-10 px-6 text-xs font-bold tracking-wide uppercase hover:bg-white/10"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loadingMore ? 'Loading…' : 'Load More'}
          </Button>
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <EndOfFeedCTA onPostLook={onPostLook} />
      )}
    </>
  );
};

/** End-of-feed CTA */
const EndOfFeedCTA = ({ onPostLook }: { onPostLook: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center pb-20 pt-4 text-center">
      <p className="font-display italic text-sm text-white/20 mb-3">The feed is current.</p>
      <div className="flex gap-2">
        <Button
          className="h-10 px-4 rounded-xl bg-primary/8 backdrop-blur-md border border-primary/20 text-primary text-[12px] font-bold hover:bg-primary/15"
          onClick={onPostLook}
        >
          <span className="mr-1">✦</span> Post a Look
        </Button>
        <Button
          className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 text-white/70 text-[12px] font-semibold hover:bg-white/10"
          onClick={() => navigate('/tryon')}
        >
          Try On Something New
        </Button>
      </div>
    </div>
  );
};

export default CommunityFeedGrid;
