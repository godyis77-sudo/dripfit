import { Link } from 'react-router-dom';
import { Sparkles, DollarSign, Link2, BarChart3, Wallet, ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BrandLogo from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const HOW_IT_WORKS = [
  { icon: Link2, title: 'Get Your Link', desc: 'Approved creators receive a unique referral URL and custom promo codes that drop 10 bonus try-ons for every redeemer.' },
  { icon: Sparkles, title: 'Share The Drop', desc: 'Post fits, link in bio, share with your community. Every install attributed to you tracks automatically — no pixels, no plugins.' },
  { icon: BarChart3, title: 'Track In Real Time', desc: 'Your dashboard shows installs, conversions, monthly tier progress, and pending earnings — updated the moment they happen.' },
  { icon: Wallet, title: 'Get Paid', desc: 'Request payout once you hit $25. PayPal or bank transfer. Processed within 7 business days.' },
];

const TIERS = [
  { label: 'BASE TIER', rate: '$0.50', unit: 'per install', detail: 'First 99 verified installs each calendar month.' },
  { label: 'BONUS TIER', rate: '$1.50', unit: 'per install', detail: 'Auto-unlocks at install #100. Resets monthly.', highlight: true },
];

const PERKS = [
  'Custom promo code dropping 10 bonus try-ons for your audience',
  'Real-time dashboard with install, conversion, and earnings data',
  'Lifetime Premium access while active in the program',
  'Early access to new features, drops, and editorial campaigns',
  'Priority support and direct line to the founding team',
];

const FAQ = [
  { q: 'Who qualifies?', a: 'Style creators, stylists, fashion editors, and community builders with an engaged audience. We look at fit, not follower count.' },
  { q: 'When do I get paid?', a: 'Once your pending balance hits $25. Submit a payout request from your dashboard — processed within 7 business days.' },
  { q: 'How is attribution tracked?', a: 'Each creator gets a unique referral URL and promo code. Both are tied to your account on install — no third-party cookies required.' },
  { q: 'Can I be removed from the program?', a: 'Yes. Fraudulent installs, self-referrals, or violating brand guidelines will end your access and forfeit pending commissions.' },
];

const CreatorProgram = () => {
  usePageMeta({
    title: 'DripFit — Creator Program',
    description: 'Earn cash for every install you drive. Real-time dashboard, custom promo codes, $25 minimum payout. Apply to join the DripFit Creator Program.',
    path: '/creators',
  });
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="pt-20 pb-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <BrandLogo size="xl" className="justify-center mb-8" />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/80 mb-4">
            Creator Program · Apply
          </p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
            Get paid to drop the fit.{' '}
            <span className="text-primary">Cash, not credits.</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Share DripFit with your audience. Earn real cash for every install.
            Real-time tracking. $25 minimum payout. No gimmicks.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a href="mailto:hello@dripfitcheck.com?subject=Creator%20Program%20Application">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Apply Now <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            {user && (
              <Link to="/creator">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Open Dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Commission Tiers ────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/80 text-center mb-3">
          Commission Structure
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">
          Two tiers. Auto-unlocked.
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {TIERS.map((t) => (
            <div
              key={t.label}
              className={`rounded-2xl border p-6 ${
                t.highlight ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary mb-3">{t.label}</p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-display text-4xl font-bold text-foreground">{t.rate}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{t.unit}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.detail}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-6 font-mono">
          USD · Counted per calendar month · Tier resets on the 1st
        </p>
      </section>

      {/* ── How It Works ────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/80 text-center mb-3">
          How It Works
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">
          Four steps. Zero friction.
        </h2>
        <div className="space-y-3">
          {HOW_IT_WORKS.map((step, idx) => (
            <div key={step.title} className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center">
                <step.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/80 mb-1">
                  Step 0{idx + 1}
                </p>
                <h3 className="font-display text-lg font-bold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Perks ───────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/80 text-center mb-3">
          What You Get
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-8">
          Beyond the commission.
        </h2>
        <ul className="space-y-3">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-foreground leading-relaxed">{perk}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/80 text-center mb-3">
          FAQ
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-8">
          Common questions.
        </h2>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-base font-bold mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                {item.q}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-3">
            Ready to drop the fit?
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto mb-6">
            Send a short note about your audience and platforms. We respond within 48 hours.
          </p>
          <a href="mailto:hello@dripfitcheck.com?subject=Creator%20Program%20Application">
            <Button size="lg" className="gap-2">
              <Mail className="h-4 w-4" /> hello@dripfitcheck.com
            </Button>
          </a>
        </div>
      </section>
    </div>
  );
};

export default CreatorProgram;
