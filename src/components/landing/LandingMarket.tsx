import { LineChart, Line, XAxis, YAxis, CartesianGrid, Area, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import { FadeIn } from './LandingAnimations';

const MARKET_DATA = [
  { year: '2022', value: 651 },
  { year: '2023', value: 731 },
  { year: '2024', value: 821 },
  { year: '2025', value: 957 },
  { year: '2026', value: 1010 },
  { year: '2030', value: 1160 },
];

const MARKET_STATS = [
  { stat: '6.99% CAGR', label: 'Projected growth through 2030' },
  { stat: '$1.01T', label: 'Fashion ecommerce market today' },
  { stat: '70% of returns', label: 'Are preventable with verified sizing' },
];

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  const isCurrent = payload.year === '2026';
  return (
    <g>
      <circle cx={cx} cy={cy} r={isCurrent ? 6 : 3} fill="hsl(var(--primary))" stroke="none" />
      {isCurrent && (
        <text x={cx} y={cy - 14} textAnchor="middle" fill="hsl(var(--primary))" fontSize={11} fontFamily="monospace" letterSpacing="0.12em">
          TODAY
        </text>
      )}
    </g>
  );
}

export default function LandingMarket() {
  return (
    <section className="pt-10 md:pt-14 pb-20 md:pb-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-14">
          <FadeIn>
            <span className="font-mono text-xs tracking-[.18em] uppercase text-muted-foreground block mb-5">The Market</span>
            <h2 className="font-display font-bold leading-tight" style={{ fontSize: 'clamp(32px, 4vw, 48px)' }}>
              $1.01 Trillion.{' '}
              <span className="text-muted-foreground/85">And Returns Are Eating It.</span>
            </h2>
            <p className="text-sm text-muted-foreground/85 mt-4 max-w-md mx-auto">
              Projected $1.16T by 2030. Returns are eating it.
            </p>
          </FadeIn>
        </div>

        <FadeIn delay={0.1}>
          <div className="w-full overflow-x-auto -mx-2 px-2">
            <div className="min-w-[480px] h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MARKET_DATA} margin={{ top: 30, right: 20, bottom: 5, left: 10 }}>
                  <defs>
                    <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border) / 0.3)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.1em' }}
                    axisLine={{ stroke: 'hsl(var(--border) / 0.5)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `$${v}B`}
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <ReferenceLine x="2026" stroke="hsl(var(--primary))" strokeDasharray="6 4" strokeOpacity={0.5} />
                  <Area type="monotone" dataKey="value" stroke="none" fill="url(#goldFill)" />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={<CustomDot />} activeDot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {MARKET_STATS.map((d, i) => (
            <FadeIn key={d.label} delay={0.2 + i * 0.08}>
              <div className="bg-[hsl(var(--surface-glass)/0.03)] backdrop-blur-xl border border-border/40 rounded-2xl p-8 text-center">
                <div className="font-display text-2xl font-bold text-primary mb-2">{d.stat}</div>
                <div className="text-sm text-muted-foreground">{d.label}</div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.4}>
          <p className="text-[11px] text-muted-foreground/85 text-right mt-4">
            Sources: Statista 2025, Capital One Shopping Research 2025, eMarketer 2026
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
