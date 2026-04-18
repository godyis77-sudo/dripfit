import { FadeIn } from './LandingAnimations';

const CARDS = [
  { title: 'Body Twin Match', value: '97.3%', sub: 'Measurement alignment' },
  { title: 'Style Twin Score', value: '84/100', sub: 'Aesthetic compatibility' },
  { title: 'Fit Consensus', value: 'COP', sub: '92% community verdict' },
];

export default function LandingCommunity() {
  return (
    <section id="community" className="py-20 bg-secondary/20 border-y border-border/30">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-14 max-w-lg mx-auto">
            <span className="type-data block mb-5 text-primary/70">The Community</span>
            <h2 className="type-headline leading-tight mb-5" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
              Your Taste. <span className="text-primary">Verified.</span>
            </h2>
            <p className="type-body text-base leading-relaxed">
              Find the heads who dress like you think. Share fits. Rate drape. Build your verified circle.
            </p>
            <p className="text-sm text-muted-foreground/65 mt-4">Join the verified circle. Growing daily.</p>
          </div>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CARDS.map((c, i) => (
            <FadeIn key={c.title} delay={i * 0.08}>
              <div className="bg-[#1A1A1A] border border-[#252525] rounded-2xl p-10 text-center">
                <div className="type-data mb-4">{c.title}</div>
                <div className="type-headline text-4xl text-primary mb-2">{c.value}</div>
                <div className="type-data text-muted-foreground/60">{c.sub}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
