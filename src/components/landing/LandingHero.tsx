import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { FadeIn } from './LandingAnimations';
import LandingEmailCapture from './LandingEmailCapture';

const STATS = [
  { v: '7K+', l: 'Products' },
  { v: '130', l: 'Brands' },
  { v: '69', l: 'Retailers' },
];

export default function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center">
      {/* Ambient glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none bg-primary/5 blur-[160px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none bg-primary/[0.03] blur-[160px]" />

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        <div>
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-border bg-secondary/60">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="font-mono text-[10px] tracking-[.2em] uppercase text-muted-foreground">Technical Infrastructure for Fashion Culture</span>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-7">
              Stop Praying<br />
              <span className="text-primary">It Fits.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.16}>
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed max-w-md mb-10 font-light">
              AI biometric scanner maps your exact body to 7,000 pieces across 130 brands. Perfect drape. Verified before checkout.
            </p>
          </FadeIn>

          <FadeIn delay={0.24}>
            <LandingEmailCapture id="hero" buttonText="Map Your Body" />
          </FadeIn>

          <FadeIn delay={0.32}>
            <div className="flex gap-10 mt-14 pt-8 border-t border-border/30">
              {STATS.map((s) => (
                <div key={s.l} className="text-center">
                  <div className="font-display text-3xl font-bold text-primary">{s.v}</div>
                  <div className="font-mono text-[10px] tracking-[.15em] uppercase text-muted-foreground/60 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Phone mockup with scan animation */}
        <FadeIn delay={0.15}>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-0 rounded-full blur-[80px] opacity-15 bg-primary" />
            <div className="relative aspect-[9/19] bg-secondary rounded-[2.5rem] border-[6px] border-border shadow-2xl overflow-hidden">
              {/* Scan line */}
              <div className="absolute left-0 right-0 h-[2px] z-10 animate-[scanPulse_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_16px_hsl(var(--primary)/0.25)]" />
              {/* Silhouette */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-60">
                <svg width="70" height="110" viewBox="0 0 70 110" fill="none">
                  <ellipse cx="35" cy="18" rx="14" ry="16" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.5" />
                  <path d="M10 44 Q10 30 35 30 Q60 30 60 44 L64 85 Q64 105 35 105 Q6 105 6 85 Z" stroke="hsl(var(--primary))" strokeWidth="1" fill="none" opacity="0.35" />
                  <line x1="35" y1="0" x2="35" y2="110" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.2" />
                  <line x1="0" y1="55" x2="70" y2="55" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.2" />
                </svg>
                <span className="font-mono text-[9px] tracking-[.25em] uppercase text-primary opacity-60">Biometric Scan Active</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
