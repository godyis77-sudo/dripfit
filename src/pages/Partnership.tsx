import { TrendingDown, Users, ShoppingBag, Scan, Shirt, BarChart3, ArrowRight, Mail, CheckCircle2, ExternalLink } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BrandLogo from '@/components/ui/BrandLogo';

const STATS = [
  { value: '130+', label: 'Brands Indexed' },
  { value: '7,000+', label: 'Products Cataloged' },
  { value: '30-40%', label: 'Return Reduction' },
  { value: '<60s', label: 'Body Scan Time' },
];

const HOW_IT_WORKS = [
  { icon: Scan, title: 'AI Body Scan', desc: 'Two smartphone photos → 6 precise body measurements extracted via computer vision in under 60 seconds.' },
  { icon: BarChart3, title: 'Size Matching', desc: 'Measurements mapped against brand-specific size charts. Users see their exact size per brand — not generic S/M/L.' },
  { icon: ShoppingBag, title: 'Confident Purchase', desc: 'Size-confident shoppers click through to your store, buy the right size first time, and keep what they buy.' },
];

const VALUE_PROPS = [
  'Lower return rates — customers buy the right size the first time',
  'Higher conversion — size confidence removes the biggest purchase barrier',
  'Zero cost — we monetize through affiliate commissions, not retailer fees',
  'Incremental traffic — qualified, high-intent shoppers directed to your checkout',
  'Brand-safe presentation — products shown in a premium editorial format',
];

const INTEGRATIONS = [
  { label: 'Product Data Feed', desc: 'CSV, JSON, or API — we ingest your catalog and keep it synced' },
  { label: 'Affiliate Program', desc: 'CJ, Rakuten, Impact, ShareASale — or direct partnership' },
  { label: 'Size Chart Access', desc: 'We map your exact size tables for precise recommendations' },
];

const Partnership = () => {
  usePageMeta({ title: 'Brand Partnership', description: 'Partner with DripFit to reduce returns by 30-40%. AI-powered size matching drives confident purchases.', path: '/partnership' });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        
        <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
          <BrandLogo size="xl" className="justify-center mb-8" />
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            Retail <span className="text-primary">Partnership</span> Deck
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            AI-powered body scanning that matches shoppers to their perfect size — 
            reducing returns and driving higher-converting traffic to your store.
          </p>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────── */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-3xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display text-2xl sm:text-3xl font-bold text-primary">{s.value}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── The Problem ──────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-14">
        <div className="bg-destructive/8 border border-destructive/20 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-4">
            <TrendingDown className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-xl font-bold">The $100B Problem</h2>
              <p className="text-muted-foreground text-sm mt-1">Sizing is the #1 reason for online fashion returns.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            {[
              { stat: '30-40%', note: 'of online clothing is returned' },
              { stat: '$15-30', note: 'cost per return (shipping + restock)' },
              { stat: '70%', note: 'of returns cite "wrong size/fit"' },
            ].map(r => (
              <div key={r.stat} className="bg-background/60 rounded-xl p-4 text-center">
                <p className="font-display text-xl font-bold text-foreground">{r.stat}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{r.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-14">
        <h2 className="font-display text-2xl font-bold text-center mb-8">How DripFit Check Works</h2>
        <div className="space-y-4">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="flex items-start gap-4 bg-card border border-border rounded-2xl p-5">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Step {i + 1}</span>
                  <h3 className="font-display font-bold text-sm">{step.title}</h3>
                </div>
                <p className="text-muted-foreground text-[13px] mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Value for Retailers ──────────────────────────── */}
      <section className="border-y border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <h2 className="font-display text-2xl font-bold text-center mb-8">Why Partner With Us</h2>
          <div className="space-y-3">
            {VALUE_PROPS.map(v => (
              <div key={v} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integration Options ──────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="font-display text-2xl font-bold text-center mb-2">Integration Options</h2>
        <p className="text-muted-foreground text-sm text-center mb-8">We make onboarding seamless — choose what works for you.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {INTEGRATIONS.map(item => (
            <div key={item.label} className="bg-card border border-border rounded-2xl p-5 text-center">
              <h3 className="font-display font-bold text-sm mb-1">{item.label}</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── User Journey Visual ──────────────────────────── */}
      <section className="border-y border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <h2 className="font-display text-2xl font-bold text-center mb-8">The User Journey</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            {['Scan Body', 'See Exact Size', 'Browse Your Products', 'Buy With Confidence', 'Keep What They Buy'].map((step, i) => (
              <div key={step} className="flex items-center gap-2 sm:gap-4">
                <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-center min-w-[120px]">
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-0.5">{i + 1}</p>
                  <p className="text-xs font-semibold text-foreground whitespace-nowrap">{step}</p>
                </div>
                {i < 4 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-2xl p-8 sm:p-12">
          <Users className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">Let's Reduce Returns Together</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            We'd love to explore a partnership. Reach out and we'll have you onboarded in days, not weeks.
          </p>
          <a
            href="mailto:partnerships@dripfitcheck.com"
            className="inline-flex items-center gap-2 btn-gold-3d shimmer-sweep rounded-xl px-6 py-3 font-semibold text-sm text-primary-foreground"
          >
            <Mail className="h-4 w-4" />
            partnerships@dripfitcheck.com
          </a>
          <div className="mt-6 flex items-center justify-center gap-4">
            <a href="https://dripfitcheck.lovable.app" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline underline-offset-4 inline-flex items-center gap-1">
              Try the App <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} DripFit Check. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Partnership;
