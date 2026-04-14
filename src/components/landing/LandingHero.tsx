import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FadeIn } from './LandingAnimations';
import { useAuth } from '@/hooks/useAuth';
import heroPhoneMockup from '@/assets/hero-phone-mockup.jpg';

const STATS = [
  { v: '9,000+', l: 'Products' },
  { v: '186', l: 'Brands' },
  { v: '389', l: 'Size Charts' },
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full border border-border bg-secondary/60">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="type-data">Technical Infrastructure for Fashion Culture</span>
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <h1 className="type-brand leading-[1.05] mb-7" style={{ letterSpacing: '-0.02em', fontSize: 'clamp(40px, 6vw, 72px)' }}>
              Stop Praying<br />
              <span className="text-primary">It Fits.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.16}>
            <p className="type-body text-lg md:text-xl leading-relaxed max-w-md mb-10 font-light">
              Your body. Mapped. 9,000+ pieces. 186 brands. Perfect drape. Verified before checkout.
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
                  className="w-full bg-[#C49A00] text-[#0A0A0A] font-bold rounded-full py-4 px-8 text-base tracking-wide flex items-center justify-center gap-2 hover:bg-[#D4AF37] transition-colors duration-200"
                >
                  Sign Up Free <ArrowRight className="h-4 w-4" />
                </Link>
                <span className="text-xs text-center text-[#666666] mt-2 w-full">Your biometric data is encrypted and never sold.</span>
              </div>
            )}
          </FadeIn>

          <FadeIn delay={0.32}>
            <div className="flex gap-10 mt-14 pt-8 border-t border-border/30">
              {STATS.map((s) => (
                <div key={s.l} className="text-center">
                  <div className="type-headline text-3xl text-primary">{s.v}</div>
                  <div className="type-data mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Phone mockup with My Sizes screenshot */}
        <FadeIn delay={0.15}>
        <div className="relative mx-auto w-full max-w-[272px]">
            <div className="absolute inset-0 rounded-full blur-[80px] opacity-15 bg-primary" />
            <div className="relative rounded-[2rem] border-[3px] border-[#8B7A2E] shadow-2xl overflow-hidden">
              <img
                src={heroPhoneMockup}
                alt="DripFit My Sizes screen showing verified size cards for multiple brands"
                className="w-full block"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
