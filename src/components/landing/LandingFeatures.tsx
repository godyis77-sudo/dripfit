import { Scan, Shirt, Users, Scale, ShieldCheck, MessageSquare, LucideIcon } from 'lucide-react';
import { FadeIn } from './LandingAnimations';
import bodyScanShowcase from '@/assets/body-scan-showcase.jpg';

interface Feature { icon: LucideIcon; title: string; desc: string }

const FEATURES: Feature[] = [
  { icon: Scan, title: 'The Biometric Scan', desc: '2 photos. 60 seconds. Your exact geometry — mapped. 20+ biometric data points. Cross-referenced against 186 brand size charts. Locked.' },
  { icon: Shirt, title: 'Infinite Drape Studio', desc: '9,000+ pieces. 69 retailers. AR try-on. The exact drape — on your silhouette. No model. Just you.' },
  { icon: Users, title: 'Body & Style Twins', desc: 'Members with your exact proportions. If it drapes on them — it drapes on you. Verified.' },
  { icon: Scale, title: 'COP or DROP', desc: 'The community verdict. Your Body Twins have spoken. Binary. Decisive. No ambiguity.' },
  { icon: ShieldCheck, title: 'Verified Sizing', desc: 'Your mapped size across every brand. Instantly. No more guessing between a Medium at Nike and a Large at Zara.' },
  { icon: MessageSquare, title: 'AI Style Assistant', desc: 'AI that maps your taste, measurements, and closet. Drops heat that\'s actually yours. No generic picks.' },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="pt-28 md:pt-36 pb-12 bg-secondary/20 border-y border-border/30">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <span className="type-data block mb-5 text-primary/70">The Ecosystem</span>
            <h2 className="type-headline leading-tight" style={{ letterSpacing: '-0.01em', fontSize: 'clamp(32px, 4vw, 48px)' }}>
              Your Body. Mapped.<br />Your Drip. <span className="text-primary">Verified.</span>
            </h2>
          </div>
        </FadeIn>

        {/* Body Scan Showcase */}
        <FadeIn delay={0.1}>
          <div className="flex justify-center mb-14">
            <div className="relative max-w-[326px] w-full rounded-2xl overflow-hidden border border-primary/20 shadow-[0_0_60px_-15px_hsl(var(--primary)/0.3)]">
              <img
                src={bodyScanShowcase}
                alt="DripFit body scan showing precise biometric measurements — shoulder, chest, waist, hips, and inseam mapped on a holographic silhouette"
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.06}>
              <div className="bg-[hsl(var(--surface-glass)/0.03)] backdrop-blur-xl border border-border/40 rounded-2xl p-8 group hover:-translate-y-1 transition-transform duration-300 h-full">
                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-6 border border-primary/20 bg-primary/[0.08]">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="type-headline text-xl mb-3">{f.title}</h3>
                <p className="type-body leading-relaxed text-muted-foreground/80" style={{ fontSize: 15 }}>{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
