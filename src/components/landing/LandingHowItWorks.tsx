import { FadeIn } from './LandingAnimations';

const STEPS = [
  { n: '01', title: 'Map Your Body', desc: 'Stand in front of your phone. Two photos. Our AI extracts 20+ biometric data points in 60 seconds. Your geometry — locked.' },
  { n: '02', title: 'Enter the Infinite Closet', desc: 'Browse 7,000+ pieces from 130 brands. AR try-on renders every garment on your exact silhouette. See the real drape.' },
  { n: '03', title: 'Verify With Your Twins', desc: 'Your Body Twins — same proportions — have already tried it. See their COP/DROP verdict and fit photos.' },
  { n: '04', title: 'Cop With Confidence', desc: 'Verified sizing. Perfect drape confirmation. Zero guessing. One size. One purchase. Zero returns.' },
];

const COP_DROP_DATA = [
  { label: "Arc'teryx Beta LT — Size M", cop: 94 },
  { label: 'The Row Margaux Bag', cop: 87 },
  { label: 'Stone Island Ghost Overshirt — L', cop: 91 },
  { label: 'Totême Twisted Seam Denim — 28', cop: 96 },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-28 md:py-36">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div>
          <FadeIn>
            <span className="font-mono text-[10px] tracking-[.22em] uppercase block mb-5 text-primary/70">How It Works</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-12">
              Scan. Try. <span className="text-primary">Cop.</span>
            </h2>
          </FadeIn>
          <div className="space-y-10">
            {STEPS.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.08}>
                <div className="flex gap-5 items-start">
                  <div className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-mono text-sm font-bold border border-primary/25 text-primary bg-primary/[0.05]">
                    {s.n}
                  </div>
                  <div>
                    <h4 className="text-base font-bold mb-1.5">{s.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        <FadeIn delay={0.15}>
          <div className="bg-[hsl(var(--surface-glass)/0.03)] backdrop-blur-xl border border-border/40 rounded-2xl p-8 sticky top-24">
            <span className="font-mono text-[9px] tracking-[.2em] uppercase text-primary/70 block mb-6">Live Community Verdict</span>
            <div className="space-y-5">
              {COP_DROP_DATA.map((d) => (
                <div key={d.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-sm text-muted-foreground">{d.label}</span>
                    <span className="font-mono text-xs text-primary">{d.cop}% COP</span>
                  </div>
                  <div className="h-1 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 transition-[width] duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)]"
                      style={{ width: `${d.cop}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/50 text-center mt-6 pt-5 border-t border-border/30">
              Verdicts from Body Twins within your measurement range
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
