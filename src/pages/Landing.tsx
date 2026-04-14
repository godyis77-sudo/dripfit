import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import { setGuestMode } from '@/lib/session';
import BrandLogo from '@/components/ui/BrandLogo';
import LandingHero from '@/components/landing/LandingHero';
import LandingCommunityVerdict from '@/components/landing/LandingCommunityVerdict';
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const handleGuestMode = () => {
    setGuestMode();
    navigate('/home');
  };

  usePageMeta({
    title: 'DripFit — Know Your Fit',
    description: 'AI-powered body mapping, virtual try-on, and verified sizing across 186 brands. End the cycle of returns.',
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
              <a key={t} href={`#${t.toLowerCase().replace(/ /g, '-')}`} className="text-muted-foreground hover:text-foreground transition-colors text-xs tracking-[.15em] uppercase font-medium whitespace-nowrap">
                {t}
              </a>
            ))}
          </div>
          {user ? (
            <Link
              to="/home"
              className="px-5 py-2 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform duration-300"
            >
              Enter App
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/auth?mode=signin"
                className="px-4 py-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="px-5 py-2 text-xs font-semibold tracking-wider uppercase rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform duration-300"
              >
                Sign Up Free
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* HERO */}
      <LandingHero />

      {/* SOCIAL PROOF BAR */}
      <div className="border-y border-border/30 py-5">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center gap-8 md:gap-14 flex-wrap">
          {PROOF_TAGS.map((t) => (
            <span key={t} className="text-[11px] tracking-[.18em] uppercase text-muted-foreground/40 font-semibold">{t}</span>
          ))}
        </div>
      </div>

      {/* LIVE COMMUNITY VERDICT */}
      <LandingCommunityVerdict />

      {/* PROBLEM */}
      <section className="pt-20 md:pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <FadeIn>
            <span className="font-mono text-[10px] tracking-[.22em] uppercase text-muted-foreground/60 block mb-5">The Problem</span>
            <h2 className="font-display font-bold leading-tight mb-6" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
              Ordering Three Sizes.<br />
              <span className="text-muted-foreground/40">Returning Two.</span>
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed max-w-lg mx-auto">
              The grail piece drops. You cop three sizes because every brand fits different. Two go back. Money locked. Drip delayed. Dead returns piling up.
            </p>
          </FadeIn>
        </div>
        <div className="max-w-5xl mx-auto px-6 mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
          {STATS.map((d, i) => (
            <FadeIn key={d.label} delay={i * 0.08}>
              <div className="bg-[hsl(var(--surface-glass)/0.03)] backdrop-blur-xl border border-border/40 rounded-2xl p-8 text-center">
                <div className="font-display text-3xl font-bold text-primary mb-2">{d.stat}</div>
                <div className="text-sm text-muted-foreground">{d.label}</div>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.3}>
          <p className="text-[11px] text-muted-foreground/30 text-right max-w-5xl mx-auto px-6 mt-3">
            ¹ National Retail Federation, 2023 Returns Report
          </p>
        </FadeIn>
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
      <footer className="border-t border-border/30 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <BrandLogo size="sm" className="opacity-50" />
          <span className="text-xs text-muted-foreground/50 text-center">Discover styles. Verify size. Drip checked. © 2026</span>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors whitespace-nowrap">Privacy</Link>
            <Link to="/terms" className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors whitespace-nowrap">Terms</Link>
            <a href="mailto:hello@dripfit.app" className="text-xs text-muted-foreground/50 hover:text-foreground transition-colors whitespace-nowrap">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
