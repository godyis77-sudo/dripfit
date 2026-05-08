import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import bodyScan from '@/assets/body-silhouette-scan.webp';
import bodyMapped from '@/assets/body-silhouette-mapped.webp';
const bodySilhouette = bodyScan;
import NeuralDataValue from './NeuralDataValue';
import WireframeMesh from './WireframeMesh';

type MeasurementValue = number | { min: number; max: number } | null;

interface MeasurementData {
  height?: MeasurementValue;
  heightCm?: number;
  shoulder?: MeasurementValue;
  chest?: MeasurementValue;
  bust?: MeasurementValue;
  sleeve?: MeasurementValue;
  waist?: MeasurementValue;
  hips?: MeasurementValue;
  inseam?: MeasurementValue;
  [key: string]: MeasurementValue | undefined;
}

interface Props {
  scanLineY: number;
  revealedKeys: string[];
  realData: MeasurementData | null;
  revealedCount: number;
  totalCount: number;
  scanComplete?: boolean;
  useCm?: boolean;
}

// Sleeve moved to right side at top:38% to avoid stacking with chest (top:26% left)
const MEASUREMENT_POSITIONS: Record<string, { top: string; topPct: number; side: string; align: string }> = {
  height:   { top: '8%',  topPct: 8,  side: 'left: 4%',  align: 'left' },
  shoulder: { top: '20%', topPct: 20, side: 'right: 4%', align: 'right' },
  chest:    { top: '26%', topPct: 26, side: 'left: 4%',  align: 'left' },
  bust:     { top: '32%', topPct: 32, side: 'left: 4%',  align: 'left' },
  sleeve:   { top: '38%', topPct: 38, side: 'right: 4%', align: 'right' },
  waist:    { top: '45%', topPct: 45, side: 'left: 4%',  align: 'left' },
  hips:     { top: '52%', topPct: 52, side: 'right: 4%', align: 'right' },
  inseam:   { top: '68%', topPct: 68, side: 'left: 4%',  align: 'left' },
};

/* Reduced 16 → 10 to keep mid-scan animated DOM under 40 */
const HARVEST_PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const topPct = 5 + Math.random() * 88;
  const leftPct = 20 + Math.random() * 60;
  const positions = Object.values(MEASUREMENT_POSITIONS);
  let nearest = positions[0];
  let minDist = Infinity;
  for (const p of positions) {
    const d = Math.abs(p.topPct - topPct);
    if (d < minDist) { minDist = d; nearest = p; }
  }
  const targetLeft = nearest.align === 'left' ? 8 : 88;
  return {
    id: i,
    topPct,
    left: leftPct,
    targetTop: nearest.topPct,
    targetLeft,
    size: 1.5 + Math.random() * 2.5,
    burstDx: (Math.random() - 0.5) * 30,
    burstDy: (Math.random() - 0.5) * 15,
  };
});

/* Reduced from 14 → 8 */
const SPARKLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  left: `${10 + Math.random() * 80}%`,
  top: `${10 + Math.random() * 80}%`,
  delay: Math.random() * 8,
  duration: 2 + Math.random() * 3,
}));

const luxuryEase = [0.16, 1, 0.3, 1] as const;

const PremiumScanAnimation = ({ scanLineY, revealedKeys, realData, revealedCount, totalCount, scanComplete = false, useCm = true }: Props) => {
  const [flashKey, setFlashKey] = useState(0);
  const [completionFlash, setCompletionFlash] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const prevCount = useRef(0);

  useEffect(() => {
    if (scanComplete) return;
    const interval = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(interval);
  }, [scanComplete]);

  useEffect(() => {
    if (revealedCount > prevCount.current) {
      setFlashKey(k => k + 1);
      prevCount.current = revealedCount;
    }
  }, [revealedCount]);

  useEffect(() => {
    if (scanComplete) {
      setCompletionFlash(true);
      const t = setTimeout(() => setCompletionFlash(false), 200);
      return () => clearTimeout(t);
    }
  }, [scanComplete]);

  const progressPct = totalCount > 0 ? (revealedCount / totalCount) * 100 : 0;
  const brightnessRamp = 0.55 + revealedCount * 0.07;
  const glowIntensity = 30 + revealedCount * 8;

  const rimMask = useMemo(() => {
    const center = scanLineY;
    const range = 12;
    return `linear-gradient(to bottom, transparent ${Math.max(0, center - range)}%, rgba(255,255,255,0.9) ${Math.max(0, center - 3)}%, white ${center}%, rgba(255,255,255,0.9) ${Math.min(100, center + 3)}%, transparent ${Math.min(100, center + range)}%)`;
  }, [scanLineY]);

  return (
    <div
      className="relative w-full max-w-[380px] mx-auto rounded-2xl overflow-hidden mb-6 bg-background"
      style={{
        backgroundColor: 'hsl(var(--background))',
        boxShadow: `0 0 ${glowIntensity}px ${6 + revealedCount * 3}px hsl(var(--primary) / ${0.2 + revealedCount * 0.04}), 0 0 ${glowIntensity * 2}px ${glowIntensity / 2}px hsl(var(--primary) / 0.1), inset 0 0 30px 5px hsl(var(--primary) / 0.05)`,
        border: '1px solid hsl(var(--primary) / 0.15)',
        filter: completionFlash ? 'saturate(200%) contrast(120%)' : 'none',
        transition: 'filter 0.15s ease-out',
      }}
    >
      {/* Hidden sizing image */}
      <img
        src={bodySilhouette}
        className="w-full h-auto block invisible"
        alt=""
        aria-hidden
      />

      {/* Rim-light masked silhouette with luminous gold edge-glow */}
      <motion.div
        className="absolute inset-0 z-[3]"
        style={{
          maskImage: scanComplete ? 'none' : rimMask,
          WebkitMaskImage: scanComplete ? 'none' : rimMask,
        }}
        animate={{
          filter: scanComplete
            ? 'brightness(1.35) saturate(1.3) contrast(1.05) drop-shadow(0 0 8px hsl(var(--primary) / 0.9)) drop-shadow(0 0 20px hsl(var(--primary) / 0.5))'
            : `brightness(${brightnessRamp + 0.3}) saturate(1.2) drop-shadow(0 0 4px hsl(var(--primary) / 0.7)) drop-shadow(0 0 15px hsl(var(--primary) / 0.4))`,
        }}
        transition={{ duration: scanComplete ? 1 : 0.15 }}
      >
        <img
          src={bodySilhouette}
          className="w-full h-auto block"
          alt="body scan"
        />
      </motion.div>

      {/* Dim base layer with edge glow */}
      <motion.div
        className="absolute inset-0 z-[2]"
        animate={{
          filter: scanComplete
            ? 'brightness(1.2) saturate(1.2) drop-shadow(0 0 6px hsl(var(--primary) / 0.6))'
            : `brightness(${brightnessRamp * 0.5}) saturate(0.6) drop-shadow(0 0 3px hsl(var(--primary) / 0.35))`,
        }}
        transition={{ duration: 0.8 }}
      >
        <img
          src={bodySilhouette}
          className="w-full h-auto block"
          alt=""
          aria-hidden
        />
      </motion.div>

      {/* Mapped silhouette overlay — cross-fades in on completion */}
      <motion.div
        className="absolute inset-0 z-[3] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: scanComplete ? 1 : 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{
          filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.6))',
        }}
      >
        <img src={bodyMapped} className="w-full h-auto block" alt="" aria-hidden />
      </motion.div>

      {/* Background fill — keep DARK throughout */}
      <motion.div
        className="absolute inset-0 z-[1] bg-background"
      />

      {/* Soft overlay during scan */}
      <motion.div
        className="absolute inset-0 z-[4] bg-background"
        animate={{ opacity: scanComplete ? 0 : Math.max(0.15, 0.4 - revealedCount * 0.04) }}
        transition={{ duration: 0.8 }}
      />

      {/* Ambient pulsing glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-[5]"
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, hsl(var(--primary) / 0.15) 0%, transparent 60%)',
        }}
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Primary scan line laser */}
      <motion.div
        className="absolute inset-x-0 pointer-events-none z-10"
        style={{
          top: `${scanLineY}%`,
          height: '1px',
          background: 'linear-gradient(to right, transparent 0%, hsl(var(--primary)) 10%, hsl(var(--primary) / 0.95) 50%, hsl(var(--primary)) 90%, transparent 100%)',
          boxShadow: '0 0 6px 3px hsl(var(--primary) / 0.95), 0 0 16px 6px hsl(var(--primary) / 0.5), 0 0 40px 12px hsl(var(--primary) / 0.2)',
        }}
        animate={{ opacity: scanComplete ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Wide scan halo above + below */}
      <div
        className="absolute inset-x-0 pointer-events-none z-[9] transition-all duration-100"
        style={{
          top: `${Math.max(0, scanLineY - 5)}%`,
          height: '10%',
          background: 'linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.18), transparent)',
          opacity: scanComplete ? 0 : 0.7,
        }}
      />

      {/* Trailing wake below scan line */}
      <div
        className="absolute inset-x-0 pointer-events-none transition-all duration-150 z-[7]"
        style={{
          top: `${scanLineY}%`,
          height: '10%',
          background: 'linear-gradient(to bottom, hsl(var(--primary) / 0.08), transparent)',
          opacity: scanComplete ? 0 : 1,
        }}
      />

      {/* Wake trail above */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none transition-all duration-150 z-[7]"
        style={{
          height: `${scanLineY}%`,
          background: 'linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.02), hsl(var(--primary) / 0.04))',
          opacity: scanComplete ? 0 : 1,
        }}
      />

      {/* Horizontal grid lines — every ~12% */}
      {[12, 24, 36, 48, 60, 72, 84].map(y => (
        <motion.div
          key={y}
          className="absolute inset-x-0 pointer-events-none z-[6]"
          style={{
            top: `${y}%`,
            height: '1px',
            background: `hsl(var(--primary) / ${scanLineY > y ? 0.1 : 0.03})`,
          }}
          animate={{ opacity: scanLineY > y ? 1 : 0.4 }}
          transition={{ duration: 0.4 }}
        />
      ))}

      {/* Sparkles */}
      {SPARKLES.map(s => (
        <motion.div
          key={`sparkle-${s.id}`}
          className="absolute rounded-full pointer-events-none z-[11] bg-primary"
          style={{ left: s.left, top: s.top, width: 2, height: 2 }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Harvest particles */}
      {HARVEST_PARTICLES.map(p => {
        const activated = scanLineY >= p.topPct;
        if (!activated) return null;
        return (
          <motion.div
            key={`hp-${p.id}`}
            className="absolute rounded-full pointer-events-none z-[12]"
            style={{ width: p.size, height: p.size }}
            initial={{
              left: `${p.left}%`,
              top: `${p.topPct}%`,
              opacity: 0,
              background: 'hsl(var(--primary) / 0.7)',
              boxShadow: '0 0 4px 1px hsl(var(--primary) / 0.4)',
            }}
            animate={{
              left: [`${p.left + p.burstDx * 0.3}%`, `${p.targetLeft}%`],
              top: [`${p.topPct + p.burstDy * 0.3}%`, `${p.targetTop}%`],
              opacity: [0, 0.9, 0.7, 0],
              boxShadow: [
                '0 0 4px 1px hsl(var(--primary) / 0.4)',
                '0 0 8px 3px hsl(var(--primary) / 0.7)',
                '0 0 2px 1px hsl(var(--primary) / 0.2)',
              ],
            }}
            transition={{
              duration: 0.8,
              ease: luxuryEase,
              times: [0, 0.2, 0.7, 1],
            }}
          />
        );
      })}

      {/* Flash burst on measurement reveal */}
      <AnimatePresence>
        {flashKey > 0 && (
          <motion.div
            key={flashKey}
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, hsl(var(--primary) / 0.45) 0%, hsl(var(--primary) / 0.15) 35%, transparent 65%)',
            }}
            initial={{ opacity: 1, scale: 0.98 }}
            animate={{ opacity: 0, scale: 1.02 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Corner targeting brackets */}
      {[
        ['top-3 left-3', 'border-t-2 border-l-2'],
        ['top-3 right-3', 'border-t-2 border-r-2'],
        ['bottom-3 left-3', 'border-b-2 border-l-2'],
        ['bottom-3 right-3', 'border-b-2 border-r-2'],
      ].map(([pos, border], i) => (
        <motion.div
          key={i}
          className={`absolute ${pos} ${border} border-primary w-7 h-7 rounded-sm`}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.25, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 8px 2px hsl(var(--primary) / 0.25)' }}
        />
      ))}

      {/* Editorial measurement labels */}
      {revealedKeys.map((key) => {
        const pos = MEASUREMENT_POSITIONS[key];
        if (!pos) return null;
        const val = realData?.[key];
        const sideKey = pos.side.split(':')[0].trim();
        const sideVal = pos.side.split(': ')[1]?.trim();
        const isHeight = key === 'height';
        return (
          <motion.div
            key={key}
            className="absolute pointer-events-none z-[15]"
            style={{ top: pos.top, [sideKey]: sideVal }}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: luxuryEase }}
          >
            {/* Connecting gold dot */}
            <motion.div
              className="absolute rounded-full bg-primary"
              style={{
                width: 4, height: 4,
                boxShadow: '0 0 6px 2px hsl(var(--primary) / 0.6)',
                top: '50%',
                [pos.align === 'left' ? 'right' : 'left']: -6,
                transform: 'translateY(-50%)',
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <div
              className="backdrop-blur-md rounded-md px-2 py-1"
              style={{
                textAlign: pos.align as 'left' | 'right',
                background: 'hsl(var(--background) / 0.6)',
                border: '1px solid hsl(var(--primary) / 0.3)',
                boxShadow: '0 2px 8px hsl(0 0% 0% / 0.3), inset 0 0 12px hsl(var(--primary) / 0.05)',
              }}
            >
              <p className="text-[7px] font-bold tracking-[0.15em] uppercase text-primary opacity-80">
                {key}
              </p>
              {val ? (
                <NeuralDataValue
                  value={isHeight ? (realData?.heightCm ?? (val as number)) : (val as number | { min: number; max: number })}
                  isHeight={isHeight}
                />
              ) : (
                <NeuralDataValue value={null} isHeight={isHeight} />
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Completion sequence */}
      <AnimatePresence>
        {scanComplete && (
          <>
            <WireframeMesh />

            {/* Brief bright flash (0.3s) */}
            <motion.div
              className="absolute inset-0 pointer-events-none z-30"
              style={{ background: 'hsl(var(--primary) / 0.85)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Subtle gold ring pulse expanding outward — body glows, not the bg */}
            <motion.div
              className="absolute inset-0 pointer-events-none z-[25]"
              style={{
                border: '1.5px solid hsl(var(--primary))',
                borderRadius: '1rem',
                boxShadow: '0 0 40px 8px hsl(var(--primary) / 0.35)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.95, 1.08, 1.15] }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
            />

            {/* Second softer ring pulse */}
            <motion.div
              className="absolute inset-0 pointer-events-none z-[25]"
              style={{
                border: '1px solid hsl(var(--primary) / 0.6)',
                borderRadius: '1rem',
              }}
              initial={{ opacity: 0, scale: 1 }}
              animate={{ opacity: [0, 0.6, 0], scale: [1, 1.18, 1.25] }}
              transition={{ duration: 1.6, ease: 'easeOut', delay: 0.5 }}
            />

            {/* "YOUR BODY. MAPPED." */}
            <motion.div
              className="absolute inset-x-0 bottom-10 flex flex-col items-center justify-center pointer-events-none z-30 gap-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: luxuryEase }}
            >
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-primary">
                Your Body.
              </p>
              <p className="font-display text-lg italic text-primary leading-none">
                Mapped.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom progress glow bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] z-20">
        <motion.div
          className="h-full bg-primary"
          style={{
            boxShadow: '0 0 12px 4px hsl(var(--primary) / 0.7)',
          }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Status row: neural mapping label + progress count */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-between px-4 z-20">
        <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
          Neural Mapping · {elapsed}s
        </span>
        <span className="font-mono text-[10px] tracking-[0.15em] text-primary">
          {revealedCount}/{totalCount}
        </span>
      </div>
    </div>
  );
};

export default PremiumScanAnimation;
