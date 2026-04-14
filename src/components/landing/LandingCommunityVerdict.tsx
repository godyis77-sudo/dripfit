import { FadeIn } from './LandingAnimations';
import LandingEmailCapture from './LandingEmailCapture';

const COP_DROP_DATA = [
  { label: "Arc'teryx Beta LT — Size M", cop: 94 },
  { label: 'The Row Margaux Bag', cop: 87 },
  { label: 'Stone Island Ghost Overshirt — L', cop: 91 },
  { label: 'Totême Twisted Seam Denim — 28', cop: 96 },
];

export default function LandingCommunityVerdict() {
  return (
    <section className="pt-10 pb-0">
      <div className="max-w-3xl mx-auto px-6">
        <FadeIn>
          <div className="bg-[hsl(var(--surface-glass)/0.03)] backdrop-blur-xl border border-border/40 rounded-2xl p-8 md:p-10">
            <span className="type-data text-primary/80 block mb-6" style={{ fontSize: 11 }}>Live Community Verdict</span>
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
            <p className="text-xs text-muted-foreground/60 text-center mt-6 pt-5 border-t border-border/30">
              Verdicts from Body Twins within your measurement range
            </p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-xs font-semibold tracking-wider uppercase text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
              >
                Get your size verified →
              </button>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
