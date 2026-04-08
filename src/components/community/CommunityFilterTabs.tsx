import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FilterType } from './community-types';

interface CommunityFilterTabsProps {
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
}

const TABS: { key: FilterType; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'following', label: 'Following' },
  { key: 'trending', label: 'Trending' },
  { key: 'similar', label: 'Similar Fit' },
  { key: 'shop', label: 'Shop' },
];

const CommunityFilterTabs = ({ filter, onFilterChange }: CommunityFilterTabsProps) => {
  const [similarFitTooltip, setSimilarFitTooltip] = useState(false);

  return (
    <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide relative px-1" onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
      {TABS.map(f => (
        <button
          key={f.key}
          onClick={() => onFilterChange(f.key)}
          aria-label={f.key === 'shop' ? 'Open filters' : 'Change sort order'}
          className={`flex-1 py-1.5 min-h-[44px] text-[12px] font-bold transition-all relative whitespace-nowrap px-3 flex items-center justify-center gap-0.5 rounded-full ${
            filter === f.key ? 'glass-gold text-primary' : 'glass text-white/50'
          }`}
        >
          {f.label}
          {f.key === 'similar' && (
            <button
              onClick={(e) => { e.stopPropagation(); setSimilarFitTooltip(!similarFitTooltip); }}
              aria-label="What is Similar Fit?"
              className={`text-[11px] ml-0.5 ${filter === f.key ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}
            >
              ⓘ
            </button>
          )}
        </button>
      ))}
      <AnimatePresence>
        {similarFitTooltip && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50" onClick={() => setSimilarFitTooltip(false)} />
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} className="absolute top-full mt-1 right-[20%] z-50 w-[240px] bg-card border border-border rounded-xl p-3 shadow-xl">
              <p className="text-[11px] text-muted-foreground leading-relaxed">Similar Fit shows outfits posted by people with measurements closest to yours. Their ratings are more relevant to how clothes will fit you specifically.</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CommunityFilterTabs;
