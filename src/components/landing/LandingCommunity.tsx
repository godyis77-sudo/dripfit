import { motion } from 'framer-motion';
import { FadeIn } from './LandingAnimations';

const CARDS = [
  { title: 'Body Twin Match', value: '97.3%', sub: 'Measurement alignment' },
  { title: 'Style Twin Score', value: '84', sub: 'Aesthetic compatibility' },
  { title: 'Fit Consensus', value: 'COP', sub: '92% community verdict' },
];

export default function LandingCommunity() {
  return (
    <section id="community" className="py-24 md:py-36 border-y border-border/20">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-16 max-w-lg mx-auto">
            <span className="type-data block mb-4 text-primary/60 tracking-[.25em]">Community</span>
            <h2 className="type-headline text-3xl md:text-5xl leading-tight mb-5 tracking-[-0.02em]">
              Your Taste. <span className="text-primary">Verified.</span>
            </h2>
            <p className="type-body text-base leading-relaxed text-muted-foreground/70">
              Find the heads who dress like you think. Share fits. Rate drape. Build your verified circle.
            </p>
          </div>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {CARDS.map((c, i) => (
            <FadeIn key={c.title} delay={i * 0.08}>
              <motion.div
                className="rounded-2xl p-8 md:p-10 text-center border border-border/30 bg-secondary/20 hover:border-primary/15 transition-all duration-500"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
              >
                <div className="type-data mb-5 text-muted-foreground/50 tracking-[.2em]">{c.title}</div>
                <div className="type-headline text-4xl text-primary mb-3 tracking-tight">{c.value}</div>
                <div className="type-data text-muted-foreground/40">{c.sub}</div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
