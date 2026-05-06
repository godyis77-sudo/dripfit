import { FadeIn } from './LandingAnimations';

const TESTIMONIALS = [
  {
    quote: "Ordered the Arc'teryx Beta LT in M first try. My Body Twins said 91% COP on M. They were right.",
    name: 'Jordan K.',
    initials: 'JK',
    tag: "Streetwear / Arc'teryx collector",
    location: 'Toronto, CA',
  },
  {
    quote: "Almost shipped back $800 of The Row. DripFit said S, not M. I tried S — it draped exactly like the lookbook. Saved the return label.",
    name: 'Mia T.',
    initials: 'MT',
    tag: 'Quiet Luxury / Minimalist',
    location: 'New York, NY',
  },
  {
    quote: "My Twins put me onto Auralee — a brand I'd never have touched. Sized straight into a 3 on their say-so. Now half my closet.",
    name: 'Marcus D.',
    initials: 'MD',
    tag: 'Heritage / Japanese workwear',
    location: 'London, UK',
  },
];

export default function LandingTestimonials() {
  return (
    <section className="pt-20 md:pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-6">
        <FadeIn>
          <span className="type-data block mb-5 text-center text-muted-foreground">What Members Say</span>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.08}>
              <div className="bg-card border-l-2 border-l-primary border-y border-r border-border/40 rounded-r-2xl rounded-l-sm p-6 pl-5 flex flex-col h-full">
                <p className="text-sm leading-relaxed text-foreground/90 flex-1 mb-5">{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border border-primary bg-background flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-primary tracking-wide">{t.initials}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-primary block">{t.name}</span>
                    <span className="text-xs text-muted-foreground/85 block mt-0.5 truncate">{t.tag}</span>
                    <span className="text-xs text-muted-foreground/85 block truncate">{t.location}</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.3}>
          <p className="text-xs italic text-muted-foreground/70 text-center mt-6">
            From early access members
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
