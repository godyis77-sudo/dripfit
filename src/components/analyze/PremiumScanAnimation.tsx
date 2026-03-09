import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import scanResultsFull from '@/assets/scan-results-full.jpg';

interface Props {
  scanLineY: number;
  revealedKeys: string[];
  realData: any;
  revealedCount: number;
  totalCount: number;
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

// Floating gold particles
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${8 + Math.random() * 84}%`,
  delay: Math.random() * 4,
  duration: 3 + Math.random() * 3,
  size: 2 + Math.random() * 3,
}));

const PremiumScanAnimation = ({ scanLineY, revealedKeys, realData, revealedCount, totalCount }: Props) => {
  const [flashKey, setFlashKey] = useState(0);
  const prevCount = useRef(0);

  // Trigger flash on each new measurement
  useEffect(() => {
    if (revealedCount > prevCount.current) {
      setFlashKey(k => k + 1);
      prevCount.current = revealedCount;
    }
  }, [revealedCount]);

  return (
    <div
      className="relative w-full max-w-[380px] mx-auto rounded-xl overflow-hidden mb-6"
      style={{
        boxShadow: `0 0 ${40 + revealedCount * 6}px ${8 + revealedCount * 2}px hsl(45 88% 50% / ${0.25 + revealedCount * 0.04}), 0 0 80px 20px hsl(45 88% 50% / 0.15)`,
      }}
    >
      {/* Base image with brightness ramp */}
      <motion.img
        src={scanResultsFull}
        className="w-full h-auto block"
        alt="body scan"
        animate={{ filter: `brightness(${0.7 + revealedCount * 0.05})` }}
        transition={{ duration: 0.6 }}
      />

      {/* Dark overlay — fades as scan progresses */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'hsl(var(--background))' }}
        animate={{ opacity: 0.5 - revealedCount * 0.04 }}
        transition={{ duration: 0.6 }}
      />

      {/* Ambient pulsing glow on silhouette */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 45%, hsl(45 88% 50% / 0.12) 0%, transparent 65%)',
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Primary scan line — thick vibrant laser */}
      <div
        className="absolute inset-x-0 pointer-events-none z-10"
        style={{
          top: `${scanLineY}%`,
          height: '3px',
          background: 'linear-gradient(to right, transparent 0%, hsl(45 90% 55%) 15%, hsl(45 95% 65%) 50%, hsl(45 90% 55%) 85%, transparent 100%)',
          boxShadow: '0 0 12px 4px hsl(45 88% 50% / 1), 0 0 30px 8px hsl(45 88% 50% / 0.6), 0 0 60px 16px hsl(45 88% 50% / 0.25)',
        }}
      />

      {/* Secondary trailing scan line — softer echo */}
      <div
        className="absolute inset-x-0 pointer-events-none z-[9]"
        style={{
          top: `${Math.max(0, scanLineY - 2)}%`,
          height: '1px',
          background: 'linear-gradient(to right, transparent 10%, hsl(45 88% 50% / 0.4) 30%, hsl(45 88% 50% / 0.4) 70%, transparent 90%)',
          boxShadow: '0 0 6px 2px hsl(45 88% 50% / 0.3)',
        }}
      />

      {/* Wake trail — gold glow above scan line */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none transition-all duration-75 z-[8]"
        style={{
          height: `${scanLineY}%`,
          background: 'linear-gradient(to bottom, hsl(45 88% 50% / 0.06), hsl(45 88% 50% / 0.10), hsl(45 88% 50% / 0.03))',
        }}
      />

      {/* Horizontal grid lines — subtle tech feel */}
      {[15, 30, 45, 60, 75].map(y => (
        <div
          key={y}
          className="absolute inset-x-0 pointer-events-none"
          style={{
            top: `${y}%`,
            height: '1px',
            background: `hsl(45 88% 50% / ${scanLineY > y ? 0.08 : 0.02})`,
            transition: 'background 0.5s',
          }}
        />
      ))}

      {/* Floating gold particles */}
      {PARTICLES.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none z-[11]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: 'hsl(45 88% 60%)',
            boxShadow: `0 0 ${p.size * 2}px ${p.size}px hsl(45 88% 50% / 0.6)`,
          }}
          animate={{
            top: ['100%', '-5%'],
            opacity: [0, 0.8, 0.8, 0],
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
              background: 'radial-gradient(ellipse at 50% 50%, hsl(45 90% 60% / 0.4) 0%, hsl(45 88% 50% / 0.15) 40%, transparent 70%)',
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Corner targeting brackets — with pulse */}
      {[
        ['top-3 left-3', 'border-t-2 border-l-2'],
        ['top-3 right-3', 'border-t-2 border-r-2'],
        ['bottom-3 left-3', 'border-b-2 border-l-2'],
        ['bottom-3 right-3', 'border-b-2 border-r-2'],
      ].map(([pos, border], i) => (
        <motion.div
          key={i}
          className={`absolute ${pos} ${border} border-primary w-6 h-6`}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 6px 1px hsl(45 88% 50% / 0.3)' }}
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
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div
              className="backdrop-blur-sm rounded px-1.5 py-0.5"
              style={{
                textAlign: pos.align as 'left' | 'right',
                background: 'hsl(var(--background) / 0.5)',
                border: '1px solid hsl(45 88% 50% / 0.25)',
              }}
            >
              <p
                className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: 'hsl(45 88% 60%)' }}
              >
                {key}
              </p>
              {val && (
                <motion.p
                  className="text-[11px] font-black text-foreground leading-tight"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {val.min?.toFixed(0)}–{val.max?.toFixed(0)} cm
                </motion.p>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Bottom progress glow bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] z-20">
        <motion.div
          className="h-full"
          style={{
            background: 'linear-gradient(90deg, hsl(45 88% 45%), hsl(45 95% 60%), hsl(45 88% 45%))',
            boxShadow: '0 0 10px 3px hsl(45 88% 50% / 0.7)',
          }}
          animate={{ width: `${(revealedCount / totalCount) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default PremiumScanAnimation;
