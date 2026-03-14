import { motion } from 'framer-motion';

const BRANDS = [
  'GUCCI', 'NIKE', 'ZARA', 'BALENCIAGA', 'H&M', 'OFF-WHITE',
  'ASOS', 'RALPH LAUREN', 'VERSACE', 'UNIQLO', 'PRADA', 'STÜSSY',
];

const BRANDS_ROW2 = [
  'LOUIS VUITTON', 'ADIDAS', 'COS', 'BURBERRY', 'MANGO', 'DIOR',
  'SHEIN', 'TOMMY HILFIGER', 'GIVENCHY', 'STONE ISLAND', 'FEAR OF GOD', 'CELINE',
];

function BrandName({ name, index }: { name: string; index: number }) {
  return (
    <motion.span
      className="relative inline-flex items-center gap-4 shrink-0 select-none"
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {/* Per-brand pulsing glow */}
      <motion.span
        className="absolute inset-0 -inset-x-4 -inset-y-2 rounded-2xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, hsl(42 76% 42% / 0.15), transparent 70%)' }}
        animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
      />

      {/* The brand text — big, puffy, 3D */}
      <span
        className="relative text-[22px] sm:text-[28px] font-black uppercase tracking-[0.18em]"
        style={{
          background: 'linear-gradient(180deg, hsl(42 85% 82%) 0%, hsl(42 80% 65%) 30%, hsl(42 70% 40%) 65%, hsl(42 76% 55%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 1px 0 hsl(42 76% 30%)) drop-shadow(0 2px 0 hsl(42 70% 22%)) drop-shadow(0 4px 8px hsl(0 0% 0% / 0.6)) drop-shadow(0 0 20px hsl(42 76% 42% / 0.35))',
        }}
      >
        {name}
      </span>

      {/* Diamond separator with glow */}
      <motion.span
        className="text-[8px]"
        style={{ color: 'hsl(42 76% 50%)', filter: 'drop-shadow(0 0 6px hsl(42 76% 42% / 0.6))' }}
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.2, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.25 }}
      >
        ◆
      </motion.span>
    </motion.span>
  );
}

function MarqueeRow({ brands, duration, reverse = false }: { brands: string[]; duration: number; reverse?: boolean }) {
  const doubled = [...brands, ...brands];
  return (
    <div className="relative overflow-hidden">
      {/* Edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background via-background/90 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background via-background/90 to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex gap-10 whitespace-nowrap py-4"
        animate={{ x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((b, i) => (
          <BrandName key={`${b}-${i}`} name={b} index={i} />
        ))}
      </motion.div>
    </div>
  );
}

export default function BrandMarquee() {
  return (
    <div className="relative mt-12">
      {/* Ambient glow behind entire marquee — stronger */}
      <div className="absolute inset-0 -inset-y-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.10] to-transparent blur-3xl" />
        <motion.div
          className="absolute left-1/4 top-1/2 -translate-y-1/2 w-60 h-32 rounded-full bg-primary/[0.12] blur-[80px]"
          animate={{ x: ['-100%', '350%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
        />
        {/* Second travelling orb */}
        <motion.div
          className="absolute right-1/4 top-1/2 -translate-y-1/2 w-40 h-24 rounded-full bg-primary/[0.08] blur-[60px]"
          animate={{ x: ['200%', '-200%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
        />
      </div>

      {/* Gold line accents */}
      <div className="flex items-center gap-4 mb-3 px-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <motion.span
          className="text-[9px] font-bold text-primary uppercase tracking-[0.4em]"
          animate={{ opacity: [0.5, 1, 0.5], textShadow: ['0 0 0px hsl(42 76% 42% / 0)', '0 0 12px hsl(42 76% 42% / 0.6)', '0 0 0px hsl(42 76% 42% / 0)'] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          Trusted Brands
        </motion.span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>

      <MarqueeRow brands={BRANDS} duration={16} />
      <MarqueeRow brands={BRANDS_ROW2} duration={20} reverse />

      {/* Bottom accent line */}
      <div className="flex items-center px-4 mt-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
    </div>
  );
}
