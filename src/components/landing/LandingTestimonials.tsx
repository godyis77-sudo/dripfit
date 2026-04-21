import { Quote } from 'lucide-react';
import { FadeIn } from './LandingAnimations';

const TESTIMONIALS = [
  {
    quote: "Ordered the Arc'teryx Beta LT in M first try. My Body Twins said 91% COP on M. They were right.",
    name: 'Jordan K.',
    tag: "Streetwear / Arc'teryx collector",
    location: 'Toronto, CA',
  },
  {
    quote: "The Row pieces are expensive and the sizing is cryptic. DripFit told me S before I spent $800. Perfect drape.",
    name: 'Mia T.',
    tag: 'Quiet Luxury / Minimalist',
    location: 'New York, NY',
  },
  {
    quote: "Stone Island runs weird. 94% of my Body Twins said Medium sits right. It did. Zero returns.",
    name: 'Marcus D.',
    tag: 'Heritage / Stone Island collector',
    location: 'London, UK',
  },
];

export default function LandingTestimonials() {
  return (
    <section className="py-20 md:py-24">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn>
          <span className="type-data block mb-5 text-center text-muted-foreground">What Members Say</span>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.08}>
              <div className="bg-card border border-border rounded-2xl p-6 flex flex-col h-full">
                <Quote className="w-5 h-5 text-primary mb-4 shrink-0" />
                <p className="text-sm leading-relaxed text-foreground/90 flex-1 mb-5">"{t.quote}"</p>
                <div>
                  <span className="text-sm font-semibold text-primary">{t.name}</span>
                  <span className="text-xs text-muted-foreground/60 block mt-0.5">{t.tag}</span>
                  <span className="text-xs text-muted-foreground/40 block">{t.location}</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
