import { ArrowRight, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FadeIn } from './LandingAnimations';
import { useAuth } from '@/hooks/useAuth';
import heroPhoneMockup from '@/assets/hero-phone-mockup.jpg';

const STATS = [
  { v: '186', l: 'Brands' },
  { v: '389', l: 'Size Charts' },
  { v: '9,000+', l: 'Pieces' },
];

export default function LandingHero() {
  const { user } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center">
      {/* Ambient glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none bg-primary/5 blur-[160px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none bg-primary/[0.03] blur-[160px]" />

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        <div>
          <FadeIn>
            <h1
              className="type-display-editorial leading-[1.05] text-foreground"
              style={{ fontSize: 'clamp(36px, 7vw, 78px)' }}
            >
              <span className="block">
                YOUR BODY.{' '}
                <span className="type-display-editorial--italic text-primary">MAPPED.</span>
              </span>
              <span className="block mt-1">
                EVERY BRAND.{' '}
                <span className="type-display-editorial--italic text-primary">FITTED.</span>
              </span>
              <span className="block mt-1">
                EVERY STYLE.{' '}
                <span className="type-display-editorial--italic text-primary">VERIFIED.</span>
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.16}>
            <p className="type-body text-base md:text-lg leading-relaxed max-w-md mb-10 mt-6 font-light">
              Scan once. Try on 9,000+ pieces across 186 brands. Verified by members built like you.
            </p>
          </FadeIn>

          <FadeIn delay={0.24}>
            {user ? (
              <Link
                to="/home"
                className="inline-flex items-center gap-2 h-13 px-8 rounded-full bg-foreground text-background font-medium text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                Enter App <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div className="flex flex-col items-start gap-0 w-full max-w-md">
                <Link
                  to="/auth"
                  className="w-full bg-primary text-primary-foreground font-bold rounded-full py-4 px-8 text-base tracking-wide flex items-center justify-center gap-2 hover:opacity-90 transition-opacity duration-200"
                >
                  Start Your Scan <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/home"
                  className="w-full mt-3 border border-primary text-primary bg-transparent rounded-full px-6 py-2 text-sm font-medium tracking-wide flex items-center justify-center hover:bg-primary/10 transition-colors duration-200"
                >
                  Try as guest
                </Link>
                <div className="w-full inline-flex items-center justify-center gap-1.5 mt-3 text-[11px] text-muted-foreground/85">
                  <Lock className="h-3 w-3 text-primary/70" />
                  <span>Biometric data encrypted end-to-end. Never sold.</span>
                </div>
              </div>
            )}
          </FadeIn>

          <FadeIn delay={0.32}>
            <div className="flex gap-10 mt-8 pt-8 border-t border-border/30">
              {STATS.map((s) => (
                <div key={s.l} className="text-center">
                  <div className="type-headline text-3xl text-primary">{s.v}</div>
                  <div className="type-data mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Phone mockup */}
        <FadeIn delay={0.15}>
          <div className="relative mx-auto w-full max-w-[280px] lg:max-w-[360px] animate-float">
            <div className="absolute inset-0 rounded-full blur-[80px] opacity-15 bg-primary" />
            <div className="relative rounded-[2rem] border-[10px] border-primary shadow-[0_0_30px_hsl(var(--primary)/0.4)] overflow-hidden">
              <img
                src={heroPhoneMockup}
                alt="DripFit My Sizes screen showing verified size cards for multiple brands"
                className="w-full block"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
