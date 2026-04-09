import { FadeIn } from './LandingAnimations';
import LandingEmailCapture from './LandingEmailCapture';

export default function LandingFinalCTA() {
  return (
    <section className="py-28 md:py-36 relative overflow-hidden border-t border-border/30">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none bg-primary/[0.04] blur-[120px]" />
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <FadeIn>
          <span className="font-mono text-[10px] tracking-[.25em] uppercase text-primary/60 block mb-6">The Cheat Code Is Live</span>
          <h2 className="font-display text-4xl md:text-6xl font-extrabold leading-[1.08] mb-6">
            Your Body. Mapped.<br />
            Your Drip. <span className="text-primary">Verified.</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto mb-10">
            7,000 pieces. 130 brands. Zero returns. The anti-return cheat code for your closet.
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
