import { Ruler, Shirt, Sparkles, LucideIcon } from 'lucide-react';
import { FadeIn } from './LandingAnimations';

interface Problem {
  n: string;
  icon: LucideIcon;
  problem: string;
  question: string;
  solution: string;
  solutionLabel: string;
  visual: 'returns' | 'confidence' | 'verdict';
}

const PROBLEMS: Problem[] = [
  {
    n: '01',
    icon: Ruler,
    problem: 'Wrong Size',
    question: '"Will it actually fit?"',
    solution: 'The Biometric Scan',
    solutionLabel: 'Your exact measurements, cross-referenced against 389 brand size charts. One scan. Verified size at every brand.',
    visual: 'returns',
  },
  {
    n: '02',
    icon: Shirt,
    problem: 'Wrong Drape',
    question: '"Will it look good on my body?"',
    solution: 'Infinite Drape Studio',
    solutionLabel: 'AR try-on renders every garment on your exact silhouette. See the real drape before you cop. No model. Just you.',
    visual: 'confidence',
  },
  {
    n: '03',
    icon: Sparkles,
    problem: 'Wrong Vibe',
    question: '"Will I actually look hip in this?"',
    solution: 'COP or DROP — Verified',
    solutionLabel: 'Your Body & Style Twins have already worn it. Community verdict. Binary. Decisive. Drip approved or dropped.',
    visual: 'verdict',
  },
];

function ReturnsBars() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground/60 w-16 shrink-0">INDUSTRY</span>
        <div className="flex-1 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
          <div className="h-full bg-muted-foreground/40 rounded-full" style={{ width: '100%' }} />
        </div>
        <span className="font-mono text-[11px] tracking-wider text-muted-foreground/70 w-8 text-right">30%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-wider text-primary/80 w-16 shrink-0">DRIPFIT</span>
        <div className="flex-1 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: '20%' }} />
        </div>
        <span className="font-mono text-[11px] tracking-wider text-primary w-8 text-right">6%</span>
      </div>
      <p className="font-mono text-[10px] tracking-wider text-muted-foreground/50 pt-1">— 80% FEWER SIZE RETURNS</p>
    </div>
  );
}

function ConfidenceDots() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground/60 w-14 shrink-0">BEFORE</span>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/15" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/15" />
        </div>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground/50">GUESSING</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] tracking-wider text-primary/80 w-14 shrink-0">AFTER</span>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="w-2 h-2 rounded-full bg-primary" />
        </div>
        <span className="font-mono text-[10px] tracking-wider text-primary">VERIFIED DRAPE</span>
      </div>
      <p className="font-mono text-[10px] tracking-wider text-muted-foreground/50 pt-1">— SEE IT BEFORE YOU COP</p>
    </div>
  );
}

function VerdictBar() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-wider text-primary">COP · 73%</span>
        <span className="font-mono text-[11px] tracking-wider text-muted-foreground/60">27% · DROP</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary/40">
        <div className="bg-primary" style={{ width: '73%' }} />
        <div className="bg-muted-foreground/40" style={{ width: '27%' }} />
      </div>
      <p className="font-mono text-[10px] tracking-wider text-muted-foreground/50 pt-1">— COMMUNITY VERDICT, BINARY</p>
    </div>
  );
}

function CardVisual({ kind }: { kind: Problem['visual'] }) {
  if (kind === 'returns') return <ReturnsBars />;
  if (kind === 'confidence') return <ConfidenceDots />;
  return <VerdictBar />;
}

export default function LandingProblemCluster() {
  return (
    <section id="problem" className="pt-20 md:pt-28 pb-20 scroll-mt-20">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <FadeIn>
          <span className="type-data block mb-5 text-muted-foreground">The Problem</span>
          <h2
            className="font-display font-bold leading-tight mb-6"
            style={{ fontSize: 'clamp(28px, 5vw, 48px)' }}
          >
            Three Reasons.
            <br />
            <span className="text-muted-foreground/40">Online Shopping Fails.</span>
          </h2>
          <p className="type-body text-[15px] md:text-base leading-relaxed max-w-md mx-auto">
            Every cart abandoned. Every return shipped. Every "meh" outfit. It comes down to three unanswered questions. DripFit answers all three.
          </p>
        </FadeIn>
      </div>

      {/* Three problems → three solutions */}
      <div className="max-w-6xl mx-auto px-6 mt-10 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {PROBLEMS.map((p, i) => (
          <FadeIn key={p.n} delay={i * 0.1}>
            <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-6 md:p-8 h-full flex flex-col">
              {/* Number + icon */}
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <span className="font-mono text-xs tracking-[0.2em] text-muted-foreground/60">
                  {p.n} / 03
                </span>
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center border border-border/50 bg-secondary/40">
                  <p.icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Problem */}
              <h3 className="type-headline text-xl md:text-2xl mb-2 text-foreground">{p.problem}</h3>
              <p className="font-display italic text-sm md:text-base text-muted-foreground/70 mb-4 md:mb-6 leading-snug">
                {p.question}
              </p>

              {/* Inline data visual */}
              <div className="my-4">
                <CardVisual kind={p.visual} />
              </div>

              {/* Divider */}
              <div className="h-px bg-border/40 my-2" />

              {/* Solution */}
              <div className="mt-4 md:mt-6 flex-1 flex flex-col">
                <span className="type-data text-primary/70 mb-2">The Fix</span>
                <h4 className="type-headline text-lg text-primary mb-2">{p.solution}</h4>
                <p className="type-body text-[13px] md:text-sm leading-[1.55] text-muted-foreground/85">
                  {p.solutionLabel}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Industry context — 3-up stat strip */}
      <FadeIn delay={0.4}>
        <div className="max-w-3xl mx-auto px-6 mt-14">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-display font-bold text-2xl text-primary leading-none mb-2">$849.9B</div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase">Annual Returns</div>
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-primary leading-none mb-2">70%</div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase">Fit-Related</div>
            </div>
            <div>
              <div className="font-display font-bold text-2xl text-primary leading-none mb-2">1 in 3</div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase">Items Returned</div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/40 mt-5 text-center">
            Source: National Retail Federation 2025, McKinsey Returns Survey
          </p>
        </div>
      </FadeIn>
    </section>
  );
}
