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
      className="relative inline-flex items-center gap-3 shrink-0 select-none group"
      whileHover={{ scale: 1.08 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      {/* Glow backdrop on hover */}
      <span className="absolute inset-0 -inset-x-3 rounded-xl bg-primary/0 group-hover:bg-primary/10 blur-xl transition-all duration-500 pointer-events-none" />

      {/* The brand text */}
      <span
        className="relative text-[16px] sm:text-xl font-black uppercase tracking-[0.25em]"
        style={{
          background: `linear-gradient(180deg, hsl(42 80% 78%), hsl(42 76% 58%) 40%, hsl(42 70% 38%) 70%, hsl(42 76% 55%))`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 2px 4px hsl(42 76% 42% / 0.3), 0 4px 12px hsl(0 0% 0% / 0.4)',
          paintOrder: 'stroke fill',
          WebkitTextStroke: '0.3px hsl(42 76% 50% / 0.15)',
        }}
      >
        {name}
      </span>

      {/* Diamond separator */}
      <motion.span
        className="text-[6px] text-primary/40"
        animate={{
          opacity: [0.3, 0.8, 0.3],
          scale: [0.8, 1.1, 0.8],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.2,
        }}
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
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex gap-8 whitespace-nowrap py-3"
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
      {/* Ambient glow behind entire marquee */}
      <div className="absolute inset-0 -inset-y-6 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.06] to-transparent blur-2xl" />
        <motion.div
          className="absolute left-1/4 top-1/2 -translate-y-1/2 w-40 h-20 rounded-full bg-primary/[0.08] blur-[60px]"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
        />
      </div>

      {/* Gold line accents */}
      <div className="flex items-center gap-4 mb-2 px-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <motion.span
          className="text-[9px] font-bold text-primary uppercase tracking-[0.4em]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          Trusted Brands
        </motion.span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>

      <MarqueeRow brands={BRANDS} duration={30} />
      <MarqueeRow brands={BRANDS_ROW2} duration={35} reverse />

      {/* Bottom accent line */}
      <div className="flex items-center px-4 mt-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>
    </div>
  );
}
