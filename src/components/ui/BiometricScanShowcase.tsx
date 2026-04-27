import { motion } from 'framer-motion';
import scanShowcase from '@/assets/body-scan-showcase.webp';

interface Props {
  className?: string;
  height?: number;
}

const NATIVE_ASPECT = 0.75; // width/height — matches DecorativeSilhouette footprint

const BiometricScanShowcase = ({ className = '', height = 240 }: Props) => {
  const width = height * NATIVE_ASPECT;

  return (
    <div
      className={`relative rounded-[1rem] ${className}`}
      style={{ width, height }}
    >
      {/* Pulsing glow layer — sits behind the image */}
      <motion.div
        className="absolute -inset-[2px] rounded-[1rem] pointer-events-none z-0"
        style={{
          border: '2px solid hsl(var(--primary))',
          boxShadow:
            'inset 0 0 24px 6px hsl(var(--primary) / 0.5), 0 0 20px 4px hsl(var(--primary) / 0.6), 0 0 60px 14px hsl(var(--primary) / 0.3), 0 0 120px 30px hsl(var(--primary) / 0.12)',
        }}
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{
          duration: 3,
          ease: [0.4, 0, 0.6, 1],
          repeat: Infinity,
        }}
      />

      {/* Image */}
      <div className="relative z-10 overflow-hidden rounded-[1rem] w-full h-full">
        <img
          src={scanShowcase}
          alt="Biometric body scan visualization"
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    </div>
  );
};

export default BiometricScanShowcase;
