import { FadeIn } from './LandingAnimations';
import { useCatalogStats } from '@/hooks/useCatalogStats';

export default function LandingHowItWorks() {
  const stats = useCatalogStats();
  const STEPS = [
    { n: '01', title: 'Scan Your Body', desc: 'Stand in front of your phone. Two photos. 60 seconds. 20+ biometric data points extracted. Your measurements — verified.' },
    { n: '02', title: 'Enter Infinite Drape Studio', desc: `Browse ${stats.productsLabel} pieces from ${stats.brands} brands. AR try-on renders every garment on your exact silhouette. See the real drape.` },
    { n: '03', title: 'Verify With Your Twins', desc: 'Your Body Twins — same proportions — have already tried it. See the verdict. See the drape. Community-verified before you commit.' },
    { n: '04', title: 'Cop. Zero Returns.', desc: 'Confirmed. Perfect drape. One size. One purchase. Done.' },
  ];
  return (
    <section id="how-it-works" className="pt-20 md:pt-24 pb-6 md:pb-8 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div>
          <FadeIn>
            <span className="type-data block mb-5 text-primary/70 text-center lg:text-left">How It Works</span>
            <h2 className="type-headline leading-tight mb-12 text-center lg:text-left" style={{ letterSpacing: '-0.01em', fontSize: 'clamp(32px, 4vw, 48px)' }}>
              Scan. Try. Verify. <span className="text-primary italic" style={{ fontFamily: 'var(--font-display-editorial, serif)' }}>Cop.</span>
            </h2>
          </FadeIn>
          <div className="space-y-10">
            {STEPS.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.08}>
                <div className="flex gap-5 items-start">
                  <div className="shrink-0 pt-1.5 w-9 type-data text-primary/70">
                    {s.n}
                  </div>
                  <div className="flex-1 border-l border-primary/15 pl-5">
                    <h4 className="type-headline text-base mb-1.5">{s.title}</h4>
                    <p className="type-body leading-relaxed text-muted-foreground/85" style={{ fontSize: 15 }}>{s.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Mobile-only stat — surfaces the 94% proof point on small viewports */}
          <FadeIn delay={0.4}>
            <div className="lg:hidden mt-8 pt-6 border-t border-border/30 text-center">
              <div className="font-display font-bold text-primary leading-none" style={{ fontSize: 'clamp(48px, 14vw, 72px)', letterSpacing: '-0.03em' }}>
                94<span className="text-primary/60">%</span>
              </div>
              <p className="type-data text-muted-foreground/85 mt-3">First-Try Fit Rate</p>
              <p className="text-xs text-muted-foreground/60 mt-2 leading-relaxed max-w-xs mx-auto">
                Members who scanned and copped their Body Twin's verified size.
              </p>
            </div>
          </FadeIn>
        </div>

        <FadeIn delay={0.15}>
          <div className="hidden lg:flex flex-col items-center justify-center sticky top-24 min-h-[400px] gap-10">
            {/* Verified badge */}
            <div className="flex flex-col items-center justify-center w-28 h-28 rounded-full border-[1.5px] border-primary animate-[pulse-ring_2s_ease-in-out_infinite]">
              <span className="text-primary text-5xl leading-none" style={{ fontFamily: 'monospace' }}>✓</span>
              <span className="text-primary type-data mt-1">Verified</span>
            </div>
            {/* Stat block */}
            <div className="text-center max-w-xs">
              <div className="font-display font-bold text-primary leading-none" style={{ fontSize: 'clamp(56px, 6vw, 88px)', letterSpacing: '-0.03em' }}>
                94<span className="text-primary/60">%</span>
              </div>
              <p className="type-data text-muted-foreground/85 mt-3">First-Try Fit Rate</p>
              <p className="text-xs text-muted-foreground/60 mt-2 leading-relaxed">
                Members who scanned and copped their Body Twin's verified size.
              </p>
            </div>
            {/* Divider quote */}
            <div className="border-t border-border/30 pt-6 max-w-xs text-center">
              <p className="font-display italic text-base text-foreground/80 leading-snug">
                "Stop guessing. <span className="text-primary">Start knowing.</span>"
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
