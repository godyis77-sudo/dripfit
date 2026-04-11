import { motion } from 'framer-motion';
import { FadeIn } from './LandingAnimations';
import LandingEmailCapture from './LandingEmailCapture';

const STATS = [
  { v: '7K+', l: 'Products' },
  { v: '130', l: 'Brands' },
  { v: '69', l: 'Retailers' },
];

export default function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-end lg:items-center pb-16 lg:pb-0">
      {/* Cinematic ambient layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-15%] w-[700px] h-[700px] rounded-full bg-primary/[0.06] blur-[200px]" />
        <div className="absolute bottom-[-30%] left-[-20%] w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[180px]" />
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-28 lg:pt-32 pb-12 lg:pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10 w-full">
        <div>
          <FadeIn>
            <div className="inline-flex items-center gap-2.5 px-4 py-2 mb-10 rounded-full border border-primary/15 bg-primary/[0.04]">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="type-data text-primary/80">Technical Infrastructure for Fashion Culture</span>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <h1 className="type-brand text-[clamp(2.8rem,8vw,5rem)] leading-[1.02] mb-8 tracking-[-0.03em]">
              Stop Praying<br />
              <span className="text-primary">It Fits.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.16}>
            <p className="type-body text-base md:text-lg leading-[1.7] max-w-[420px] mb-12 text-muted-foreground">
              AI biometric scanner maps your exact body to 7,000 pieces across 130 brands. Perfect drape. Verified before checkout.
            </p>
          </FadeIn>

          <FadeIn delay={0.24}>
            <LandingEmailCapture id="hero" buttonText="Map Your Body" />
          </FadeIn>

          <FadeIn delay={0.32}>
            <div className="flex gap-12 mt-16 pt-8 border-t border-border/20">
              {STATS.map((s) => (
                <div key={s.l}>
                  <div className="type-headline text-3xl text-primary tracking-tight">{s.v}</div>
                  <div className="type-data mt-1.5 text-muted-foreground/50">{s.l}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Elevated phone mockup with depth */}
        <FadeIn delay={0.15}>
          <div className="relative mx-auto w-full max-w-[320px]">
            {/* Glow behind device */}
            <div className="absolute inset-[-20%] rounded-[50%] blur-[100px] opacity-[0.12] bg-primary" />
            {/* Shadow beneath */}
            <div className="absolute bottom-[-8%] left-[10%] right-[10%] h-[30%] rounded-[50%] blur-[40px] opacity-20 bg-black" />
            
            <div className="relative aspect-[9/19] bg-[hsl(220,12%,6%)] rounded-[2.5rem] border border-border/50 shadow-[0_25px_60px_-15px_hsl(var(--shadow-luxury)),inset_0_1px_0_0_hsl(var(--foreground)/0.06)] overflow-hidden">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[35%] h-[28px] bg-[hsl(220,12%,6%)] rounded-b-2xl z-20" />
              
              {/* Scan line — more visible */}
              <motion.div 
                className="absolute left-0 right-0 h-[2px] z-10 bg-gradient-to-r from-transparent via-primary to-transparent"
                style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.4), 0 0 60px hsl(var(--primary) / 0.15)' }}
                animate={{ top: ['10%', '85%', '10%'] }}
                transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
              />
              
              {/* Body wireframe — refined */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <svg width="80" height="130" viewBox="0 0 80 130" fill="none" className="opacity-40">
                  {/* Head */}
                  <ellipse cx="40" cy="20" rx="12" ry="14" stroke="hsl(var(--primary))" strokeWidth="0.75" />
                  {/* Neck */}
                  <line x1="40" y1="34" x2="40" y2="42" stroke="hsl(var(--primary))" strokeWidth="0.75" />
                  {/* Shoulders */}
                  <line x1="15" y1="48" x2="65" y2="48" stroke="hsl(var(--primary))" strokeWidth="0.75" />
                  {/* Torso */}
                  <path d="M15 48 L12 85 Q12 90 20 92 L60 92 Q68 90 68 85 L65 48" stroke="hsl(var(--primary))" strokeWidth="0.75" fill="none" />
                  {/* Left arm */}
                  <path d="M15 48 L6 75 L8 95" stroke="hsl(var(--primary))" strokeWidth="0.75" fill="none" />
                  {/* Right arm */}
                  <path d="M65 48 L74 75 L72 95" stroke="hsl(var(--primary))" strokeWidth="0.75" fill="none" />
                  {/* Left leg */}
                  <path d="M28 92 L24 125" stroke="hsl(var(--primary))" strokeWidth="0.75" fill="none" />
                  {/* Right leg */}
                  <path d="M52 92 L56 125" stroke="hsl(var(--primary))" strokeWidth="0.75" fill="none" />
                  {/* Measurement lines */}
                  <line x1="0" y1="48" x2="80" y2="48" stroke="hsl(var(--primary))" strokeWidth="0.3" strokeDasharray="3 5" opacity="0.3" />
                  <line x1="0" y1="70" x2="80" y2="70" stroke="hsl(var(--primary))" strokeWidth="0.3" strokeDasharray="3 5" opacity="0.3" />
                  <line x1="0" y1="92" x2="80" y2="92" stroke="hsl(var(--primary))" strokeWidth="0.3" strokeDasharray="3 5" opacity="0.3" />
                  <line x1="40" y1="0" x2="40" y2="130" stroke="hsl(var(--primary))" strokeWidth="0.3" strokeDasharray="3 5" opacity="0.15" />
                </svg>
                
                {/* Data readouts */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-mono text-[8px] tracking-[.3em] uppercase text-primary/50">Biometric Scan</span>
                  <div className="flex gap-3">
                    {['Chest 96cm', 'Waist 78cm', 'Hip 94cm'].map((m) => (
                      <motion.span
                        key={m}
                        className="font-mono text-[7px] text-primary/30"
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
                      >
                        {m}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
