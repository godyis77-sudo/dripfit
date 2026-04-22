import { Link } from 'react-router-dom';
import { Instagram, Music2, Twitter } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BrandLogo from '@/components/ui/BrandLogo';
import LandingNav from '@/components/landing/LandingNav';
import LandingHero from '@/components/landing/LandingHero';
import LandingStatsTicker from '@/components/landing/LandingStatsTicker';
import LandingProblemCluster from '@/components/landing/LandingProblemCluster';
import LandingCommunityVerdict from '@/components/landing/LandingCommunityVerdict';
import LandingFeatures from '@/components/landing/LandingFeatures';

import LandingHowItWorks from '@/components/landing/LandingHowItWorks';

import LandingCommunity from '@/components/landing/LandingCommunity';
import LandingFAQ from '@/components/landing/LandingFAQ';
import LandingPricing from '@/components/landing/LandingPricing';
import LandingTestimonials from '@/components/landing/LandingTestimonials';
import LandingFinalCTA from '@/components/landing/LandingFinalCTA';
import LandingStickyCTA from '@/components/landing/LandingStickyCTA';

export default function Landing() {
  usePageMeta({
    title: 'DripFit — Know Your Fit',
    description:
      'AI-powered body mapping, virtual try-on, and verified sizing across 186 brands. End the cycle of returns.',
    path: '/landing',
  });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-secondary">
      <LandingNav />

      {/* HERO */}
      <LandingHero />

      {/* PROOF TICKER */}
      <LandingStatsTicker />

      {/* ═══ PROBLEM CLUSTER ═══ */}
      <LandingProblemCluster />

      {/* HOW IT WORKS — the cure */}
      <LandingHowItWorks />

      {/* FEATURES — grid */}
      <LandingFeatures />

      {/* ═══ PROOF CLUSTER ═══ Verdict (data) → Community (system) → Testimonials (voice) */}
      <div id="proof" className="scroll-mt-20">
        <LandingCommunityVerdict />
        <LandingCommunity />
        <LandingTestimonials />
      </div>

      {/* PRICING */}
      <LandingPricing />

      {/* FAQ */}
      <LandingFAQ />

      {/* FINAL CTA */}
      <LandingFinalCTA />

      {/* FOOTER */}
      <footer className="border-t border-border/30 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-5">
          {/* Social icons */}
          <div className="flex items-center justify-center" style={{ gap: 16 }}>
            <a
              href="#"
              aria-label="Instagram"
              className="text-primary hover:opacity-80 transition-opacity"
            >
              <Instagram size={20} />
            </a>
            <a
              href="#"
              aria-label="TikTok"
              className="text-primary hover:opacity-80 transition-opacity"
            >
              <Music2 size={20} />
            </a>
            <a
              href="#"
              aria-label="X (Twitter)"
              className="text-primary hover:opacity-80 transition-opacity"
            >
              <Twitter size={20} />
            </a>
          </div>

          <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4">
            <BrandLogo size="sm" className="opacity-50" />
            <span className="text-xs text-muted-foreground/85 text-center">
              DripFit — Know your fit. © 2026
            </span>
            <div className="flex gap-6">
              <Link
                to="/privacy"
                className="text-xs text-muted-foreground/85 hover:text-foreground transition-colors whitespace-nowrap"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-xs text-muted-foreground/85 hover:text-foreground transition-colors whitespace-nowrap"
              >
                Terms
              </Link>
              <a
                href="mailto:hello@dripfitcheck.com"
                className="text-xs text-muted-foreground/85 hover:text-foreground transition-colors whitespace-nowrap"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Sticky bottom CTA — appears after hero */}
      <LandingStickyCTA />
    </div>
  );
}
