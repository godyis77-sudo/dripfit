import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import type { Confidence } from '@/lib/types';
import ConfidenceSheet from './ConfidenceSheet';

interface SizeHeroProps {
  retailer?: string;
  category?: string;
  recommendedSize: string;
  confidence: Confidence;
  whyLine?: string;
}

const confidenceConfig: Record<Confidence, { icon: typeof Shield; label: string; class: string }> = {
  high: { icon: ShieldCheck, label: 'High confidence', class: 'bg-primary/15 text-primary border border-primary/20' },
  medium: { icon: Shield, label: 'Medium confidence', class: 'bg-accent/15 text-accent-foreground border border-accent/20' },
  low: { icon: ShieldAlert, label: 'Low confidence', class: 'bg-destructive/15 text-destructive border border-destructive/20' },
};

const SizeHero = ({ retailer, category, recommendedSize, confidence, whyLine }: SizeHeroProps) => {
  const [showSheet, setShowSheet] = useState(false);
  const conf = confidenceConfig[confidence];
  const Icon = conf.icon;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-5">
        <h1 className="text-base font-bold text-foreground mb-0.5">Your Best Size</h1>
        {retailer && category && <p className="text-[11px] text-muted-foreground mb-3">{retailer} · {category}</p>}

        <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200 }} className="inline-flex flex-col items-center">
          <div className="w-24 h-24 rounded-full border-2 border-primary/30 bg-primary/5 flex items-center justify-center glow-primary mb-2.5">
            <span className="text-4xl font-bold gradient-drip-text">{recommendedSize}</span>
          </div>
          <button
            onClick={() => setShowSheet(true)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold ${conf.class} active:scale-95 transition-transform`}
          >
            <Icon className="h-3 w-3" />
            <span>{conf.label}</span>
            <Info className="h-2.5 w-2.5 opacity-50" />
          </button>
        </motion.div>

        {whyLine && <p className="text-[11px] text-muted-foreground mt-2.5 max-w-[260px] mx-auto leading-relaxed">{whyLine}</p>}
      </motion.div>

      <ConfidenceSheet open={showSheet} onOpenChange={setShowSheet} confidence={confidence} />
    </>
  );
};

export default SizeHero;
