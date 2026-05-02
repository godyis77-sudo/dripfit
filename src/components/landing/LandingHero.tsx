import { ArrowRight, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FadeIn } from './LandingAnimations';
import { useAuth } from '@/hooks/useAuth';
import { useCatalogStats } from '@/hooks/useCatalogStats';
import heroPhoneMockup from '@/assets/hero-phone-mockup.webp';

export default function LandingHero() {
  const { user } = useAuth();
  const stats = useCatalogStats();
  const STATS = [
    { v: stats.brandsLabel, l: 'Brands' },
    { v: stats.sizeChartsLabel, l: 'Size Charts' },
    { v: stats.productsLabel, l: 'Pieces' },
  ];

  return (
    <section className="relative min-h-screen flex items-center">
      {/* Ambient glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none bg-primary/5 blur-[160px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none bg-primary/[0.03] blur-[160px]" />

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-20 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center relative z-10">
        <div className="md:flex-1">
          <FadeIn>
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="type-data text-foreground/70">LIVE</span>
            </div>
          </FadeIn>
          <FadeIn>
            <h1
              className="type-display-editorial leading-[1.05] text-foreground"
              style={{ fontSize: 'clamp(34px, 5.4vw, 64px)' }}
            >
              <span className="block">
                YOUR BODY.{' '}
                <span className="type-display-editorial--italic text-primary">MAPPED.</span>
              </span>
              <span className="block mt-1">
                EVERY BRAND.{' '}
                <span className="type-display-editorial--italic text-primary">SIZED.</span>
              </span>
              <span className="block mt-1">
                EVERY STYLE.{' '}
                <span className="type-display-editorial--italic text-primary">VERIFIED.</span>
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.16}>
            <p className="type-body text-[15px] md:text-lg leading-[1.55] tracking-[-0.005em] max-w-[19rem] md:max-w-md mb-12 mt-6 font-light text-balance">
              Scan once. Try on {stats.productsLabel} pieces. Sized across {stats.brandsLabel} brands. Community Verified Drip.
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
            <div className="flex gap-8 mt-8 pt-6 border-t border-border/30">
              {STATS.map((s) => (
                <div key={s.l}>
                  <div className="type-headline text-2xl text-primary">{s.v}</div>
                  <div className="type-data mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          {/* Phone mockup — mobile only, painted immediately to avoid delayed scroll reveal */}
          <div className="md:hidden relative mx-auto w-full max-w-[260px] mt-10 animate-float">
            <div className="absolute inset-0 rounded-full blur-[80px] opacity-15 bg-primary" />
            <div className="relative rounded-[2rem] border-[10px] border-primary shadow-[0_0_30px_hsl(var(--primary)/0.4)] overflow-hidden">
              <img
                src={heroPhoneMockup}
                alt="DripFit My Sizes screen showing verified size cards for multiple brands"
                className="w-full block"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                width={720}
                height={1290}
              />
            </div>
          </div>
        </div>

        {/* Phone mockup — desktop only, painted immediately to avoid delayed reveal */}
        <div className="hidden md:block relative mx-auto w-full max-w-[280px] lg:max-w-[360px] animate-float">
          <div className="absolute inset-0 rounded-full blur-[80px] opacity-15 bg-primary" />
          <div className="relative rounded-[2rem] border-[10px] border-primary shadow-[0_0_30px_hsl(var(--primary)/0.4)] overflow-hidden">
            <img
              src={heroPhoneMockup}
              alt="DripFit My Sizes screen showing verified size cards for multiple brands"
              className="w-full block"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width={720}
              height={1290}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
