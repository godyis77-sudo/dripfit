import { FadeIn } from './LandingAnimations';

const CARDS = [
  { title: 'Body Twin Match', value: '97.3%', sub: 'Measurement alignment' },
  { title: 'Style Twin Score', value: '84', sub: 'Aesthetic compatibility' },
  { title: 'Fit Consensus', value: 'COP', sub: '92% community verdict' },
];

export default function LandingCommunity() {
  return (
    <section id="community" className="py-28 md:py-36 bg-secondary/20 border-y border-border/30">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-14 max-w-lg mx-auto">
            <span className="font-mono text-[10px] tracking-[.22em] uppercase block mb-5 text-primary/70">Community</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-5">
              Your Taste. <span className="text-primary">Verified.</span>
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed">
              Find the heads who dress like you think. Share fits. Rate drape. Build your verified circle.
            </p>
          </div>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CARDS.map((c, i) => (
            <FadeIn key={c.title} delay={i * 0.08}>
              <div className="bg-[hsl(var(--surface-glass)/0.03)] backdrop-blur-xl border border-border/40 rounded-2xl p-10 text-center">
                <div className="text-[11px] tracking-[.12em] uppercase text-muted-foreground/60 mb-4">{c.title}</div>
                <div className="font-display text-4xl font-bold text-primary mb-2">{c.value}</div>
                <div className="font-mono text-[10px] tracking-[.1em] text-muted-foreground/40">{c.sub}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
