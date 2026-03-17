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
  votes: Record<string, string>;
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
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
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
        ))}
      </div>
      {hasMore && !loading && (
        <div className="flex justify-center pb-20 pt-2">
          <Button
            className="rounded-lg btn-luxury text-primary-foreground h-10 px-6 text-xs font-bold"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loadingMore ? 'Loading…' : 'Load More'}
          </Button>
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-[10px] text-muted-foreground pb-20 pt-2">You've seen it all ✨</p>
      )}
    </>
  );
};

export default CommunityFeedGrid;
