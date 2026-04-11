import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import BrandLogo from '@/components/ui/BrandLogo';
import LandingHero from '@/components/landing/LandingHero';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingCommunity from '@/components/landing/LandingCommunity';
import LandingFAQ from '@/components/landing/LandingFAQ';
import LandingFinalCTA from '@/components/landing/LandingFinalCTA';
import { FadeIn } from '@/components/landing/LandingAnimations';

/* ── Social proof marquee ── */
const PROOF_TAGS = ['AI Body Scan', 'AR Try-On', 'Body Twins', 'Style Twins', 'COP/DROP', 'Size Verification'];

/* ── Problem stats ── */
const STATS = [
  { stat: '$816B', label: 'Global fashion returns annually' },
  { stat: '30%', label: 'Of online orders get returned' },
  { stat: '70%', label: 'Returned due to size or fit' },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  usePageMeta({
    title: 'DripFit — Know Your Fit',
    description: 'AI-powered body mapping, virtual try-on, and verified sizing across 130+ brands. End the cycle of returns.',
    path: '/landing',
  });

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-secondary">

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-xl border-b border-border/30' : 'bg-transparent border-b border-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <BrandLogo size="sm" />
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How It Works', 'Community'].map((t) => (
              <a key={t} href={`#${t.toLowerCase().replace(/ /g, '-')}`} className="text-muted-foreground hover:text-foreground transition-colors text-xs tracking-[.15em] uppercase font-medium">
                {t}
              </a>
            ))}
          </div>
          <Link
            to="/auth"
            className="px-5 py-2 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform duration-300"
          >
            Get the Cheat Code
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <LandingHero />

      {/* SOCIAL PROOF BAR */}
      <div className="border-y border-border/20 py-5">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center gap-6 md:gap-12 flex-wrap">
          {PROOF_TAGS.map((t, i) => (
            <span key={t} className="text-[10px] tracking-[.2em] uppercase text-muted-foreground/60 font-medium flex items-center gap-3">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-primary/30" />}
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* PROBLEM */}
      <section className="py-24 md:py-36">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <FadeIn>
            <span className="type-data block mb-4 text-primary/60 tracking-[.25em]">The Problem</span>
            <h2 className="type-headline text-3xl md:text-5xl leading-tight mb-6 tracking-[-0.02em]">
              Ordering Three Sizes.<br />
              <span className="text-muted-foreground/30">Returning Two.</span>
            </h2>
            <p className="text-muted-foreground/70 text-base leading-[1.7] max-w-lg mx-auto">
              The grail piece drops. You cop three sizes because every brand fits different. Two go back. Money locked. Drip delayed.
            </p>
          </FadeIn>
        </div>
        <div className="max-w-5xl mx-auto px-6 mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {STATS.map((d, i) => (
            <FadeIn key={d.label} delay={i * 0.08}>
              <div className="rounded-2xl p-8 text-center border border-border/30 bg-secondary/20 hover:border-primary/15 transition-all duration-500">
                <div className="type-headline text-3xl text-primary mb-2 tracking-tight">{d.stat}</div>
                <div className="text-[13px] text-muted-foreground/60">{d.label}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <LandingFeatures />

      {/* HOW IT WORKS */}
      <LandingHowItWorks />

      {/* COMMUNITY */}
      <LandingCommunity />

      {/* FAQ */}
      <LandingFAQ />

      {/* FINAL CTA */}
      <LandingFinalCTA />

      {/* FOOTER */}
      <footer className="border-t border-border/30 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <BrandLogo size="sm" className="opacity-50" />
          <span className="text-xs text-muted-foreground/50">Discover styles. Verify size. Drip checked. © 2026</span>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors">Terms</Link>
            <a href="mailto:hello@dripfit.app" className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
