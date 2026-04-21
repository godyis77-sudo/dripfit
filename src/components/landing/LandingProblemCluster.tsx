import { FadeIn } from './LandingAnimations';

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

export default function LandingProblemCluster() {
  return (
    <section id="problem" className="pt-20 md:pt-28 pb-20 scroll-mt-20">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <FadeIn>
          <span className="type-data block mb-5 text-muted-foreground">The Problem</span>
          <h2
            className="font-display font-bold leading-tight mb-6"
            style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}
          >
            Ordering Three Sizes.
            <br />
            <span className="text-muted-foreground/40">Returning Two.</span>
          </h2>
          <p className="type-body text-base leading-relaxed max-w-lg mx-auto">
            The grail piece drops. You cop three sizes because every brand fits different. Two go back. Money locked. Drip delayed. Dead returns piling up.
          </p>
        </FadeIn>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
        {STATS.map((d, i) => (
          <FadeIn key={d.label} delay={i * 0.08}>
            <div className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-8 text-center">
              <div className="font-display text-3xl font-bold text-primary mb-2">{d.stat}</div>
              <div className="type-body text-sm">{d.label}</div>
            </div>
          </FadeIn>
        ))}
      </div>
      <FadeIn delay={0.3}>
        <p className="text-xs text-muted-foreground/50 text-right max-w-5xl mx-auto px-6 mt-3">
          ¹ National Retail Federation, 2025 Returns Report
        </p>
      </FadeIn>

      {/* Horizontal bar chart */}
      <div className="max-w-5xl mx-auto px-6 mt-14">
        <FadeIn delay={0.1}>
          <span className="type-data block mb-6 text-muted-foreground">Apparel Leads Every Category</span>
        </FadeIn>
        <div className="space-y-4 pb-4">
          {RETURN_BARS.map((bar, i) => (
            <FadeIn key={bar.label} delay={0.15 + i * 0.06}>
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs tracking-wider uppercase text-foreground/90 w-[140px] shrink-0 text-right">
                  {bar.label}
                </span>
                <div className="flex-1 h-7 rounded-sm overflow-hidden bg-secondary">
                  <div
                    className={`h-full rounded-sm transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      bar.hero ? 'bg-primary' : 'bg-muted'
                    }`}
                    style={{ width: `${bar.pct * 2.5}%` }}
                  />
                </div>
                <span
                  className={`font-mono text-xs tracking-wider w-[52px] shrink-0 ${
                    bar.hero ? 'text-primary' : 'text-muted-foreground'
                  }`}
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
  );
}
