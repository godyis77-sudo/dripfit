import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import InlineCrown from '@/components/ui/InlineCrown';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';

interface UpgradePromptProps {
  headline: string;
  description: string;
  className?: string;
}

const UpgradePrompt = ({ headline, description, className = '' }: UpgradePromptProps) => {
  const navigate = useNavigate();

  return (
    <div className={`bg-card border border-primary/20 rounded-xl p-3 ${className}`}>
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 badge-gold-3d shimmer-sweep rounded-lg shrink-0 flex items-center justify-center">
          <InlineCrown size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-foreground">{headline}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
          <Button
            className="mt-2 h-8 rounded-lg text-[10px] font-bold btn-luxury text-primary-foreground px-4"
            onClick={() => {
              trackEvent('premium_viewed');
              navigate('/premium');
            }}
          >
            <Sparkles className="mr-1 h-3 w-3" /> Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;
