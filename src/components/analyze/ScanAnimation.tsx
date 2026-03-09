import { motion, AnimatePresence } from 'framer-motion';
import bodySilhouette from '@/assets/body-silhouette-clean.png';

interface ScanAnimationProps {
  revealedCount?: number;
}

const MEASUREMENT_POINTS = [
  { top: '10%', label: 'HEIGHT', value: '···' },
  { top: '21%', label: 'SHOULDER', value: '···' },
  { top: '27%', label: 'CHEST', value: '···' },
  { top: '29%', label: 'BUST', value: '···' },
  { top: '41%', label: 'WAIST', value: '···' },
  { top: '49%', label: 'HIPS', value: '···' },
  { top: '65%', label: 'INSEAM', value: '···' },
];

const DATA_STREAM = [
  'BODY_SCAN v3.2.1',
  'CALIBRATING...',
  'REF: STANDARD',
  'MODE: BIOMETRIC',
  'DEPTH: ACTIVE',
  'IR: ENABLED',
  'MAPPING...',
  'VERTICES: 12K',
  'MESH: ACTIVE',
  'POSE: DETECTED',
  'CONTOUR: ON',
  'SKELETON: OK',
];

const ScanAnimation = ({ revealedCount = 0 }: ScanAnimationProps) => {
  const glowIntensity = Math.min(0.3 + revealedCount * 0.1, 1);
  const progressPercent = Math.round((revealedCount / 7) * 100);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Deep radial background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 35%, hsl(200 80% 12% / 0.6) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 80%, hsl(var(--primary) / 0.05) 0%, transparent 50%)
          `,
        }}
      />

      {/* Hex grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(30deg, hsl(180 60% 50%) 12%, transparent 12.5%, transparent 87%, hsl(180 60% 50%) 87.5%, hsl(180 60% 50%)),
            linear-gradient(150deg, hsl(180 60% 50%) 12%, transparent 12.5%, transparent 87%, hsl(180 60% 50%) 87.5%, hsl(180 60% 50%)),
            linear-gradient(30deg, hsl(180 60% 50%) 12%, transparent 12.5%, transparent 87%, hsl(180 60% 50%) 87.5%, hsl(180 60% 50%)),
            linear-gradient(150deg, hsl(180 60% 50%) 12%, transparent 12.5%, transparent 87%, hsl(180 60% 50%) 87.5%, hsl(180 60% 50%)),
            linear-gradient(60deg, hsl(180 60% 40% / 0.7) 25%, transparent 25.5%, transparent 75%, hsl(180 60% 40% / 0.7) 75%, hsl(180 60% 40% / 0.7)),
            linear-gradient(60deg, hsl(180 60% 40% / 0.7) 25%, transparent 25.5%, transparent 75%, hsl(180 60% 40% / 0.7) 75%, hsl(180 60% 40% / 0.7))
          `,
          backgroundSize: '40px 70px',
          backgroundPosition: '0 0, 0 0, 20px 35px, 20px 35px, 0 0, 20px 35px',
        }}
      />

      {/* Body silhouette — cyan-tinted, brightens with progress */}
      <motion.img
        src={bodySilhouette}
        alt="Body scan in progress"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ mixBlendMode: 'screen' }}
        animate={{
          filter: `brightness(${0.4 + revealedCount * 0.08}) contrast(1.3) saturate(0.6) hue-rotate(-10deg)`,
        }}
        transition={{ duration: 0.6 }}
      />

      {/* Holographic edge glow behind silhouette */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: [0.1 * glowIntensity, 0.35 * glowIntensity, 0.1 * glowIntensity],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={bodySilhouette}
          alt=""
          className="w-full h-full object-contain"
          style={{
            filter: 'blur(20px) brightness(2.5) hue-rotate(-20deg)',
            mixBlendMode: 'screen',
          }}
        />
      </motion.div>

      {/* Secondary colour-shifted glow for holographic effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: [0.05, 0.15, 0.05],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <img
          src={bodySilhouette}
          alt=""
          className="w-full h-full object-contain"
          style={{
            filter: 'blur(30px) brightness(2) hue-rotate(60deg)',
            mixBlendMode: 'screen',
          }}
        />
      </motion.div>

      {/* Primary scanning line — cyan with wide glow */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(180 80% 60% / 0.3) 10%, hsl(180 80% 60%) 50%, hsl(180 80% 60% / 0.3) 90%, transparent 100%)',
          boxShadow: '0 0 20px 6px hsl(180 80% 50% / 0.7), 0 0 60px 15px hsl(180 80% 50% / 0.3), 0 0 120px 30px hsl(180 80% 50% / 0.1)',
        }}
        animate={{ top: ['3%', '95%', '3%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Scan line trailing wake */}
      <motion.div
        className="absolute left-0 right-0 h-[80px] pointer-events-none z-[9]"
        style={{
          background: 'linear-gradient(180deg, hsl(180 80% 50% / 0.1) 0%, hsl(180 80% 50% / 0.02) 60%, transparent 100%)',
        }}
        animate={{ top: ['3%', '95%', '3%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary scan line (gold, offset) */}
      <motion.div
        className="absolute left-[5%] right-[5%] h-[1px] pointer-events-none z-10"
        style={{
          background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)',
          boxShadow: '0 0 12px 3px hsl(var(--primary) / 0.4)',
        }}
        animate={{ top: ['92%', '5%', '92%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Horizontal measurement lines — appear on reveal */}
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
                  background: 'repeating-linear-gradient(90deg, hsl(180 80% 50% / 0.5) 0px, hsl(180 80% 50% / 0.5) 4px, transparent 4px, transparent 8px)',
                }}
              />
              {/* Label chip — left side */}
              <motion.div
                className="absolute top-[-10px] left-2 flex items-center gap-1.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(180_80%_50%)]" />
                <span className="text-[8px] font-mono font-bold tracking-[0.15em] text-[hsl(180_80%_70%)]">
                  {point.label}
                </span>
              </motion.div>
              {/* Status indicator — right side */}
              <motion.div
                className="absolute top-[-8px] right-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.7] }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <span className="text-[7px] font-mono text-[hsl(120_70%_55%)]">● LOCKED</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      ))}

      {/* Corner brackets with coordinates */}
      {[
        { pos: 'top-[4%] left-[12%]', borders: 'border-t border-l', coord: '0,0' },
        { pos: 'top-[4%] right-[12%]', borders: 'border-t border-r', coord: '1,0' },
        { pos: 'bottom-[3%] left-[22%]', borders: 'border-b border-l', coord: '0,1' },
        { pos: 'bottom-[3%] right-[22%]', borders: 'border-b border-r', coord: '1,1' },
      ].map(({ pos, borders, coord }, i) => (
        <motion.div
          key={i}
          className={`absolute ${pos} pointer-events-none z-10`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0.4, 0.9, 0.4], scale: 1 }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
        >
          <div className={`w-6 h-6 ${borders} border-[hsl(180_80%_50%_/_0.6)]`} />
          <span className="text-[6px] font-mono text-[hsl(180_80%_50%_/_0.4)] mt-0.5 block">
            [{coord}]
          </span>
        </motion.div>
      ))}

      {/* Left data stream — scrolling text */}
      <div className="absolute left-1.5 top-[15%] bottom-[15%] w-12 overflow-hidden pointer-events-none z-10 opacity-40">
        <motion.div
          className="flex flex-col gap-3"
          animate={{ y: [0, -200, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          {[...DATA_STREAM, ...DATA_STREAM].map((text, i) => (
            <span key={i} className="text-[5px] font-mono text-[hsl(180_80%_60%)] whitespace-nowrap leading-none">
              {text}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Right data stream */}
      <div className="absolute right-1.5 top-[20%] bottom-[10%] w-12 overflow-hidden pointer-events-none z-10 opacity-30">
        <motion.div
          className="flex flex-col gap-3 items-end"
          animate={{ y: [-150, 50, -150] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        >
          {[...DATA_STREAM].reverse().map((text, i) => (
            <span key={i} className="text-[5px] font-mono text-[hsl(var(--primary)_/_0.8)] whitespace-nowrap leading-none">
              {text}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Top HUD bar */}
      <motion.div
        className="absolute top-2 left-3 right-3 flex items-center justify-between z-20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <span className="text-[7px] font-mono font-bold tracking-[0.2em] text-[hsl(180_80%_60%_/_0.7)]">
          DRIP // BODY SCAN
        </span>
        <motion.span
          className="text-[7px] font-mono font-bold text-[hsl(180_80%_60%_/_0.7)]"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          ● REC
        </motion.span>
      </motion.div>

      {/* Bottom HUD — progress readout */}
      <motion.div
        className="absolute bottom-2 left-3 right-3 flex items-center justify-between z-20 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <span className="text-[7px] font-mono text-[hsl(180_80%_60%_/_0.6)]">
          POINTS: {revealedCount}/7
        </span>
        <span className="text-[7px] font-mono text-[hsl(180_80%_60%_/_0.6)]">
          {progressPercent}%
        </span>
      </motion.div>

      {/* Bottom progress bar (thin, in-frame) */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] z-20">
        <motion.div
          className="h-full"
          style={{
            background: 'linear-gradient(90deg, hsl(180 80% 50%), hsl(var(--primary)))',
            boxShadow: '0 0 8px 2px hsl(180 80% 50% / 0.5)',
          }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Flash effect on new measurement */}
      <motion.div
        key={revealedCount}
        className="absolute inset-0 pointer-events-none z-[15]"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, hsl(180 80% 60% / 0.25) 0%, transparent 60%)',
        }}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      />

      {/* Floating particles — cyan */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={`p-${i}`}
          className="absolute rounded-full pointer-events-none z-10"
          style={{
            left: `${15 + Math.random() * 70}%`,
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            background: i % 3 === 0
              ? 'hsl(var(--primary) / 0.6)'
              : 'hsl(180 80% 50% / 0.5)',
          }}
          animate={{
            top: ['95%', '5%'],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            delay: i * 0.4,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Scanline noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[18] opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(180 80% 50% / 0.3) 2px, hsl(180 80% 50% / 0.3) 4px)',
        }}
      />
    </div>
  );
};

export default ScanAnimation;
