import { Link } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { FadeIn } from './LandingAnimations';

const FREE_FEATURES = [
  '3 try-ons per month',
  'Top 20 brand size sync',
  'Body Twin matching',
  'COP or DROP access',
  'Basic fit verification',
];

const PREMIUM_FEATURES = [
  'Unlimited Infinite Drape Studio access',
  '186+ brand size map',
  'Priority scan queue',
  'Side-by-side fit comparison',
  'Advanced fit analytics',
  'Early access to new features',
  'Crown badge',
];

export default function LandingPricing() {
  return (
    <section id="pricing" className="py-20 md:py-24 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn>
          <span className="type-data block mb-5 text-center text-muted-foreground">Pricing</span>
          <h2
            className="type-headline font-bold leading-tight mb-14 text-center"
            style={{ letterSpacing: '-0.01em', fontSize: 'clamp(32px, 4vw, 48px)' }}
          >
            Start Free.<br />
            <span className="text-muted-foreground/85">Upgrade When You Outgrow It.</span>
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* FREE */}
          <FadeIn delay={0.08}>
            <div className="rounded-2xl border border-border/40 bg-card p-8 flex flex-col h-full">
              <span className="type-data mb-4 text-muted-foreground/85">Free</span>
              <div className="font-display text-4xl font-bold mb-8">$0</div>
              <ul className="space-y-3 mb-10 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground/85">
                    <Check className="h-4 w-4 mt-0.5 text-muted-foreground/85 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="w-full bg-transparent text-foreground border border-primary/40 rounded-full py-3 px-6 text-sm font-semibold text-center hover:bg-primary/10 transition-colors duration-200"
              >
                Start Your Scan
              </Link>
            </div>
          </FadeIn>

          {/* PREMIUM */}
          <FadeIn delay={0.16}>
            <div className="relative rounded-2xl border border-primary/60 bg-card p-8 flex flex-col h-full">
              {/* Badge */}
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[.15em] bg-primary text-primary-foreground">
                Most Popular
              </span>

              <span className="type-data mb-4 text-primary flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> DripFit Pro
              </span>
              <div className="font-display text-4xl font-bold mb-1">$4.17<span className="text-lg font-normal text-muted-foreground">/mo</span></div>
              <p className="text-xs text-muted-foreground/85 mb-1">$49.99 billed annually · $7.99 month-to-month</p>
              <p className="text-[10px] font-mono tracking-[.18em] uppercase text-primary/80 mb-8">Save 48%</p>
              <ul className="space-y-3 mb-10 flex-1">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground/85">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="w-full bg-primary text-primary-foreground font-bold rounded-full py-3 px-6 text-sm text-center hover:opacity-90 transition-opacity duration-200"
              >
                Start 7-Day Free Trial
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
