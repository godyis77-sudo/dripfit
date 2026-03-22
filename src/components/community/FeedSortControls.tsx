import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import type { FilterType, TrendingSort } from './community-types';
import type { Post } from './community-types';

const TRENDING_SORTS: { key: TrendingSort; label: string }[] = [
  { key: 'hot', label: '🔥 Hot' },
  { key: 'love', label: '👍 Top Buy' },
  { key: 'newest', label: '🕐 Newest' },
  { key: 'user', label: '👤 By User' },
];

const FOLLOWING_SORTS: { key: TrendingSort; label: string }[] = [
  { key: 'newest', label: '🕐 Newest' },
  { key: 'hot', label: '🔥 Hot' },
  { key: 'love', label: '👍 Top Buy' },
  { key: 'user', label: '👤 By User' },
];

interface FeedSortControlsProps {
  filter: FilterType;
  trendingSort: TrendingSort;
  followingSort: TrendingSort;
  filterUserId: string | null;
  posts: Post[];
  onTrendingSortChange: (s: TrendingSort) => void;
  onFollowingSortChange: (s: TrendingSort) => void;
  onFilterUserIdChange: (id: string | null) => void;
}

const FeedSortControls = ({
  filter, trendingSort, followingSort, filterUserId, posts,
  onTrendingSortChange, onFollowingSortChange, onFilterUserIdChange,
}: FeedSortControlsProps) => {
  const [showSortOptions, setShowSortOptions] = useState(false);

  if (filter !== 'trending' && filter !== 'following') return null;

  const sorts = filter === 'trending' ? TRENDING_SORTS : FOLLOWING_SORTS;
  const activeSort = filter === 'trending' ? trendingSort : followingSort;
  const setSort = filter === 'trending' ? onTrendingSortChange : onFollowingSortChange;
  const showUserChips = activeSort === 'user';

  return (
    <>
      <div className="mb-3">
        <button
          onClick={() => setShowSortOptions(!showSortOptions)}
          className="flex items-center gap-1.5 pill pill-active text-[11px]"
          aria-label="Toggle sort options"
        >
          <SlidersHorizontal className="h-3 w-3" />
          {sorts.find(s => s.key === activeSort)?.label}
        </button>
        <AnimatePresence>
          {showSortOptions && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
                {sorts.map(s => (
                  <button
                    key={s.key}
                    onClick={() => {
                      setSort(s.key);
                      if (s.key !== 'user') onFilterUserIdChange(null);
                      setShowSortOptions(false);
                    }}
                    className={`pill ${activeSort === s.key ? 'pill-active' : ''}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showUserChips && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
          <button onClick={() => onFilterUserIdChange(null)} aria-label="Show all users" className={`pill ${!filterUserId ? 'pill-active' : ''}`}>All</button>
          {[...new Map(posts.filter(p => p.profile?.display_name).map(p => [p.user_id, p.profile?.display_name])).entries()].map(([uid, name]) => (
            <button key={uid} onClick={() => onFilterUserIdChange(filterUserId === uid ? null : uid)} aria-label={`Filter by ${name}`} className={`pill ${filterUserId === uid ? 'pill-active' : ''}`}>{name}</button>
          ))}
        </div>
      )}
    </>
  );
};

export default FeedSortControls;
