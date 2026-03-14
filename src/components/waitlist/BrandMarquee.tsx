import { motion } from 'framer-motion';

const ROW1 = [
  'GUCCI', 'NIKE', 'ZARA', 'BALENCIAGA', 'OFF-WHITE', 'VERSACE',
  'PRADA', 'RALPH LAUREN', 'BURBERRY', 'DIOR', 'GIVENCHY', 'FENDI',
  'STÜSSY', 'STONE ISLAND', 'MONCLER', 'VALENTINO',
];

const ROW2 = [
  'LOUIS VUITTON', 'ADIDAS', 'H&M', 'ASOS', 'COS', 'UNIQLO',
  'MANGO', 'TOMMY HILFIGER', 'SHEIN', 'FEAR OF GOD', 'CELINE',
  'HUGO BOSS', 'LOEWE', 'ACNE STUDIOS', 'AMIRI', 'BALMAIN',
];

function BrandName({ name, i }: { name: string; i: number }) {
  return (
    <span className="relative inline-flex items-center gap-5 shrink-0 select-none">
      {/* Pulsing under-glow per brand */}
      <motion.span
        className="absolute inset-0 -inset-x-6 -inset-y-3 rounded-3xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(42 80% 50% / 0.18), transparent 70%)' }}
        animate={{ opacity: [0.3, 0.9, 0.3] }}
        transition={{ duration: 2.5 + (i % 4) * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
      />

      {/* Brand text — smooth, extruded 4D look */}
      <span
        className="relative uppercase select-none"
        style={{
          fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
          fontSize: 'clamp(24px, 6vw, 34px)',
          fontWeight: 900,
          letterSpacing: '0.12em',
          lineHeight: 1,
          background: 'linear-gradient(175deg, hsl(42 90% 88%) 0%, hsl(42 85% 72%) 20%, hsl(42 76% 52%) 45%, hsl(42 65% 35%) 70%, hsl(42 76% 50%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: [
            'drop-shadow(0 1px 0 hsl(42 60% 28%))',
            'drop-shadow(0 2px 0 hsl(42 50% 20%))',
            'drop-shadow(0 3px 0 hsl(42 40% 14%))',
            'drop-shadow(0 4px 0 hsl(30 30% 10%))',
            'drop-shadow(0 6px 12px hsl(0 0% 0% / 0.7))',
            'drop-shadow(0 0 30px hsl(42 76% 42% / 0.4))',
            'drop-shadow(0 0 60px hsl(42 76% 42% / 0.15))',
          ].join(' '),
        }}
      >
        {name}
      </span>

      {/* Glowing separator dot */}
      <motion.span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'hsl(42 80% 60%)',
          boxShadow: '0 0 8px 2px hsl(42 76% 42% / 0.6), 0 0 20px 4px hsl(42 76% 42% / 0.2)',
          flexShrink: 0,
        }}
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.3, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
      />
    </span>
  );
}

function MarqueeRow({ brands, speed, reverse }: { brands: string[]; speed: number; reverse?: boolean }) {
  // Triple for seamless continuous loop
  const tripled = [...brands, ...brands, ...brands];
  return (
    <div className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-28 bg-gradient-to-r from-background via-background/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-l from-background via-background/90 to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex gap-12 whitespace-nowrap py-5 will-change-transform"
        animate={{ x: reverse ? ['-33.333%', '0%'] : ['0%', '-33.333%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
      >
        {tripled.map((b, i) => (
          <BrandName key={`${b}-${i}`} name={b} i={i % brands.length} />
        ))}
      </motion.div>
    </div>
  );
}

export default function BrandMarquee() {
  return (
    <div className="relative mt-14 -mx-5 sm:-mx-8">
      {/* Deep ambient glow */}
      <div className="absolute inset-0 -inset-y-12 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.08] to-transparent blur-3xl" />
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-72 h-40 rounded-full bg-primary/[0.14] blur-[100px]"
          animate={{ x: ['-20%', '120%'] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
        />
        <motion.div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-56 h-32 rounded-full bg-primary/[0.10] blur-[80px]"
          animate={{ x: ['20%', '-120%'] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-4 px-8">
        <motion.div
          className="h-px flex-1"
          style={{ background: 'linear-gradient(90deg, transparent, hsl(42 76% 42% / 0.5), transparent)' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.span
          className="text-[9px] font-bold uppercase tracking-[0.5em]"
          style={{ color: 'hsl(42 76% 55%)' }}
          animate={{
            textShadow: [
              '0 0 4px hsl(42 76% 42% / 0)',
              '0 0 16px hsl(42 76% 42% / 0.7)',
              '0 0 4px hsl(42 76% 42% / 0)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          Trusted Brands
        </motion.span>
        <motion.div
          className="h-px flex-1"
          style={{ background: 'linear-gradient(90deg, transparent, hsl(42 76% 42% / 0.5), transparent)' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      <MarqueeRow brands={ROW1} speed={22} />
      <MarqueeRow brands={ROW2} speed={26} reverse />

      {/* Bottom line */}
      <div className="flex items-center px-8 mt-4">
        <motion.div
          className="h-px flex-1"
          style={{ background: 'linear-gradient(90deg, transparent, hsl(42 76% 42% / 0.35), transparent)' }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, delay: 1 }}
        />
      </div>
    </div>
  );
}
