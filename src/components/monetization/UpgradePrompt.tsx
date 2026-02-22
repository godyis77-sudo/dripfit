import { Button } from '@/components/ui/button';
import { Crown, Sparkles } from 'lucide-react';
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
        <div className="h-8 w-8 rounded-lg gradient-drip flex items-center justify-center shrink-0">
          <Crown className="h-4 w-4 text-primary-foreground" />
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
