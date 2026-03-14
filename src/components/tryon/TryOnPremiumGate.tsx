import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Crown, X } from 'lucide-react';

interface TryOnPremiumGateProps {
  onClose: () => void;
}

const TryOnPremiumGate = ({ onClose }: TryOnPremiumGateProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 text-center relative"
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <div className="h-12 w-12 rounded-full icon-3d-gold shimmer-sweep mx-auto mb-3">
          <Crown className="h-6 w-6 text-primary-foreground shimmer-icon" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">You've used your free try-ons</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upgrade to Premium for unlimited try-ons, priority generation, and side-by-side comparison mode.
        </p>
        <Button
          className="w-full h-11 rounded-lg btn-luxury text-primary-foreground font-bold mb-2"
          onClick={() => { onClose(); navigate('/premium'); }}
        >
          <Crown className="mr-2 h-4 w-4" /> Upgrade to Premium
        </Button>
        <button onClick={onClose} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  );
};

export default TryOnPremiumGate;
