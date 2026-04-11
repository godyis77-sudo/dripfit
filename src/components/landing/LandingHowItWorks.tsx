import { motion } from 'framer-motion';
import { FadeIn } from './LandingAnimations';

const STEPS = [
  { n: '01', title: 'Map Your Body', desc: 'Stand in front of your phone. Two photos. 20+ biometric data points in 60 seconds.' },
  { n: '02', title: 'Enter the Closet', desc: 'Browse 7,000+ pieces from 130 brands. AR try-on renders every garment on your silhouette.' },
  { n: '03', title: 'Verify With Twins', desc: 'Your Body Twins — same proportions — share their COP/DROP verdict and fit photos.' },
  { n: '04', title: 'Cop With Confidence', desc: 'Verified sizing. Perfect drape. One size. One purchase. Zero returns.' },
];

const COP_DROP_DATA = [
  { label: "Arc'teryx Beta LT — M", cop: 94 },
  { label: 'The Row Margaux Bag', cop: 87 },
  { label: 'Stone Island Ghost — L', cop: 91 },
  { label: 'Totême Twisted Denim — 28', cop: 96 },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-36">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        <div>
          <FadeIn>
            <span className="type-data block mb-4 text-primary/60 tracking-[.25em]">How It Works</span>
            <h2 className="type-headline text-3xl md:text-5xl leading-tight mb-14 tracking-[-0.02em]">
              Scan. Try. <span className="text-primary">Cop.</span>
            </h2>
          </FadeIn>
          <div className="space-y-8">
            {STEPS.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.08}>
                <div className="flex gap-5 items-start group">
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-bold border border-primary/20 text-primary/70 bg-primary/[0.04] group-hover:bg-primary/[0.08] group-hover:border-primary/30 transition-all duration-300">
                    {s.n}
                  </div>
                  <div className="pt-1">
                    <h4 className="type-headline text-base mb-1">{s.title}</h4>
                    <p className="type-body text-[13px] leading-[1.7] text-muted-foreground/70">{s.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        <FadeIn delay={0.15}>
          <div className="rounded-2xl p-7 md:p-8 sticky top-24 border border-border/30 bg-secondary/20">
            <span className="type-data text-primary/60 block mb-6 tracking-[.25em]" style={{ fontSize: 9 }}>Live Community Verdict</span>
            <div className="space-y-5">
              {COP_DROP_DATA.map((d, i) => (
                <motion.div
                  key={d.label}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex justify-between mb-2">
                    <span className="text-[13px] text-muted-foreground/80">{d.label}</span>
                    <span className="font-mono text-[11px] text-primary/80 tabular-nums">{d.cop}%</span>
                  </div>
                  <div className="h-1 bg-border/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${d.cop}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/40 text-center mt-7 pt-5 border-t border-border/20">
              Verdicts from Body Twins within your measurement range
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
