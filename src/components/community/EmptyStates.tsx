import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Flame, Users, Ruler, Search } from 'lucide-react';
import type { FilterType } from './community-types';

interface EmptyStateProps {
  filter: FilterType;
  hasScan: boolean;
  userId?: string;
  onPostLook: () => void;
}

const EmptyStates = ({ filter, hasScan, userId, onPostLook }: EmptyStateProps) => {
  const navigate = useNavigate();

  if (filter === 'trending') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-2xl badge-gold-3d shimmer-sweep mb-4 flex items-center justify-center">
          <Flame className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="text-[18px] font-bold text-foreground mb-1.5">Trending looks will appear here</h2>
        <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5">Post your first try-on and ask the community. The more votes a look gets, the higher it trends.</p>
        <Button className="w-4/5 h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={onPostLook}>Post a Look</Button>
      </div>
    );
  }

  if (filter === 'new') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-2xl badge-gold-3d shimmer-sweep mb-4 flex items-center justify-center">
          <Users className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="text-[18px] font-bold text-foreground mb-1.5">Be the first to post a look</h2>
        <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5">Get honest feedback from people with your body type.</p>
        <Button className="w-4/5 h-12 rounded-full text-sm font-bold btn-luxury text-primary-foreground" onClick={onPostLook}>Post a Look</Button>
      </div>
    );
  }

  if (filter === 'similar') {
    if (!hasScan) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-2xl badge-gold-3d shimmer-sweep mb-4 flex items-center justify-center">
            <Ruler className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-[18px] font-bold text-foreground mb-1.5">See looks from people with your body type</h2>
          <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5">Complete a quick body scan so we can show you try-ons from people with similar measurements.</p>
          <Button className="w-4/5 h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={() => navigate('/capture')}>Start Body Scan</Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-2xl badge-gold-3d shimmer-sweep mb-4 flex items-center justify-center">
          <Search className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="text-[18px] font-bold text-foreground mb-1.5">No similar fits yet</h2>
        <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5">We're matching looks to your measurements. As more people with similar measurements post, they'll appear here.</p>
        <Button className="w-4/5 h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={onPostLook}>Post Your Own Look</Button>
      </div>
    );
  }

  if (filter === 'following') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-2xl icon-3d-gold shimmer-sweep mb-4">
          <Users className="h-6 w-6 text-primary-foreground shimmer-icon" />
        </div>
        <h2 className="text-[18px] font-bold text-foreground mb-1.5">Your custom feed is empty</h2>
        <p className="text-[14px] text-muted-foreground max-w-[280px] mb-5">Follow people in the community to build a personalized feed of their looks and style checks.</p>
        <Button className="w-4/5 h-12 rounded-xl text-sm font-bold btn-luxury text-primary-foreground" onClick={() => {}}>Browse New Looks</Button>
      </div>
    );
  }

  return null;
};

export default EmptyStates;
