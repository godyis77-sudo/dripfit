import { motion, AnimatePresence } from 'framer-motion';
import bodySilhouette from '@/assets/body-silhouette-clean.webp';

interface ScanAnimationProps {
  revealedCount?: number;
}

const MEASUREMENT_POINTS = [
  { top: '10%', label: 'HEIGHT' },
  { top: '21%', label: 'SHOULDER' },
  { top: '27%', label: 'CHEST' },
  { top: '29%', label: 'BUST' },
  { top: '41%', label: 'WAIST' },
  { top: '49%', label: 'HIPS' },
  { top: '65%', label: 'INSEAM' },
];

const ScanAnimation = ({ revealedCount = 0 }: ScanAnimationProps) => {
  const progressPercent = Math.round((revealedCount / 7) * 100);

  return (
    <div className="relative w-full h-full overflow-hidden bg-background">
      {/* Body silhouette */}
      <motion.img
        src={bodySilhouette}
        alt="Body scan in progress"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ mixBlendMode: 'screen' }}
        animate={{
          filter: `brightness(${0.4 + revealedCount * 0.08}) contrast(1.3) saturate(0.6)`,
        }}
        transition={{ duration: 0.6 }}
      />

      {/* Silhouette glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: [0.05, 0.2, 0.05],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={bodySilhouette}
          alt=""
          className="w-full h-full object-contain"
          style={{
            filter: 'blur(20px) brightness(2)',
            mixBlendMode: 'screen',
          }}
        />
      </motion.div>

      {/* Gold scanning line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(45 88% 50% / 0.3) 10%, hsl(45 88% 50%) 50%, hsl(45 88% 50% / 0.3) 90%, transparent 100%)',
          boxShadow: '0 0 12px 6px hsl(45 88% 50% / 0.7)',
        }}
        animate={{ top: ['3%', '95%', '3%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Scan line trailing wake */}
      <motion.div
        className="absolute left-0 right-0 h-[60px] pointer-events-none z-[9]"
        style={{
          background: 'linear-gradient(180deg, hsl(45 88% 50% / 0.08) 0%, transparent 100%)',
        }}
        animate={{ top: ['3%', '95%', '3%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Measurement labels — appear on reveal */}
      {MEASUREMENT_POINTS.map((point, i) => (
        <AnimatePresence key={point.label}>
          {i < revealedCount && (
            <motion.div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: point.top }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {/* Dashed horizontal line */}
              <div
                className="w-full h-[1px]"
                style={{
                  background: 'repeating-linear-gradient(90deg, hsl(45 88% 50% / 0.5) 0px, hsl(45 88% 50% / 0.5) 4px, transparent 4px, transparent 8px)',
                }}
              />
              {/* Label */}
              <motion.div
                className="absolute top-[-10px] left-2 flex items-center gap-1.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-mono font-bold tracking-[0.15em] text-primary">
                  {point.label}
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      ))}

      {/* Flash effect on new measurement */}
      <motion.div
        key={revealedCount}
        className="absolute inset-0 pointer-events-none z-[15]"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, hsl(45 88% 50% / 0.2) 0%, transparent 60%)',
        }}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      />

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] z-20">
        <motion.div
          className="h-full"
          style={{
            background: 'hsl(45 88% 50%)',
            boxShadow: '0 0 8px 2px hsl(45 88% 50% / 0.5)',
          }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default ScanAnimation;
