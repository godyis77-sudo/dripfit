import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShoppingBag, Users, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import type { BodyScanResult } from '@/lib/types';

interface PostScanGuideProps {
  result: BodyScanResult;
  recommendedSize: string;
  onDismiss: () => void;
}

const STEPS = [
  {
    key: 'tryon',
    icon: Sparkles,
    title: 'See it on you',
    desc: 'Try on clothes virtually with your exact measurements',
    cta: 'Start Try-On',
    route: '/tryon',
    event: 'postscan_tryon_click' as const,
  },
  {
    key: 'shop',
    icon: ShoppingBag,
    title: 'Shop your size',
    desc: 'Browse items that fit — matched to your body profile',
    cta: 'Find My Size',
    route: '/size-guide',
    event: 'postscan_shop_click' as const,
  },
  {
    key: 'fitcheck',
    icon: Users,
    title: 'Get a Fit Check',
    desc: 'Post a look and get honest feedback before buying',
    cta: 'Go to Fit Check',
    route: '/community',
    event: 'postscan_fitcheck_click' as const,
  },
];

const PostScanGuide = ({ result, recommendedSize, onDismiss }: PostScanGuideProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const current = STEPS[step];

  const handleAction = () => {
    trackEvent(current.event as any);
    if (current.key === 'tryon') {
      navigate(current.route, { state: { bodyProfile: result } });
    } else {
      navigate(current.route);
    }
  };

  const handleSkip = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onDismiss();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-card border border-primary/20 rounded-xl p-4 mt-4 relative overflow-hidden"
    >
      {/* Background shimmer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 h-[100px] w-[100px] rounded-full bg-primary/5 blur-[60px]" />
      </div>

      {/* Close button */}
      <button
        onClick={onDismiss}
        className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors p-1"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress dots */}
      <div className="flex gap-1 mb-3">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full flex-1 transition-colors duration-300 ${
              i <= step ? 'gradient-drip' : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Header */}
      <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">
        What's next? · {step + 1} of {STEPS.length}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl gradient-drip flex items-center justify-center shrink-0 glow-primary">
              <current.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-[16px] font-bold text-foreground">{current.title}</h3>
              <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">{current.desc}</p>
            </div>
          </div>

          {/* Size badge */}
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 mb-3">
            <span className="text-[10px] text-muted-foreground">Your size:</span>
            <span className="text-[13px] font-bold gradient-drip-text">{recommendedSize}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">Ready to use</span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAction}
              className="flex-1 h-10 rounded-xl btn-luxury text-primary-foreground font-display font-bold text-[12px] uppercase tracking-wider active:scale-[0.97] transition-transform"
            >
              {current.cta}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="h-10 px-3 text-[11px] text-muted-foreground font-semibold"
            >
              {step < STEPS.length - 1 ? 'Next' : 'Done'}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default PostScanGuide;
