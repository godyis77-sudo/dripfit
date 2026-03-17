import BodyDiagram from '@/components/results/BodyDiagram';
import { motion } from 'framer-motion';

interface Props {
  className?: string;
  height?: number;
}

const DEMO_MEASUREMENTS: Record<string, { min: number; max: number }> = {
  shoulder: { min: 44, max: 47 },
  chest: { min: 96, max: 102 },
  waist: { min: 78, max: 84 },
  hips: { min: 94, max: 100 },
  inseam: { min: 78, max: 82 },
  sleeve: { min: 62, max: 66 },
};

const DEMO_HEIGHT_CM = 178;

const NATIVE_HEIGHT = 520;

const DecorativeSilhouette = ({ className = '', height = 200 }: Props) => {
  const scale = height / NATIVE_HEIGHT;
  const nativeWidth = NATIVE_HEIGHT * 0.75;

  return (
    <div
      className={`relative rounded-[1rem] ${className}`}
      style={{
        width: nativeWidth * scale,
        height,
      }}
    >
      {/* Pulsing glow layer — sits behind content */}
      <motion.div
        className="absolute -inset-[2px] rounded-[1rem] pointer-events-none z-0"
        style={{
          border: '2px solid hsl(var(--primary))',
          boxShadow:
            'inset 0 0 24px 6px hsl(var(--primary) / 0.5), 0 0 20px 4px hsl(var(--primary) / 0.6), 0 0 60px 14px hsl(var(--primary) / 0.3), 0 0 120px 30px hsl(var(--primary) / 0.12)',
        }}
        animate={{
          opacity: [1, 0.2, 1],
        }}
        transition={{
          duration: 3,
          ease: [0.4, 0, 0.6, 1],
          repeat: Infinity,
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 overflow-hidden rounded-[1rem] w-full h-full"
        style={{ filter: 'contrast(1.25) saturate(1.15)' }}
      >
        <div
          className="origin-top-left [&>div]:!rounded-none [&>div]:!border-0 [&>div]:!bg-transparent"
          style={{
            width: nativeWidth,
            height: NATIVE_HEIGHT,
            transform: `scale(${scale})`,
          }}
        >
          <BodyDiagram
            measurements={DEMO_MEASUREMENTS}
            heightCm={DEMO_HEIGHT_CM}
            decorativeMode
          />
        </div>
      </div>
    </div>
  );
};

export default DecorativeSilhouette;
