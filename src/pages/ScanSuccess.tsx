import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight } from 'lucide-react';
import scanResultsFull from '@/assets/scan-results-full.jpg';
import type { BodyScanResult, MeasurementRange } from '@/lib/types';

const CM_TO_IN = 0.3937;

interface AnimatedNumberProps {
  target: number;
  delay: number;
  suffix?: string;
}

const AnimatedNumber = ({ target, delay, suffix = '' }: AnimatedNumberProps) => {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    const duration = 400;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, target]);

  return <span>{started ? `${value}${suffix}` : '—'}</span>;
};

const fmtRange = (r: MeasurementRange) => ({
  min: Math.round(r.min * CM_TO_IN),
  max: Math.round(r.max * CM_TO_IN),
});

const ScanSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { result: BodyScanResult } | undefined;
  const result = state?.result;
  useEffect(() => {
    if (!result) {
      navigate('/capture', { replace: true });
    }
  }, [result, navigate]);

  if (!result) return null;

  const chest = fmtRange(result.chest);
  const waist = fmtRange(result.waist);
  const hips = fmtRange(result.hips);

  const METRICS = [
    { label: 'Chest', min: chest.min, max: chest.max, delay: 0 },
    { label: 'Waist', min: waist.min, max: waist.max, delay: 80 },
    { label: 'Hips', min: hips.min, max: hips.max, delay: 160 },
    { label: 'Height', value: `${result.heightCm}cm`, delay: 240 },
  ];

  const handleNavigate = (path: string) => {
    navigate(path, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 relative">
      {/* Skip button */}
      <button
        onClick={() => handleNavigate('/profile/body')}
        className="absolute top-5 right-5 text-[11px] text-muted-foreground font-medium z-10"
      >
        Skip →
      </button>

      {/* Silhouette */}
      <motion.img
        src={bodySilhouette}
        alt="Body silhouette"
        className="w-[280px] h-auto object-contain mb-6"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Title */}
      <motion.h1
        className="text-xl font-bold text-foreground mb-5 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Your measurements are in.
      </motion.h1>

      {/* 2×2 measurement grid */}
      <motion.div
        className="grid grid-cols-2 gap-3 w-full max-w-[260px] mb-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {METRICS.map((m) => (
          <div key={m.label} className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
              {m.label}
            </p>
            <p className="text-lg font-bold text-foreground leading-none">
              {m.value ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (m.delay / 1000) + 0.5 }}
                >
                  {m.value}
                </motion.span>
              ) : (
                <>
                  <AnimatedNumber target={m.min!} delay={m.delay + 500} />
                  –
                  <AnimatedNumber target={m.max!} delay={m.delay + 500} />
                </>
              )}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Fit Identity Updated badge */}
      <motion.div
        className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 mb-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        <Check className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold text-primary">Fit Identity Updated</span>
      </motion.div>

      {/* CTA */}
      <motion.div
        className="w-full max-w-[300px] space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3, duration: 0.4 }}
      >
        <Button
          className="w-full h-12 rounded-xl text-sm font-bold btn-luxury"
          onClick={() => handleNavigate('/profile/body')}
        >
          See My Sizes <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
        <button
          onClick={() => handleNavigate('/')}
          className="w-full text-center text-[11px] text-muted-foreground py-2"
        >
          Go Home
        </button>
      </motion.div>
    </div>
  );
};

export default ScanSuccess;
