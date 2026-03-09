import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import bodySilhouette from '@/assets/body-silhouette-clean.png';

interface Props {
  scanLineY: number;
  revealedKeys: string[];
  realData: any;
  revealedCount: number;
  totalCount: number;
  scanComplete?: boolean;
}

const MEASUREMENT_POSITIONS: Record<string, { top: string; side: string; align: string }> = {
  height:   { top: '8%',  side: 'left: 4%',  align: 'left' },
  shoulder: { top: '20%', side: 'right: 4%', align: 'right' },
  chest:    { top: '26%', side: 'left: 4%',  align: 'left' },
  bust:     { top: '30%', side: 'right: 4%', align: 'right' },
  sleeve:   { top: '36%', side: 'left: 4%',  align: 'left' },
  waist:    { top: '42%', side: 'right: 4%', align: 'right' },
  hips:     { top: '49%', side: 'right: 4%', align: 'right' },
  inseam:   { top: '65%', side: 'left: 4%',  align: 'left' },
};

// Floating gold particles — more of them for 30s
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${6 + Math.random() * 88}%`,
  delay: Math.random() * 6,
  duration: 4 + Math.random() * 5,
  size: 1.5 + Math.random() * 3,
}));

// Secondary ambient particles — tiny sparkles
const SPARKLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  left: `${10 + Math.random() * 80}%`,
  top: `${10 + Math.random() * 80}%`,
  delay: Math.random() * 8,
  duration: 2 + Math.random() * 3,
}));

const PremiumScanAnimation = ({ scanLineY, revealedKeys, realData, revealedCount, totalCount, scanComplete = false }: Props) => {
  const [flashKey, setFlashKey] = useState(0);
  const prevCount = useRef(0);

  // Trigger flash on each new measurement
  useEffect(() => {
    if (revealedCount > prevCount.current) {
      setFlashKey(k => k + 1);
      prevCount.current = revealedCount;
    }
  }, [revealedCount]);

  const progressPct = totalCount > 0 ? (revealedCount / totalCount) * 100 : 0;
  const brightnessRamp = 0.55 + revealedCount * 0.07;
  const glowIntensity = 30 + revealedCount * 8;

  return (
    <div
      className="relative w-full max-w-[380px] mx-auto rounded-2xl overflow-hidden mb-6"
      style={{
        boxShadow: `0 0 ${glowIntensity}px ${6 + revealedCount * 3}px hsl(45 88% 50% / ${0.2 + revealedCount * 0.04}), 0 0 ${glowIntensity * 2}px ${glowIntensity / 2}px hsl(45 88% 50% / 0.1), inset 0 0 30px 5px hsl(45 88% 50% / 0.05)`,
        border: '1px solid hsl(45 88% 50% / 0.15)',
      }}
    >
      {/* Base image with progressive brightness */}
      <motion.img
        src={bodySilhouette}
        className="w-full h-auto block"
        alt="body scan"
        animate={{
          filter: scanComplete
            ? 'brightness(1.35) saturate(1.3) contrast(1.05)'
            : `brightness(${brightnessRamp}) saturate(${0.8 + revealedCount * 0.04})`,
        }}
        transition={{ duration: scanComplete ? 1 : 0.8 }}
      />

      {/* Dark overlay — fades gradually */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'hsl(var(--background))' }}
        animate={{ opacity: Math.max(0.15, 0.55 - revealedCount * 0.05) }}
        transition={{ duration: 0.8 }}
      />

      {/* Ambient pulsing glow on silhouette */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, hsl(45 88% 50% / 0.15) 0%, transparent 60%)',
        }}
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary warm ambient — lower glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 75%, hsl(35 80% 45% / 0.08) 0%, transparent 55%)',
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />

      {/* Primary scan line — vibrant laser with enhanced glow */}
      <motion.div
        className="absolute inset-x-0 pointer-events-none z-10"
        style={{
          top: `${scanLineY}%`,
          height: '1px',
          background: 'linear-gradient(to right, transparent 0%, hsl(45 90% 55%) 10%, hsl(45 95% 70%) 50%, hsl(45 90% 55%) 90%, transparent 100%)',
          boxShadow: '0 0 6px 3px hsl(45 88% 50% / 0.95), 0 0 16px 6px hsl(45 88% 50% / 0.5), 0 0 40px 12px hsl(45 88% 50% / 0.2)',
        }}
        animate={{ opacity: scanComplete ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Scan line halo — soft wide glow band */}
      <div
        className="absolute inset-x-0 pointer-events-none z-[9] transition-all duration-100"
        style={{
          top: `${Math.max(0, scanLineY - 3)}%`,
          height: '6%',
          background: `linear-gradient(to bottom, transparent, hsl(45 88% 50% / 0.12), transparent)`,
          opacity: scanComplete ? 0 : 0.8,
        }}
      />

      {/* Trailing echo line */}
      <div
        className="absolute inset-x-0 pointer-events-none z-[8]"
        style={{
          top: `${Math.max(0, scanLineY - 1.5)}%`,
          height: '1px',
          background: 'linear-gradient(to right, transparent 12%, hsl(45 88% 50% / 0.3) 35%, hsl(45 88% 50% / 0.3) 65%, transparent 88%)',
          boxShadow: '0 0 4px 1px hsl(45 88% 50% / 0.2)',
          opacity: scanComplete ? 0 : 1,
        }}
      />

      {/* Wake trail — gold glow above scan line */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none transition-all duration-150 z-[7]"
        style={{
          height: `${scanLineY}%`,
          background: 'linear-gradient(to bottom, hsl(45 88% 50% / 0.04), hsl(45 88% 50% / 0.08), hsl(45 88% 50% / 0.02))',
          opacity: scanComplete ? 0 : 1,
        }}
      />

      {/* Horizontal grid lines — subtle tech feel */}
      {[12, 24, 36, 48, 60, 72, 84].map(y => (
        <motion.div
          key={y}
          className="absolute inset-x-0 pointer-events-none"
          style={{
            top: `${y}%`,
            height: '1px',
            background: `hsl(45 88% 50% / ${scanLineY > y ? 0.1 : 0.02})`,
          }}
          animate={{ opacity: scanLineY > y ? 1 : 0.3 }}
          transition={{ duration: 0.4 }}
        />
      ))}

      {/* Sparkle particles — tiny twinkling dots */}
      {SPARKLES.map(s => (
        <motion.div
          key={`sparkle-${s.id}`}
          className="absolute rounded-full pointer-events-none z-[11]"
          style={{
            left: s.left,
            top: s.top,
            width: 2,
            height: 2,
            background: 'hsl(45 88% 75%)',
          }}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Floating gold particles — rising */}
      {PARTICLES.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none z-[11]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: 'hsl(45 88% 60%)',
            boxShadow: `0 0 ${p.size * 2.5}px ${p.size}px hsl(45 88% 50% / 0.5)`,
          }}
          animate={{
            top: ['105%', '-5%'],
            opacity: [0, 0.7, 0.7, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Flash burst on measurement reveal */}
      <AnimatePresence>
        {flashKey > 0 && (
          <motion.div
            key={flashKey}
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, hsl(45 90% 65% / 0.45) 0%, hsl(45 88% 50% / 0.15) 35%, transparent 65%)',
            }}
            initial={{ opacity: 1, scale: 0.98 }}
            animate={{ opacity: 0, scale: 1.02 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Corner targeting brackets — with staggered pulse */}
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
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 8px 2px hsl(45 88% 50% / 0.25)' }}
        />
      ))}

      {/* Measurement labels */}
      {revealedKeys.map((key) => {
        const pos = MEASUREMENT_POSITIONS[key];
        if (!pos) return null;
        const val = realData?.[key];
        const sideKey = pos.side.split(':')[0].trim();
        const sideVal = pos.side.split(': ')[1]?.trim();
        return (
          <motion.div
            key={key}
            className="absolute pointer-events-none z-[15]"
            style={{ top: pos.top, [sideKey]: sideVal }}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Connecting line dot */}
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 4,
                height: 4,
                background: 'hsl(45 88% 55%)',
                boxShadow: '0 0 6px 2px hsl(45 88% 50% / 0.6)',
                top: '50%',
                [pos.align === 'left' ? 'right' : 'left']: -6,
                transform: 'translateY(-50%)',
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <div
              className="backdrop-blur-md rounded-md px-2 py-1"
              style={{
                textAlign: pos.align as 'left' | 'right',
                background: 'hsl(var(--background) / 0.6)',
                border: '1px solid hsl(45 88% 50% / 0.3)',
                boxShadow: '0 2px 8px hsl(0 0% 0% / 0.3), inset 0 0 12px hsl(45 88% 50% / 0.05)',
              }}
            >
              <p
                className="text-[9px] font-bold tracking-[0.15em] uppercase"
                style={{ color: 'hsl(45 88% 60%)' }}
              >
                {key}
              </p>
              {val && (
                <motion.p
                  className="text-[11px] font-black text-foreground leading-tight"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  {val.min?.toFixed(0)}–{val.max?.toFixed(0)} cm
                </motion.p>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Completion sequence */}
      <AnimatePresence>
        {scanComplete && (
          <>
            {/* Initial bright flash */}
            <motion.div
              className="absolute inset-0 pointer-events-none z-30"
              style={{ background: 'hsl(45 90% 75%)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.95, 0] }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />

            {/* Sustained gold illumination */}
            <motion.div
              className="absolute inset-0 pointer-events-none z-25"
              style={{
                background: 'radial-gradient(ellipse at 50% 40%, hsl(45 90% 55% / 0.55) 0%, hsl(45 88% 50% / 0.2) 45%, transparent 75%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.55, 1, 0.7] }}
              transition={{ duration: 2.5, ease: 'easeInOut', times: [0, 0.12, 0.4, 0.65, 1] }}
            />

            {/* Gold ring burst with rounded corners */}
            <motion.div
              className="absolute inset-0 pointer-events-none z-25"
              style={{
                border: '2px solid hsl(45 90% 55%)',
                borderRadius: '1rem',
                boxShadow: 'inset 0 0 50px 12px hsl(45 88% 50% / 0.35), 0 0 70px 20px hsl(45 88% 50% / 0.45)',
              }}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: [0, 1, 0.5, 1], scale: [0.94, 1.03, 0.98, 1] }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
            />

            {/* Subtle radial rays */}
            <motion.div
              className="absolute inset-0 pointer-events-none z-24"
              style={{
                background: 'conic-gradient(from 0deg, transparent 0%, hsl(45 88% 50% / 0.08) 5%, transparent 10%, hsl(45 88% 50% / 0.06) 15%, transparent 20%, hsl(45 88% 50% / 0.08) 25%, transparent 30%, hsl(45 88% 50% / 0.06) 35%, transparent 40%, hsl(45 88% 50% / 0.08) 45%, transparent 50%, hsl(45 88% 50% / 0.06) 55%, transparent 60%, hsl(45 88% 50% / 0.08) 65%, transparent 70%, hsl(45 88% 50% / 0.06) 75%, transparent 80%, hsl(45 88% 50% / 0.08) 85%, transparent 90%, hsl(45 88% 50% / 0.06) 95%, transparent 100%)',
              }}
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: [0, 0.7, 0.4], rotate: 25 }}
              transition={{ duration: 3, ease: 'easeOut' }}
            />

            {/* "SCAN COMPLETE" text overlay */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 1], scale: [0.8, 1.05, 1] }}
              transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="px-6 py-3 rounded-xl backdrop-blur-lg"
                style={{
                  background: 'hsl(var(--background) / 0.7)',
                  border: '1px solid hsl(45 88% 50% / 0.4)',
                  boxShadow: '0 0 40px 10px hsl(45 88% 50% / 0.3)',
                }}
              >
                <p
                  className="text-sm font-black tracking-[0.2em] uppercase"
                  style={{ color: 'hsl(45 88% 60%)' }}
                >
                  Scan Complete
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom progress glow bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] z-20">
        <motion.div
          className="h-full"
          style={{
            background: 'linear-gradient(90deg, hsl(45 88% 45%), hsl(45 95% 60%), hsl(45 88% 45%))',
            boxShadow: '0 0 12px 4px hsl(45 88% 50% / 0.7)',
          }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default PremiumScanAnimation;
