import { motion } from 'framer-motion';

interface TryOnLoadingAnimationProps {
  stepIndex: number;
}

const STEPS = [
  'Analyzing your body scan…',
  'Compositing the outfit…',
  'Finalizing your preview…',
];

const TryOnLoadingAnimation = ({ stepIndex }: TryOnLoadingAnimationProps) => {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {/* Gold scanning orb */}
      <div className="relative h-24 w-24">
        {/* Outer rotating ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: 'hsl(var(--primary))',
            borderRightColor: 'hsl(var(--primary) / 0.3)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />

        {/* Middle pulsing ring */}
        <motion.div
          className="absolute inset-2 rounded-full"
          style={{
            border: '1.5px solid transparent',
            borderBottomColor: 'hsl(var(--primary) / 0.7)',
            borderLeftColor: 'hsl(var(--primary) / 0.2)',
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />

        {/* Inner core */}
        <motion.div
          className="absolute inset-4 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
          }}
          animate={{
            boxShadow: [
              '0 0 20px 8px hsl(var(--primary) / 0.1)',
              '0 0 40px 16px hsl(var(--primary) / 0.2)',
              '0 0 20px 8px hsl(var(--primary) / 0.1)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Clothing icon silhouette */}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-primary">
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
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4,
              height: 4,
              background: 'hsl(var(--primary))',
              boxShadow: '0 0 6px 2px hsl(var(--primary) / 0.4)',
              top: '50%',
              left: '50%',
            }}
            animate={{
              x: [
                Math.cos((i * Math.PI) / 2) * 40,
                Math.cos((i * Math.PI) / 2 + Math.PI / 2) * 40,
                Math.cos((i * Math.PI) / 2 + Math.PI) * 40,
                Math.cos((i * Math.PI) / 2 + (3 * Math.PI) / 2) * 40,
                Math.cos((i * Math.PI) / 2 + 2 * Math.PI) * 40,
              ],
              y: [
                Math.sin((i * Math.PI) / 2) * 40,
                Math.sin((i * Math.PI) / 2 + Math.PI / 2) * 40,
                Math.sin((i * Math.PI) / 2 + Math.PI) * 40,
                Math.sin((i * Math.PI) / 2 + (3 * Math.PI) / 2) * 40,
                Math.sin((i * Math.PI) / 2 + 2 * Math.PI) * 40,
              ],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 0.75,
            }}
          />
        ))}
      </div>

      {/* Step text */}
      <div className="text-center">
        <motion.p
          key={stepIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[13px] font-semibold text-foreground"
        >
          {STEPS[stepIndex] || STEPS[0]}
        </motion.p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-2">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{
                width: i === stepIndex ? 20 : 6,
                height: 6,
              }}
              animate={{
                backgroundColor: i <= stepIndex
                  ? 'hsl(var(--primary))'
                  : 'hsl(var(--muted-foreground) / 0.2)',
                boxShadow: i === stepIndex
                  ? '0 0 8px 2px hsl(var(--primary) / 0.4)'
                  : 'none',
              }}
              transition={{ duration: 0.4 }}
            />
          ))}
        </div>
      </div>

      {/* Estimated time */}
      <p className="text-[11px] text-muted-foreground/60">
        Usually takes 5–15 seconds
      </p>
    </div>
  );
};

export default TryOnLoadingAnimation;
