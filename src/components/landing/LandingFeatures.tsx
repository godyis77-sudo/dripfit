import { Scan, Shirt, Users, Star, ShieldCheck, MessageSquare, LucideIcon } from 'lucide-react';
import { FadeIn } from './LandingAnimations';

interface Feature { icon: LucideIcon; title: string; desc: string; accent?: string }

const FEATURES: Feature[] = [
  { icon: Scan, title: 'The Biometric Scan', desc: '2 photos. 60 seconds. 20+ data points cross-referenced against 130 brand size charts.' },
  { icon: Shirt, title: 'The Infinite Closet', desc: '7,000+ pieces from 69 retailers. AR try-on renders the exact drape on your silhouette.' },
  { icon: Users, title: 'Body & Style Twins', desc: 'Same proportions. Same aesthetic. If it drapes on them, it drapes on you. Verified.' },
  { icon: Star, title: 'COP / DROP Voting', desc: 'Your Body Twins weigh in on every piece. Binary. Decisive. No ambiguity.' },
  { icon: ShieldCheck, title: 'Verified Sizing', desc: 'Your mapped size across every brand. No more guessing between sizes.' },
  { icon: MessageSquare, title: 'AI Style Assistant', desc: 'Knows your measurements, taste, and closet. Personalized — not generic.' },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="py-24 md:py-36 border-y border-border/20">
      <div className="max-w-6xl mx-auto px-6">
        <FadeIn>
          <div className="text-center mb-20">
            <span className="type-data block mb-4 text-primary/60 tracking-[.25em]">The Ecosystem</span>
            <h2 className="type-headline text-3xl md:text-5xl leading-tight tracking-[-0.02em]">
              Your Body. Mapped.<br />Your Closet. <span className="text-primary">Infinite.</span>
            </h2>
          </div>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.06}>
              <div className="group relative rounded-2xl p-7 md:p-8 h-full border border-border/30 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/15 transition-all duration-500">
                {/* Icon — larger, with glow on hover */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-primary/[0.06] border border-primary/10 group-hover:bg-primary/[0.12] group-hover:border-primary/20 transition-all duration-500">
                  <f.icon className="w-5 h-5 text-primary/80 group-hover:text-primary transition-colors duration-500" />
                </div>
                <h3 className="type-headline text-lg mb-2.5 tracking-tight">{f.title}</h3>
                <p className="type-body text-[13px] leading-[1.7] text-muted-foreground/70">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
