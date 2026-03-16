import { useState, useEffect, useRef } from 'react';
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
  fitPreference?: string;
}

const confidenceConfig: Record<Confidence, { icon: typeof Shield; label: string; class: string }> = {
  high: { icon: ShieldCheck, label: 'High confidence', class: 'bg-primary/15 text-primary border border-primary/20' },
  medium: { icon: Shield, label: 'Medium confidence', class: 'bg-accent/15 text-accent-foreground border border-accent/20' },
  low: { icon: ShieldAlert, label: 'Low confidence', class: 'bg-destructive/15 text-destructive border border-destructive/20' },
};

const fitLabels: Record<string, string> = { fitted: 'Fitted', regular: 'Regular', relaxed: 'Relaxed' };

/* Number-scramble hook: cycles through random characters then locks */
function useSizeScramble(finalValue: string, durationMs = 800) {
  const [display, setDisplay] = useState('');
  const [locked, setLocked] = useState(false);
  const chars = 'XSMLQ0123456789';

  useEffect(() => {
    setLocked(false);
    const len = finalValue.length || 1;
    const interval = setInterval(() => {
      let s = '';
      for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
      setDisplay(s);
    }, 50);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setDisplay(finalValue);
      setLocked(true);
    }, durationMs);

    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [finalValue]);

  return { display, locked };
}

const SizeHero = ({ retailer, category, recommendedSize, confidence, whyLine, fitPreference }: SizeHeroProps) => {
  const [showSheet, setShowSheet] = useState(false);
  const conf = confidenceConfig[confidence];
  const Icon = conf.icon;
  const { display, locked } = useSizeScramble(recommendedSize, 800);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-4">
        {/* Glass HUD container */}
        <div
          className="rounded-2xl px-5 py-5 mx-auto max-w-[340px]"
          style={{
            background: 'hsl(0 0% 0% / 0.45)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '0.5px solid hsl(45 88% 50% / 0.3)',
            boxShadow: '0 0 30px 4px hsl(45 88% 50% / 0.08), inset 0 1px 0 0 hsl(0 0% 100% / 0.05)',
          }}
        >
          <h1 className="text-lg font-bold text-foreground mb-0.5">Your Best Size</h1>
          {fitPreference && <p className="text-[12px] text-primary font-semibold mb-0.5">Recommended for {fitLabels[fitPreference] || fitPreference} fit</p>}
          {retailer && category && <p className="text-[11px] text-muted-foreground mb-3">{retailer} · {category}</p>}
          {!retailer && !category && !fitPreference && <div className="mb-3" />}

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="inline-flex flex-col items-center"
          >
            <motion.div
              className="w-24 h-24 rounded-full badge-gold-3d shimmer-sweep flex items-center justify-center mb-2.5"
              animate={locked ? { scale: [1, 1.08, 1], filter: ['brightness(1)', 'brightness(1.4)', 'brightness(1)'] } : {}}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className={`text-4xl font-bold text-primary-foreground transition-all duration-200 ${!locked ? 'opacity-70 blur-[0.5px]' : 'opacity-100'}`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {display}
              </span>
            </motion.div>
            <button
              onClick={() => setShowSheet(true)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold ${conf.class} active:scale-95 transition-transform`}
            >
              <Icon className="h-3 w-3" />
              <span>{conf.label}</span>
              <Info className="h-3 w-3 text-primary opacity-80" />
            </button>
          </motion.div>

          {whyLine && <p className="text-[11px] text-muted-foreground mt-2.5 max-w-[260px] mx-auto leading-relaxed">{whyLine}</p>}
        </div>
      </motion.div>

      <ConfidenceSheet open={showSheet} onOpenChange={setShowSheet} confidence={confidence} />
    </>
  );
};

export default SizeHero;
