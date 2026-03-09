import { motion } from 'framer-motion';
import bodySilhouette from '@/assets/body-silhouette-clean.png';

/**
 * Pure CSS/framer-motion scan animation.
 * A glowing horizontal line sweeps top → bottom over the body silhouette,
 * loops continuously, with a pulsing glow effect on the silhouette.
 */
const ScanAnimation = () => {
  return (
    <div className="relative w-full h-full">
      {/* Body silhouette */}
      <img
        src={bodySilhouette}
        alt="Body scan in progress"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ filter: 'brightness(0.6) contrast(1.2)' }}
      />

      {/* Pulsing gold glow behind silhouette */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={bodySilhouette}
          alt=""
          className="w-full h-full object-contain"
          style={{
            filter: 'blur(20px) brightness(1.5)',
            mixBlendMode: 'screen',
            opacity: 0.5,
          }}
        />
      </motion.div>

      {/* Scanning line — sweeps top to bottom */}
      <motion.div
        className="absolute left-0 right-0 h-[3px] pointer-events-none z-10"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.3) 15%, hsl(var(--primary)) 50%, hsl(var(--primary) / 0.3) 85%, transparent 100%)',
          boxShadow: '0 0 20px 6px hsl(var(--primary) / 0.6), 0 0 60px 15px hsl(var(--primary) / 0.25)',
        }}
        animate={{ top: ['5%', '92%', '5%'] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Scan line trail glow */}
      <motion.div
        className="absolute left-0 right-0 h-[40px] pointer-events-none z-[9]"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--primary) / 0.15) 0%, transparent 100%)',
        }}
        animate={{ top: ['5%', '92%', '5%'] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Corner markers */}
      {[
        'top-[8%] left-[18%]',
        'top-[8%] right-[18%]',
        'bottom-[5%] left-[28%]',
        'bottom-[5%] right-[28%]',
      ].map((pos, i) => (
        <motion.div
          key={i}
          className={`absolute ${pos} w-4 h-4 pointer-events-none z-10`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
        >
          <div
            className="w-full h-full"
            style={{
              borderLeft: i % 2 === 0 ? '2px solid hsl(var(--primary))' : 'none',
              borderRight: i % 2 !== 0 ? '2px solid hsl(var(--primary))' : 'none',
              borderTop: i < 2 ? '2px solid hsl(var(--primary))' : 'none',
              borderBottom: i >= 2 ? '2px solid hsl(var(--primary))' : 'none',
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default ScanAnimation;
