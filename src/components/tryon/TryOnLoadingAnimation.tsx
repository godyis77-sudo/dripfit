import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TryOnLoadingAnimationProps {
  stepIndex: number;
}

const STEPS = [
  'Analyzing your body scan…',
  'Compositing the outfit…',
  'Finalizing your preview…',
];

const TryOnLoadingAnimation = ({ stepIndex }: TryOnLoadingAnimationProps) => {
  // Lock scroll while fullscreen
  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevDoc = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = prevDoc;
    };
  }, []);

  const overlay = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex flex-col items-center justify-center bg-[#0A0A0A]"
    >
      {/* Subtle radial glow behind orb */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 45%, hsl(var(--primary) / 0.08) 0%, transparent 60%)',
        }}
      />

      {/* Gold scanning orb — larger for fullscreen */}
      <div className="relative h-36 w-36">
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: '2.5px solid transparent',
            borderTopColor: 'hsl(var(--primary))',
            borderRightColor: 'hsl(var(--primary) / 0.3)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />

        {/* Middle pulsing ring */}
        <motion.div
          className="absolute inset-3 rounded-full"
          style={{
            border: '2px solid transparent',
            borderBottomColor: 'hsl(var(--primary) / 0.7)',
            borderLeftColor: 'hsl(var(--primary) / 0.2)',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner core */}
        <motion.div
          className="absolute inset-6 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
          }}
          animate={{
            boxShadow: [
              '0 0 30px 12px hsl(var(--primary) / 0.1)',
              '0 0 60px 24px hsl(var(--primary) / 0.2)',
              '0 0 30px 12px hsl(var(--primary) / 0.1)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path
                d="M12 2L6 6V8H4V18H20V8H18V6L12 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
              <path d="M8 8V6L12 4L16 6V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Orbiting particles */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 5,
              height: 5,
              background: 'hsl(var(--primary))',
              boxShadow: '0 0 8px 3px hsl(var(--primary) / 0.4)',
              top: '50%',
              left: '50%',
            }}
            animate={{
              x: [
                Math.cos((i * Math.PI) / 3) * 60,
                Math.cos((i * Math.PI) / 3 + Math.PI / 2) * 60,
                Math.cos((i * Math.PI) / 3 + Math.PI) * 60,
                Math.cos((i * Math.PI) / 3 + (3 * Math.PI) / 2) * 60,
                Math.cos((i * Math.PI) / 3 + 2 * Math.PI) * 60,
              ],
              y: [
                Math.sin((i * Math.PI) / 3) * 60,
                Math.sin((i * Math.PI) / 3 + Math.PI / 2) * 60,
                Math.sin((i * Math.PI) / 3 + Math.PI) * 60,
                Math.sin((i * Math.PI) / 3 + (3 * Math.PI) / 2) * 60,
                Math.sin((i * Math.PI) / 3 + 2 * Math.PI) * 60,
              ],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.6,
            }}
          />
        ))}
      </div>

      {/* Step text */}
      <div className="text-center mt-8">
        <motion.p
          key={stepIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-lg text-white"
        >
          {STEPS[stepIndex] || STEPS[0]}
        </motion.p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2.5 mt-3">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{
                width: i === stepIndex ? 24 : 8,
                height: 8,
              }}
              animate={{
                backgroundColor: i <= stepIndex
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--muted-foreground) / 0.2)',
                boxShadow: i === stepIndex
                  ? '0 0 10px 3px hsl(var(--primary) / 0.4)'
                  : 'none',
              }}
              transition={{ duration: 0.4 }}
            />
          ))}
        </div>
      </div>

      {/* Estimated time */}
      <p className="text-sm text-muted-foreground/60 mt-4">
        Usually takes 5–15 seconds
      </p>
    </motion.div>
  );

  return createPortal(overlay, document.body);
};

export default TryOnLoadingAnimation;
