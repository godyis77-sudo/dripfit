import { motion } from 'framer-motion';
import bodySilhouette from '@/assets/body-silhouette-clean.png';

interface ScanAnimationProps {
  /** Number of measurements revealed so far (0–7) */
  revealedCount?: number;
}

const ScanAnimation = ({ revealedCount = 0 }: ScanAnimationProps) => {
  // Intensify glow as more measurements are found
  const glowIntensity = Math.min(0.3 + revealedCount * 0.1, 1);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Dark gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
        }}
      />

      {/* Body silhouette — brightens with each stage */}
      <motion.img
        src={bodySilhouette}
        alt="Body scan in progress"
        className="absolute inset-0 w-full h-full object-contain"
        animate={{
          filter: `brightness(${0.5 + revealedCount * 0.07}) contrast(1.2)`,
        }}
        transition={{ duration: 0.6 }}
      />

      {/* Pulsing gold aura behind silhouette — grows with progress */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: [0.15 * glowIntensity, 0.4 * glowIntensity, 0.15 * glowIntensity],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={bodySilhouette}
          alt=""
          className="w-full h-full object-contain"
          style={{
            filter: 'blur(25px) brightness(2)',
            mixBlendMode: 'screen',
          }}
        />
      </motion.div>

      {/* Primary scanning line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.2) 10%, hsl(var(--primary)) 50%, hsl(var(--primary) / 0.2) 90%, transparent 100%)',
          boxShadow: '0 0 15px 4px hsl(var(--primary) / 0.7), 0 0 40px 10px hsl(var(--primary) / 0.3), 0 0 80px 20px hsl(var(--primary) / 0.1)',
        }}
        animate={{ top: ['3%', '95%', '3%'] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Scan line trailing glow */}
      <motion.div
        className="absolute left-0 right-0 h-[60px] pointer-events-none z-[9]"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.03) 50%, transparent 100%)',
        }}
        animate={{ top: ['3%', '95%', '3%'] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Secondary scan line (offset, dimmer) for depth */}
      <motion.div
        className="absolute left-[10%] right-[10%] h-[1px] pointer-events-none z-10"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.5) 50%, transparent 100%)',
          boxShadow: '0 0 10px 2px hsl(var(--primary) / 0.3)',
        }}
        animate={{ top: ['95%', '3%', '95%'] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      />

      {/* Animated grid overlay — tech feel */}
      <div
        className="absolute inset-0 pointer-events-none z-[8] opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      {/* Corner brackets */}
      {[
        { pos: 'top-[6%] left-[15%]', borders: 'border-t-2 border-l-2' },
        { pos: 'top-[6%] right-[15%]', borders: 'border-t-2 border-r-2' },
        { pos: 'bottom-[4%] left-[25%]', borders: 'border-b-2 border-l-2' },
        { pos: 'bottom-[4%] right-[25%]', borders: 'border-b-2 border-r-2' },
      ].map(({ pos, borders }, i) => (
        <motion.div
          key={i}
          className={`absolute ${pos} w-5 h-5 ${borders} border-primary pointer-events-none z-10`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: [0.3, 0.8, 0.3], scale: 1 }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
        />
      ))}

      {/* Measurement point indicators — appear as measurements are revealed */}
      {[
        { top: '10%', label: 'HEIGHT' },
        { top: '21%', label: 'SHOULDER' },
        { top: '27%', label: 'CHEST' },
        { top: '29%', label: 'BUST' },
        { top: '41%', label: 'WAIST' },
        { top: '49%', label: 'HIPS' },
        { top: '65%', label: 'INSEAM' },
      ].map((point, i) => (
        <motion.div
          key={point.label}
          className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 pointer-events-none"
          style={{ top: point.top }}
          initial={{ opacity: 0, scale: 0 }}
          animate={
            i < revealedCount
              ? { opacity: [0, 1, 0.7], scale: 1 }
              : { opacity: 0, scale: 0 }
          }
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Ping dot */}
          <motion.div
            className="w-2 h-2 rounded-full bg-primary"
            animate={i < revealedCount ? {
              boxShadow: [
                '0 0 0 0 hsl(var(--primary) / 0.6)',
                '0 0 0 8px hsl(var(--primary) / 0)',
                '0 0 0 0 hsl(var(--primary) / 0)',
              ],
            } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-[8px] font-bold text-primary/80 tracking-wider">
            {point.label}
          </span>
        </motion.div>
      ))}

      {/* Flash effect when a new measurement is found */}
      <motion.div
        key={revealedCount}
        className="absolute inset-0 pointer-events-none z-[15]"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, hsl(var(--primary) / 0.2) 0%, transparent 70%)' }}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* Particle dots floating upward */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1 h-1 rounded-full bg-primary/40 pointer-events-none z-10"
          style={{ left: `${20 + Math.random() * 60}%` }}
          animate={{
            top: ['90%', '10%'],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
};

export default ScanAnimation;
