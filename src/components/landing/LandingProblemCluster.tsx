import { FadeIn } from './LandingAnimations';

const QA_PAIRS: Array<{ q: string; a: string }> = [
  { q: 'Will it fit?', a: 'The Biometric Scan' },
  { q: 'Will it look right on me?', a: 'Infinite Drape Studio' },
  { q: 'Will my crew approve?', a: 'COP or DROP' },
];

export default function LandingProblemCluster() {
  return (
    <section id="problem" className="py-16 md:py-24 scroll-mt-20 relative overflow-hidden border-y border-border/20 bg-[hsl(var(--surface-glass)/0.02)]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none bg-primary/[0.03] blur-[140px]" />
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <FadeIn>
          <span className="type-data block mb-5 text-muted-foreground">The Problem</span>
          <h2
            className="type-headline font-bold leading-tight mb-10"
            style={{ letterSpacing: '-0.01em', fontSize: 'clamp(32px, 4vw, 48px)' }}
          >
            Every Third Purchase.
            <br />
            <span className="text-muted-foreground/85">Returned.</span>
          </h2>
        </FadeIn>

        {/* Single-stat display */}
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center">
            <div
              className="font-display font-bold text-primary leading-none"
              style={{ fontSize: 'clamp(80px, 14vw, 144px)', letterSpacing: '-0.03em' }}
            >
              70%
            </div>
            <p className="text-foreground/70 text-lg mt-4">
              of online returns are fit-related
            </p>
            <p className="text-foreground/40 text-sm mt-2">
              Source: National Retail Federation 2025
            </p>
          </div>
        </FadeIn>

        {/* Q → A block, 32px spacing above */}
        <FadeIn delay={0.2}>
          <div className="mt-8 flex flex-col items-center" style={{ gap: 12 }}>
            {QA_PAIRS.map(({ q, a }) => (
              <div
                key={q}
                className="w-full max-w-md flex flex-col sm:flex-row sm:items-center sm:justify-center text-center sm:text-left gap-1 sm:gap-3"
              >
                <span className="font-display italic text-foreground text-base sm:text-lg sm:flex-1 sm:text-right">
                  {q}
                </span>
                <span className="text-primary text-lg hidden sm:inline" aria-hidden="true">
                  →
                </span>
                <span className="font-display text-primary text-base sm:text-lg sm:flex-1 sm:text-left">
                  {a}
                </span>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
