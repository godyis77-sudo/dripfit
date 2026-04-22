import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FadeIn } from './LandingAnimations';

const DONUT_DATA = [
  { name: 'Wrong Fit', value: 38, color: 'hsl(var(--primary))' },
  { name: 'Looked Different', value: 22, color: 'hsl(var(--muted-foreground) / 0.45)' },
  { name: 'Style Change', value: 15, color: 'hsl(var(--muted-foreground) / 0.3)' },
  { name: 'Other', value: 25, color: 'hsl(var(--muted-foreground) / 0.15)' },
];

const INSIGHT_STATS = [
  { stat: '$21–$46', label: 'Cost per returned item to retailer' },
  { stat: '1 in 4', label: 'Orders include at least one bracketed size' },
  { stat: '47%', label: 'Of shoppers avoid online fashion due to fit uncertainty' },
];

export default function LandingRootCause() {
  return (
    <section id="root-cause" className="pt-10 md:pt-14 pb-20 md:pb-24 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <FadeIn>
            <span className="font-mono text-xs tracking-[.18em] uppercase text-muted-foreground block mb-5">
              The Root Cause
            </span>
            <h2
              className="font-display font-bold leading-tight"
              style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}
            >
              Every third purchase.{' '}
              <span className="text-muted-foreground/85">The wrong size.</span>
            </h2>
            <p className="text-sm text-muted-foreground/85 mt-4 max-w-md mx-auto">
              The fashion economy keeps growing. Returns keep eating it. The bottleneck is sizing.
            </p>
          </FadeIn>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* LEFT — Donut */}
          <FadeIn delay={0.1}>
            <div className="flex flex-col items-center">
              <div className="relative w-[240px] h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DONUT_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      dataKey="value"
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {DONUT_DATA.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-display font-bold text-primary" style={{ fontSize: 36 }}>70%</span>
                  <span className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground/85">fit-related returns</span>
                </div>
              </div>
              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-6">
                {DONUT_DATA.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                    <span className="font-mono text-[11px] tracking-wider uppercase text-muted-foreground/85">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* RIGHT — Insight stats */}
          <div className="space-y-5">
            {INSIGHT_STATS.map((d, i) => (
              <FadeIn key={d.label} delay={0.15 + i * 0.08}>
                <div className="bg-[hsl(var(--surface-glass)/0.03)] backdrop-blur-xl border border-border/40 rounded-2xl p-8 text-center">
                  <div className="font-display text-3xl font-bold text-primary mb-2">{d.stat}</div>
                  <div className="text-sm text-muted-foreground">{d.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        <FadeIn delay={0.4}>
          <p className="text-[11px] text-muted-foreground/85 text-right mt-6">
            Sources: McKinsey 2025, Capital One Shopping Research 2025
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
