import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import { setGuestMode } from '@/lib/session';
import BrandLogo from '@/components/ui/BrandLogo';
import LandingHero from '@/components/landing/LandingHero';
import LandingCommunityVerdict from '@/components/landing/LandingCommunityVerdict';
import LandingFeatures from '@/components/landing/LandingFeatures';
import LandingRootCause from '@/components/landing/LandingRootCause';
import LandingHowItWorks from '@/components/landing/LandingHowItWorks';
import LandingMarket from '@/components/landing/LandingMarket';
import LandingCommunity from '@/components/landing/LandingCommunity';
import LandingFAQ from '@/components/landing/LandingFAQ';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingTestimonials from '@/components/landing/LandingTestimonials';
import LandingFinalCTA from '@/components/landing/LandingFinalCTA';
import { FadeIn } from '@/components/landing/LandingAnimations';

/* ── Problem stats ── */
const STATS = [
  { stat: '$849.9B', label: 'Global fashion returns annually' },
  { stat: '30%', label: 'Of online orders get returned' },
  { stat: '70%', label: 'Returned due to size or fit' },
];

const RETURN_BARS = [
  { label: 'Apparel & Fashion', pct: 33, range: '25–40%', hero: true },
  { label: 'Footwear', pct: 18, range: '18%', hero: false },
  { label: 'Home Goods', pct: 17, range: '15–20%', hero: false },
  { label: 'Electronics', pct: 11, range: '11%', hero: false },
  { label: 'Beauty', pct: 7, range: '4–10%', hero: false },
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
            {[
              { label: 'Scan.', href: '#features' },
              { label: 'Drape.', href: '#how-it-works' },
              { label: 'Twins.', href: '#community' },
            ].map((item) => (
              <a key={item.label} href={item.href} className="text-muted-foreground hover:text-foreground transition-colors text-xs tracking-[.15em] uppercase font-medium whitespace-nowrap">
                {item.label}
              </a>
            ))}
          </div>
          {user ? (
            <Link
              to="/home"
              className="px-5 py-2 text-sm font-semibold tracking-wide rounded-full border border-primary/40 text-primary bg-transparent hover:bg-primary/10 transition-colors duration-300"
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
                className="px-5 py-2 text-xs font-semibold tracking-wide rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform duration-300"
              >
                Sign Up Free
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* HERO */}
      <LandingHero />

      {/* PROOF TICKER / STATS BAR */}
      <div
        className="relative overflow-hidden select-none pointer-events-none"
        aria-hidden="true"
        style={{
          height: 42,
          background: 'rgba(212,175,55,0.08)',
          borderTop: '0.5px solid rgba(212,175,55,0.3)',
          borderBottom: '0.5px solid rgba(212,175,55,0.3)',
        }}
      >
        <div className="flex items-center h-full animate-ticker whitespace-nowrap">
          {[0, 1].map((dup) => (
            <span key={dup} className="flex items-center gap-0 shrink-0">
              {[
                'APPAREL RETURN RATE: 25–40%',
                '70% OF RETURNS ARE FIT-RELATED',
                '47% OF SHOPPERS AVOID ONLINE FASHION DUE TO FIT UNCERTAINTY',
                '$849.9B IN RETURNS PROCESSED IN 2025',
                '$46 AVERAGE COST PER RETURNED ITEM',
                '1 IN 4 ORDERS INCLUDES A BRACKETED SIZE',
              ].map((t) => (
                <span key={t} className="font-mono text-[11px] tracking-[.14em] uppercase px-6" style={{ color: '#D4AF37' }}>
                  {t}<span className="ml-6 opacity-50">·</span>
                </span>
              ))}
              <span className="font-mono text-[11px] tracking-[.14em] uppercase font-bold px-6" style={{ color: '#D4AF37' }}>
                DRIPFIT ELIMINATES ALL OF THE ABOVE <span style={{ color: '#D4AF37', fontWeight: 800 }}>✓</span>
                <span className="ml-6 opacity-50">·</span>
              </span>
            </span>
          ))}
        </div>
      </div>
      <p className="sr-only">Apparel return rate: 25–40%. 70% of returns are fit-related. 47% of shoppers avoid online fashion due to fit uncertainty. $849.9B in returns processed in 2025. $46 average cost per returned item. 1 in 4 orders includes a bracketed size.</p>

      {/* ═══ THE PROBLEM CLUSTER ═══ */}
      {/* ECOSYSTEM / PROBLEM STATS */}
      <section className="pt-20 md:pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <FadeIn>
            <span className="font-mono text-xs tracking-[.18em] uppercase text-[#AAAAAA] block mb-5">The Problem</span>
            <h2 className="font-display font-bold leading-tight mb-6" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
              Ordering Three Sizes.<br />
              <span className="text-muted-foreground/40">Returning Two.</span>
            </h2>
            <p className="text-muted-foreground/80 text-base leading-relaxed max-w-lg mx-auto">
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
          <p className="text-xs text-muted-foreground/50 text-right max-w-5xl mx-auto px-6 mt-3">
            ¹ National Retail Federation, 2025 Returns Report
          </p>
        </FadeIn>

        {/* HORIZONTAL BAR CHART */}
        <div className="max-w-5xl mx-auto px-6 mt-14">
          <FadeIn delay={0.1}>
            <span className="font-mono text-xs tracking-[.18em] uppercase text-[#AAAAAA] block mb-6">Apparel Leads Every Category</span>
          </FadeIn>
          <div className="space-y-4 pb-4">
            {RETURN_BARS.map((bar, i) => (
              <FadeIn key={bar.label} delay={0.15 + i * 0.06}>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs tracking-wider uppercase text-foreground/90 w-[140px] shrink-0 text-right">{bar.label}</span>
                  <div className="flex-1 h-7 rounded-sm overflow-hidden" style={{ background: '#1A1A1A' }}>
                    <div
                      className="h-full rounded-sm transition-all duration-[800ms] ease-out"
                      style={{
                        width: `${bar.pct * 2.5}%`,
                        background: bar.hero ? 'hsl(var(--primary))' : '#2D2D2D',
                      }}
                    />
                  </div>
                  <span
                    className="font-mono text-xs tracking-wider w-[52px] shrink-0"
                    style={{ color: bar.hero ? 'hsl(var(--primary))' : '#6B6B6B' }}
                  >
                    {bar.range}
                  </span>
                </div>
              </FadeIn>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/40 text-right mt-4">
            Source: McKinsey Returns Survey, Shopify 2025 Ecommerce Report
          </p>
        </div>
      </section>

      {/* ROOT CAUSE — donut (part of Problem cluster) */}
      <LandingRootCause />

      {/* MARKET — line chart (part of Problem cluster) */}
      <LandingMarket />

      {/* HOW IT WORKS — the cure */}
      <LandingHowItWorks />

      {/* FEATURES — 4-up grid */}
      <LandingFeatures />

      {/* ═══ PROOF CLUSTER ═══ */}
      {/* LIVE COMMUNITY VERDICT */}
      <LandingCommunityVerdict />

      {/* TESTIMONIALS */}
      <LandingTestimonials />

      {/* COMMUNITY */}
      <LandingCommunity />

      {/* PRICING — surfaced after proof */}
      <LandingPricing />

      {/* FAQ */}
      <LandingFAQ />

      {/* FINAL CTA */}
      <LandingFinalCTA />

      {/* FOOTER */}
      <footer className="border-t border-border/30 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <BrandLogo size="sm" className="opacity-50" />
          <span className="text-xs text-muted-foreground/60 text-center">DripFit — Know your fit. © 2026</span>
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
