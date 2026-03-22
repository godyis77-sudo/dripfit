import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Flame, Users, Ruler, Search, Shirt, Bookmark } from 'lucide-react';
import type { FilterType } from './community-types';

interface EmptyStateProps {
  filter: FilterType;
  hasScan: boolean;
  userId?: string;
  onPostLook: () => void;
}

const EmptyIcon = ({ icon: Icon }: { icon: typeof Flame }) => (
  <div className="h-14 w-14 rounded-2xl bg-muted/60 border border-border mb-4 flex items-center justify-center">
    <Icon className="h-6 w-6 text-muted-foreground" />
  </div>
);

const EmptyStates = ({ filter, hasScan, userId, onPostLook }: EmptyStateProps) => {
  const navigate = useNavigate();

  if (filter === 'trending') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <EmptyIcon icon={Flame} />
        <h2 className="text-base font-bold text-foreground mb-1">Trending looks will appear here</h2>
        <p className="text-[13px] text-muted-foreground max-w-[280px] mb-5">Post your first try-on and ask the community. The more votes a look gets, the higher it trends.</p>
        <Button className="w-4/5 h-11 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={onPostLook}>Post a Look</Button>
      </div>
    );
  }

  if (filter === 'new') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <EmptyIcon icon={Shirt} />
        <h2 className="text-base font-bold text-foreground mb-1">Be the first to post a look</h2>
        <p className="text-[13px] text-muted-foreground max-w-[280px] mb-5">Get honest feedback from people with your body type.</p>
        <Button className="w-4/5 h-11 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={onPostLook}>Post a Look</Button>
      </div>
    );
  }

  if (filter === 'similar') {
    if (!hasScan) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <EmptyIcon icon={Ruler} />
          <h2 className="text-base font-bold text-foreground mb-1">See looks from your body type</h2>
          <p className="text-[13px] text-muted-foreground max-w-[280px] mb-5">Complete a quick body scan so we can match you with similar users.</p>
          <Button className="w-4/5 h-11 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={() => navigate('/capture')}>Start Body Scan</Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <EmptyIcon icon={Search} />
        <h2 className="text-base font-bold text-foreground mb-1">No similar fits yet</h2>
        <p className="text-[13px] text-muted-foreground max-w-[280px] mb-5">As more people with similar measurements post, they'll appear here.</p>
        <Button className="w-4/5 h-11 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={onPostLook}>Post Your Own Look</Button>
      </div>
    );
  }

  if (filter === 'following') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <EmptyIcon icon={Users} />
        <h2 className="text-base font-bold text-foreground mb-1">Your feed is empty</h2>
        <p className="text-[13px] text-muted-foreground max-w-[280px] mb-5">Follow people in the community to see their looks here.</p>
        <Button className="w-4/5 h-11 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={() => {}}>Browse Looks</Button>
      </div>
    );
  }

  return null;
};

/** Generic empty state for wardrobe and saved items */
export const GenericEmptyState = ({ icon: Icon, title, description, actionLabel, onAction }: {
  icon: typeof Bookmark;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <EmptyIcon icon={Icon} />
    <h2 className="text-base font-bold text-foreground mb-1">{title}</h2>
    <p className="text-[13px] text-muted-foreground max-w-[280px] mb-5">{description}</p>
    {actionLabel && onAction && (
      <Button className="w-4/5 h-11 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={onAction}>{actionLabel}</Button>
    )}
  </div>
);

export default EmptyStates;
