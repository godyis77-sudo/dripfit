import { FadeIn } from './LandingAnimations';
import LandingEmailCapture from './LandingEmailCapture';

export default function LandingFinalCTA() {
  return (
    <section className="py-24 md:py-36 relative overflow-hidden border-t border-border/20">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none bg-primary/[0.03] blur-[160px]" />
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <FadeIn>
          <span className="type-data text-primary/50 block mb-6 tracking-[.25em]">Join the Waitlist</span>
          <h2 className="type-brand text-3xl md:text-5xl leading-[1.08] mb-6 tracking-[-0.02em]">
            Zero Guesswork.<br />
            <span className="text-primary">Zero Returns.</span>
          </h2>
          <p className="type-body text-base leading-relaxed max-w-md mx-auto mb-12 text-muted-foreground/70">
            7,000 pieces. 130 brands. The anti-return cheat code for your closet.
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="flex justify-center">
            <LandingEmailCapture id="footer-cta" buttonText="Get the Cheat Code" />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
