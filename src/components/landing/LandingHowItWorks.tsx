import { Link } from 'react-router-dom';
import { FadeIn } from './LandingAnimations';

const STEPS = [
  { n: '01', title: 'Map Your Body', desc: 'Stand in front of your phone. Two photos. 60 seconds. 20+ biometric data points extracted. Your geometry — locked.' },
  { n: '02', title: 'Enter Infinite Drape Studio', desc: 'Browse 9,000+ pieces from 186 brands. AR try-on renders every garment on your exact silhouette. See the real drape.' },
  { n: '03', title: 'Verified By Your Twins', desc: 'Your Body Twins — same proportions — have already tried it. See the verdict. See the drape.' },
  { n: '04', title: 'Cop. Verified.', desc: 'Verified. Mapped. Perfect drape confirmed. One size. One purchase. Zero returns.' },
];

export default function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div>
          <FadeIn>
            <span className="type-data block mb-5 text-primary/70">How It Works</span>
            <h2 className="type-headline leading-tight mb-12" style={{ letterSpacing: '-0.01em', fontSize: 'clamp(32px, 4vw, 48px)' }}>
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
                    <h4 className="type-headline text-base mb-1.5">{s.title}</h4>
                    <p className="type-body leading-relaxed text-muted-foreground/80" style={{ fontSize: 15 }}>{s.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>

        <FadeIn delay={0.15}>
          <div className="flex flex-col items-center justify-center sticky top-24 min-h-[300px] gap-8">
            {/* Verified badge */}
            <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full border-[1.5px] border-primary animate-[pulse-ring_2s_ease-in-out_infinite]">
              <span className="text-primary text-4xl leading-none" style={{ fontFamily: 'monospace' }}>✓</span>
              <span className="text-primary font-mono text-[8px] tracking-[.2em] uppercase -mt-1">Verified</span>
            </div>

            <Link
              to="/auth"
              className="bg-[#C49A00] text-[#0A0A0A] font-bold rounded-full py-3 px-8 text-sm tracking-wider uppercase inline-flex items-center gap-2 hover:bg-[#D4AF37] transition-colors duration-200"
            >
              Start the Scan →
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
