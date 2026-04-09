import { Scan, Shirt, Users, Star, ShieldCheck, MessageSquare, LucideIcon } from 'lucide-react';
import { FadeIn } from './LandingAnimations';

interface Feature { icon: LucideIcon; title: string; desc: string }

const FEATURES: Feature[] = [
  { icon: Scan, title: 'The Biometric Scan', desc: '2 photos. 60 seconds. Your exact geometry mapped with AI precision. 20+ data points cross-referenced against 130 brand size charts.' },
  { icon: Shirt, title: 'The Infinite Closet', desc: '7,000+ pieces from 69 retailers. AR try-on renders the exact drape on your silhouette. No model proxies. Just you.' },
  { icon: Users, title: 'Body & Style Twins', desc: 'Members who share your exact proportions or aesthetic. If it drapes on them, it drapes on you. Verified.' },
  { icon: Star, title: 'COP / DROP Voting', desc: 'The community verdict. Your Body Twins weigh in on every piece. Binary. Decisive. No ambiguity.' },
  { icon: ShieldCheck, title: 'Verified Sizing', desc: 'Your mapped size across every brand. Instantly. No more guessing between a Medium at Nike and a Large at Zara.' },
  { icon: MessageSquare, title: 'AI Style Assistant', desc: 'Streaming AI that knows your measurements, taste, and closet. Personalized recommendations. No generic picks.' },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="py-28 md:py-36 bg-secondary/20 border-y border-border/30">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-16">
            <span className="font-mono text-[10px] tracking-[.22em] uppercase block mb-5 text-primary/70">The Ecosystem</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight">
              Your Body. Mapped.<br />Your Closet. <span className="text-primary">Infinite.</span>
            </h2>
          </div>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.06}>
              <div className="bg-[hsl(var(--surface-glass)/0.03)] backdrop-blur-xl border border-border/40 rounded-2xl p-8 group hover:-translate-y-1 transition-transform duration-300 h-full">
                <div className="w-11 h-11 rounded-full flex items-center justify-center mb-6 border border-primary/20 bg-primary/[0.08]">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
