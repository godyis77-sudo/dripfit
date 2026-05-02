import { TrendingDown, Users, ShoppingBag, Scan, BarChart3, ArrowRight, ChevronDown, Mail, CheckCircle2, ExternalLink, Quote, Download } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BrandLogo from '@/components/ui/BrandLogo';
import { useCatalogStats } from '@/hooks/useCatalogStats';
import PartnershipNav from '@/components/partnership/PartnershipNav';
import PartnershipStickyCTA from '@/components/partnership/PartnershipStickyCTA';
import PartnershipBrandStrip from '@/components/partnership/PartnershipBrandStrip';
import PartnershipContactForm from '@/components/partnership/PartnershipContactForm';

const VALUE_PROPS = [
  'Lower return rates — customers buy the right size the first time',
  'Higher conversion — size confidence removes the biggest purchase barrier',
  'Zero cost — we monetize through affiliate commissions, not retailer fees',
  'Incremental traffic — qualified, high-intent shoppers directed to your checkout, already knowing their size',
  'Brand-safe presentation — your products shown in a premium editorial format, no discount aesthetics',
];

const Partnership = () => {
  usePageMeta({
    title: 'DripFit — Retail Partnership',
    description: 'Reduce returns with AI-powered size matching. Zero integration cost — we monetize through affiliate commissions, not retailer fees.',
    path: '/partnership',
  });
  const stats = useCatalogStats();

  const HOW_IT_WORKS = [
    { icon: Scan, title: 'AI Body Scan', desc: `Two smartphone photos. 20+ biometric data points extracted via computer vision in under 60 seconds. Key measurements mapped to your brand-specific size charts.` },
    { icon: BarChart3, title: 'Size Matching', desc: `Measurements mapped against ${stats.sizeCharts}+ brand-specific size charts. Users see their exact size at YOUR store — not a generic S/M/L.` },
    { icon: ShoppingBag, title: 'Confident Purchase', desc: 'Size-confident shoppers click through to your store, buy the right size first time, and keep what they buy.' },
  ];

  const INTEGRATIONS = [
    { label: 'Product Data Feed', desc: 'CSV, JSON, or REST API. Automated weekly sync. We handle ingest, image normalization, and category mapping. Zero engineering on your side.', setup: 'Setup: 1–2 days' },
    { label: 'Affiliate Program', desc: 'CJ, Rakuten, Impact, ShareASale — or direct partnership. Standard affiliate links, no custom SDK required.', setup: 'Setup: same day' },
    { label: 'Size Chart Access', desc: 'Public size table URL or upload. We map every variant (numeric, alpha, regional) to user measurements within 0.5 inches.', setup: 'Setup: 2–3 days' },
  ];

  const STATS = [
    { value: `${stats.brands}+`, label: 'Brands Indexed', note: 'Active size charts' },
    { value: stats.productsLabel, label: 'Products Cataloged', note: 'Live across categories' },
    { value: '\u00B10.5"', label: 'Sizing Accuracy', note: `Across ${stats.sizeCharts}+ size charts` },
    { value: '<60s', label: 'Body Scan Time', note: 'Two phone photos' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PartnershipNav />

      {/* ── Hero — provoke first ─────────────────────────── */}
      <section className="relative overflow-hidden pt-24">
        <div className="relative max-w-3xl mx-auto px-6 pt-8 pb-12 text-center">
          <BrandLogo size="xl" className="justify-center mb-8" />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary/80 mb-4">
            Retail Partnership · B2B
          </p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
            Sizing returns are eating your margin.{' '}
            <span className="text-primary">We end them.</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Your customers scan once. We map their exact size to your size chart.
            They buy right. They keep it.
          </p>
        </div>
      </section>

      {/* ── Brand strip — proof of catalog breadth ───────── */}
      <PartnershipBrandStrip />

      {/* ── The Problem — provocation, sourced ───────────── */}
      <section id="problem" className="max-w-3xl mx-auto px-6 py-14 scroll-mt-20">
        <div className="bg-destructive/8 border border-destructive/20 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-4">
            <TrendingDown className="h-6 w-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-xl font-bold">The $849.9B Problem</h2>
              <p className="text-muted-foreground text-sm mt-1">Sizing is the #1 reason for online fashion returns.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { stat: '30-40%', note: 'of online clothing is returned' },
              { stat: '1 in 3', note: 'online fashion purchases come back' },
              { stat: '$15-30', note: 'cost per return (shipping + restock)' },
              { stat: '70%', note: 'of returns cite "wrong size/fit"' },
            ].map(r => (
              <div key={r.stat} className="bg-background/60 rounded-xl p-4 text-center">
                <p className="font-display text-xl font-bold text-foreground">{r.stat}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{r.note}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-5 text-center">
            Sources: McKinsey Returns Survey 2024 · National Retail Federation 2025
          </p>
        </div>
      </section>

      {/* ── Stats Bar — capability, not projection ───────── */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-3xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display text-2xl sm:text-3xl font-bold text-primary">{s.value}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-widest mt-1">{s.label}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section id="how-it-works" className="max-w-3xl mx-auto px-6 py-14 scroll-mt-20">
        <h2 className="font-display text-2xl font-bold text-center mb-8">How DripFit Works</h2>
        <div className="space-y-4">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.title}
              className="flex items-start gap-4 bg-card border-l-2 border-primary border-y border-r border-border rounded-2xl p-5"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">
                    Step {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-display font-bold text-sm">{step.title}</h3>
                </div>
                <p className="text-muted-foreground text-[13px] mt-1 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Partner — 3 reasons only ─────────────────── */}
      <section className="border-y border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <h2 className="font-display text-2xl font-bold text-center mb-8">Why Partner With Us</h2>
          <div className="space-y-3 max-w-xl mx-auto">
            {VALUE_PROPS.map(v => (
              <div key={v} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">{v}</p>
              </div>
            ))}
          </div>

          {/* Anchor testimonial — partner-side voice */}
          <div className="mt-10 max-w-xl mx-auto bg-background/60 border border-border/60 rounded-2xl p-6">
            <Quote className="h-5 w-5 text-primary/70 mb-3" />
            <p className="font-display italic text-base text-foreground/90 leading-snug">
              "If sized correctly the first time, even half of our return rate disappears.
              That pays for the integration in a month."
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-3 uppercase tracking-widest">
              — E-commerce Director, contemporary fashion brand · pilot conversation
            </p>
          </div>
        </div>
      </section>

      {/* ── Integration Options ──────────────────────────── */}
      <section id="integration" className="max-w-3xl mx-auto px-6 py-14 scroll-mt-20">
        <h2 className="font-display text-2xl font-bold text-center mb-2">Integration Options</h2>
        <p className="text-muted-foreground text-sm text-center mb-8">Onboarded in days, not weeks.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {INTEGRATIONS.map(item => (
            <div key={item.label} className="bg-card border border-border rounded-2xl p-5 text-center">
              <h3 className="font-display font-bold text-sm mb-2">{item.label}</h3>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── User Journey ─────────────────────────────────── */}
      <section className="border-y border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-6 py-14">
          <h2 className="font-display text-2xl font-bold text-center mb-8">The User Journey</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            {['Scan Body', 'See Exact Size', 'Browse Your Products', 'Buy With Confidence', 'Zero Returns'].map((step, i) => {
              const isFinal = i === 4;
              return (
                <div key={step} className="flex items-center gap-2 sm:gap-4">
                  {i > 0 && (
                    <ChevronDown className="h-4 w-4 shrink-0 sm:hidden text-muted-foreground/40" />
                  )}
                  <div
                    className={`rounded-xl px-4 py-3 text-center min-w-[120px] border ${
                      isFinal ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'
                    }`}
                  >
                    <p
                      className={`font-mono text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
                        isFinal ? 'text-primary' : 'text-muted-foreground/70'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </p>
                    <p className="text-xs font-semibold text-foreground whitespace-nowrap">{step}</p>
                  </div>
                  {i < 4 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Contact — form + secondary CTA ───────────────── */}
      <section id="contact" className="max-w-3xl mx-auto px-6 py-16 scroll-mt-20">
        <div className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-2xl p-6 sm:p-10">
          <Users className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-2">
            Let's Reduce Returns Together
          </h2>
          <p className="text-muted-foreground text-sm text-center max-w-md mx-auto mb-8">
            Tell us about your brand. We'll come back with a tailored integration plan.
          </p>

          <div className="max-w-md mx-auto">
            <PartnershipContactForm />
          </div>

          <div className="mt-8 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="mailto:partnerships@dripfitcheck.com"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              partnerships@dripfitcheck.com
            </a>
            <span className="hidden sm:inline text-muted-foreground/30">·</span>
            <a
              href="/landing"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline underline-offset-4"
            >
              See Consumer Experience <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-border py-6 text-center pb-24">
        <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} DripFit Check. All rights reserved.</p>
      </footer>

      <PartnershipStickyCTA />
    </div>
  );
};

export default Partnership;
