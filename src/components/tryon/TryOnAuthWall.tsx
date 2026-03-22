import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GUEST_LIFETIME_LIMIT } from '@/lib/guestSession';

interface TryOnAuthWallProps {
  onClose: () => void;
  reason?: 'guest_limit' | 'daily_limit';
}

const TryOnAuthWall = ({ onClose, reason = 'guest_limit' }: TryOnAuthWallProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] rounded-2xl border border-primary/20 bg-card p-6 shadow-xl"
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl badge-gold-3d flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>

        {/* Title */}
        <h2 className="font-display text-lg font-bold text-foreground text-center mb-1">
          {reason === 'guest_limit'
            ? `You've used all ${GUEST_LIFETIME_LIMIT} free try-ons`
            : "You've hit today's limit"}
        </h2>

        <p className="text-[13px] text-muted-foreground text-center mb-5">
          {reason === 'guest_limit'
            ? 'Create a free account to get 5 try-ons per day — plus save your looks and get size recommendations.'
            : 'Upgrade to Premium for unlimited try-ons, or come back tomorrow for 5 more.'}
        </p>

        {/* Benefits */}
        <div className="space-y-2 mb-5">
          {[
            'Save & share your try-ons',
            '5 free try-ons per day',
            'AI size recommendations',
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-[12px] text-foreground">{benefit}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <Button
          onClick={() => navigate('/auth?returnTo=/tryon')}
          className="w-full h-12 rounded-xl btn-luxury text-primary-foreground font-display font-bold text-base uppercase tracking-wider active:scale-[0.97] transition-transform mb-2"
        >
          Sign Up Free <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        {reason === 'daily_limit' && (
          <Button
            variant="outline"
            onClick={() => navigate('/premium')}
            className="w-full h-10 rounded-xl text-[13px] font-semibold"
          >
            Go Unlimited with Premium
          </Button>
        )}

        <button
          onClick={onClose}
          className="w-full text-center text-[12px] text-muted-foreground font-medium mt-3 hover:text-foreground transition-colors"
        >
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  );
};

export default TryOnAuthWall;
