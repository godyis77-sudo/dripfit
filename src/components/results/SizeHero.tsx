import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { Confidence } from '@/lib/types';

interface SizeHeroProps {
  retailer?: string;
  category?: string;
  recommendedSize: string;
  confidence: Confidence;
  whyLine?: string;
}

const confidenceConfig: Record<Confidence, { icon: typeof Shield; label: string; class: string; dotClass: string }> = {
  high: { icon: ShieldCheck, label: 'High confidence', class: 'bg-primary/15 text-primary border border-primary/20', dotClass: 'bg-primary' },
  medium: { icon: Shield, label: 'Medium confidence', class: 'bg-accent/15 text-accent-foreground border border-accent/20', dotClass: 'bg-accent' },
  low: { icon: ShieldAlert, label: 'Low confidence', class: 'bg-destructive/15 text-destructive border border-destructive/20', dotClass: 'bg-destructive' },
};

const SizeHero = ({ retailer, category, recommendedSize, confidence, whyLine }: SizeHeroProps) => {
  const conf = confidenceConfig[confidence];
  const Icon = conf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center mb-6"
    >
      <h1 className="text-lg font-bold text-foreground mb-1 tracking-tight">Best Size for You</h1>
      {retailer && category && (
        <p className="text-xs font-medium text-muted-foreground mb-4">
          {retailer} • {category}
        </p>
      )}

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="relative inline-flex flex-col items-center"
      >
        <div className="w-28 h-28 rounded-full border-2 border-primary/30 bg-primary/5 flex items-center justify-center glow-primary mb-3">
          <span className="text-5xl font-bold gradient-drip-text">{recommendedSize}</span>
        </div>

        <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${conf.class}`}>
          <Icon className="h-3.5 w-3.5" />
          <span>{conf.label}</span>
        </div>
      </motion.div>

      {whyLine && (
        <p className="text-xs text-muted-foreground mt-3 max-w-[280px] mx-auto leading-relaxed">
          {whyLine}
        </p>
      )}
    </motion.div>
  );
};

export default SizeHero;
