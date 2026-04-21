import { Ruler, Shirt, Sparkles, LucideIcon } from 'lucide-react';
import { FadeIn } from './LandingAnimations';

interface Problem {
  n: string;
  icon: LucideIcon;
  problem: string;
  question: string;
  solution: string;
  solutionLabel: string;
}

const PROBLEMS: Problem[] = [
  {
    n: '01',
    icon: Ruler,
    problem: 'Wrong Size',
    question: '"Will it actually fit?"',
    solution: 'The Biometric Scan',
    solutionLabel: 'Your exact measurements, cross-referenced against 389 brand size charts. One scan. Verified size at every brand.',
  },
  {
    n: '02',
    icon: Shirt,
    problem: 'Wrong Drape',
    question: '"Will it look good on my body?"',
    solution: 'Infinite Drape Studio',
    solutionLabel: 'AR try-on renders every garment on your exact silhouette. See the real drape before you cop. No model. Just you.',
  },
  {
    n: '03',
    icon: Sparkles,
    problem: 'Wrong Vibe',
    question: '"Will I actually look hip in this?"',
    solution: 'COP or DROP — Verified',
    solutionLabel: 'Your Body & Style Twins have already worn it. Community verdict. Binary. Decisive. Drip approved or dropped.',
  },
];

export default function LandingProblemCluster() {
  return (
    <section id="problem" className="pt-20 md:pt-28 pb-20 scroll-mt-20">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <FadeIn>
          <span className="type-data block mb-5 text-muted-foreground">The Problem</span>
          <h2
            className="font-display font-bold leading-tight mb-6"
            style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}
          >
            Three Reasons.
            <br />
            <span className="text-muted-foreground/40">Online Shopping Fails.</span>
          </h2>
          <p className="type-body text-base leading-relaxed max-w-lg mx-auto">
            Every cart abandoned. Every return shipped. Every "meh" outfit. It comes down to three unanswered questions. DripFit answers all three.
          </p>
        </FadeIn>
      </div>

      {/* Three problems → three solutions */}
      <div className="max-w-6xl mx-auto px-6 mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
        {PROBLEMS.map((p, i) => (
          <FadeIn key={p.n} delay={i * 0.1}>
            <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-8 h-full flex flex-col">
              {/* Number + icon */}
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground/60">
                  {p.n} / 03
                </span>
                <div className="w-10 h-10 rounded-full flex items-center justify-center border border-border/50 bg-secondary/40">
                  <p.icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Problem */}
              <h3 className="type-headline text-2xl mb-2 text-foreground">{p.problem}</h3>
              <p className="font-display italic text-base text-muted-foreground/70 mb-6 leading-snug">
                {p.question}
              </p>

              {/* Divider */}
              <div className="h-px bg-border/40 my-2" />

              {/* Solution */}
              <div className="mt-6 flex-1 flex flex-col">
                <span className="type-data text-primary/70 mb-2">The Fix</span>
                <h4 className="type-headline text-lg text-primary mb-3">{p.solution}</h4>
                <p className="type-body text-sm leading-relaxed text-muted-foreground/85" style={{ fontSize: 14 }}>
                  {p.solutionLabel}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Industry context — supporting stat */}
      <FadeIn delay={0.4}>
        <div className="max-w-3xl mx-auto px-6 mt-14 text-center">
          <p className="type-body text-sm text-muted-foreground/70 leading-relaxed">
            <span className="text-primary font-medium">$849.9B</span> in global fashion returns annually.{' '}
            <span className="text-foreground/80">70%</span> due to size, fit, or "didn't look right." DripFit fixes the entire chain.
          </p>
          <p className="text-[11px] text-muted-foreground/40 mt-3">
            Source: National Retail Federation 2025, McKinsey Returns Survey
          </p>
        </div>
      </FadeIn>
    </section>
  );
}
