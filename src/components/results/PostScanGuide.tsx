import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import FeatureIcon, { type FeatureIconName } from '@/components/ui/FeatureIcon';
import type { BodyScanResult } from '@/lib/types';

interface PostScanGuideProps {
  result: BodyScanResult;
  recommendedSize: string;
  onDismiss: () => void;
}

const STEPS: { key: string; featureIcon: FeatureIconName; title: string; desc: string; cta: string; route: string; event: string }[] = [
  {
    key: 'tryon',
    featureIcon: 'tryon',
    title: 'See it on you',
    desc: 'Try-on clothes virtually with your exact measurements',
    cta: 'Start Try-On',
    route: '/tryon',
    event: 'postscan_tryon_click',
  },
  {
    key: 'shop',
    featureIcon: 'sizeguide',
    title: 'Shop your size',
    desc: 'Browse items that fit — matched to your body profile',
    cta: 'Find My Size',
    route: '/size-guide',
    event: 'postscan_shop_click',
  },
  {
    key: 'fitcheck',
    featureIcon: 'stylecheck',
    title: 'Get a Style Check',
    desc: 'Post a look and get honest feedback before buying',
    cta: 'Go to Style Check',
    route: '/style-check',
    event: 'postscan_fitcheck_click',
  },
];

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

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
    if (step < STEPS.length - 1) setStep(step + 1);
    else onDismiss();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="rounded-xl p-4 mt-4 relative overflow-hidden"
      style={{
        background: 'hsl(0 0% 0% / 0.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '0.5px solid hsl(45 88% 50% / 0.3)',
        boxShadow: '0 0 20px 2px hsl(45 88% 50% / 0.06), inset 0 1px 0 0 hsl(0 0% 100% / 0.04)',
      }}
    >
      {/* Background shimmer */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 h-[100px] w-[100px] rounded-full bg-primary/5 blur-[60px]" />
      </div>

      {/* Close */}
      <button onClick={onDismiss} className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors p-1 z-10">
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress dots */}
      <motion.div className="flex gap-1 mb-3" variants={staggerItem} custom={0} initial="hidden" animate="visible">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1 rounded-full flex-1 transition-colors duration-300 ${i <= step ? 'gradient-drip' : 'bg-border'}`} />
        ))}
      </motion.div>

      {/* Header */}
      <motion.p variants={staggerItem} custom={0} initial="hidden" animate="visible" className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">
        What's next? · {step + 1} of {STEPS.length}
      </motion.p>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          {/* Icon + text staggered */}
          <motion.div className="flex items-start gap-3 mb-3" variants={staggerItem} custom={1} initial="hidden" animate="visible">
            <FeatureIcon name={current.featureIcon} size={40} />
            <div className="flex-1">
              <h3 className="font-display text-[16px] font-bold text-foreground">{current.title}</h3>
              <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">{current.desc}</p>
            </div>
          </motion.div>

          {/* Size badge */}
          <motion.div variants={staggerItem} custom={2} initial="hidden" animate="visible"
            className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3"
            style={{ background: 'hsl(45 88% 50% / 0.06)', border: '0.5px solid hsl(45 88% 50% / 0.15)' }}
          >
            <span className="text-[10px] text-muted-foreground">Your size:</span>
            <span className="text-[13px] font-bold gradient-drip-text">{recommendedSize}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">Ready to use</span>
          </motion.div>

          {/* Buttons staggered */}
          <motion.div className="flex gap-2" variants={staggerItem} custom={3} initial="hidden" animate="visible">
            <motion.div className="flex-1" whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleAction}
                className="w-full h-10 rounded-xl btn-luxury text-primary-foreground font-display font-bold text-[12px] uppercase tracking-wider"
              >
                {current.cta}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </motion.div>
            <Button variant="ghost" onClick={handleSkip} className="h-10 px-3 text-[11px] text-muted-foreground font-semibold">
              {step < STEPS.length - 1 ? 'Next' : 'Done'}
            </Button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default PostScanGuide;
