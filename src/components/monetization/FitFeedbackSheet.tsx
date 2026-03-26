import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';


interface FitFeedbackSheetProps {
  retailer: string;
  recommendedSize: string;
  onComplete?: () => void;
}

type Outcome = 'tight' | 'perfect' | 'loose';

const OUTCOMES: { key: Outcome; label: string; icon: typeof ThumbsUp }[] = [
  { key: 'tight', label: 'Tight', icon: ThumbsDown },
  { key: 'perfect', label: 'Perfect', icon: ThumbsUp },
  { key: 'loose', label: 'Loose', icon: Minus },
];

const FitFeedbackSheet = ({ retailer, recommendedSize, onComplete }: FitFeedbackSheetProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [sizeWorn, setSizeWorn] = useState(recommendedSize);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!outcome) return;
    try {
      if (!user) { toast({ title: 'Sign in to submit feedback' }); return; }
      await supabase.from('fit_feedback').insert({
        user_id: user.id,
        session_id: null,
        retailer,
        size_worn: sizeWorn,
        recommended_size: recommendedSize,
        outcome,
      });
      setSubmitted(true);
      trackEvent('fit_feedback_submitted', { retailer, outcome });
      toast({ title: 'Thanks for your feedback!', description: 'This helps us improve future recommendations.' });

      // Fire-and-forget: process feedback for size engine improvement
      supabase.functions.invoke('process-fit-feedback', {
        body: { retailer },
      }).catch(() => {});

      onComplete?.();
    } catch {
      toast({ title: 'Could not save feedback', variant: 'destructive' });
    }
  };

  if (submitted) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
        <Check className="h-5 w-5 text-primary mx-auto mb-1" />
        <p className="text-[12px] font-bold text-primary">Feedback recorded</p>
        <p className="text-[10px] text-muted-foreground">We'll use this to improve your recommendations.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
      <p className="text-[12px] font-bold text-foreground">Did it fit?</p>
      <p className="text-[10px] text-muted-foreground">Report your fit outcome for <span className="font-semibold text-foreground">{retailer}</span></p>

      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px] text-muted-foreground shrink-0">Size worn:</span>
        <Input
          value={sizeWorn}
          onChange={e => setSizeWorn(e.target.value)}
          className="h-7 rounded-md text-[11px] w-20"
        />
      </div>

      <div className="flex gap-1.5">
        {OUTCOMES.map(o => (
          <button
            key={o.key}
            onClick={() => setOutcome(o.key)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all active:scale-95 flex flex-col items-center gap-1 ${
              outcome === o.key
                ? 'btn-gold-3d border-transparent text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            <o.icon className="h-4 w-4" />
            {o.label}
          </button>
        ))}
      </div>

      <Button
        className="w-full h-9 rounded-lg btn-luxury text-primary-foreground text-[11px] font-bold"
        onClick={handleSubmit}
        disabled={!outcome}
      >
        Submit Feedback
      </Button>
    </div>
  );
};

export default FitFeedbackSheet;
