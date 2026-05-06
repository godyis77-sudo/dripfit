import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FadeIn } from './LandingAnimations';
import { useAuth } from '@/hooks/useAuth';

export default function LandingFinalCTA() {
  const { user } = useAuth();

  return (
    <section data-final-cta className="py-16 md:py-20 relative overflow-hidden border-t border-border/30 bg-secondary/[0.08]">
      {/* Climax glow — slightly warmer + larger than other section glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full pointer-events-none bg-primary/[0.06] blur-[140px]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_70%)]" />

      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <FadeIn>
          {/* Headline — Playfair 500 uppercase + italic gold accent (matches hero & Features) */}
          <h2
            className="type-display-editorial leading-[1.05] mb-6 text-foreground"
            style={{ fontSize: 'clamp(38px, 6vw, 64px)' }}
          >
            STOP PRAYING
            <span
              className="type-display-editorial type-display-editorial--italic block text-primary mt-1"
              style={{ fontSize: 'clamp(38px, 6vw, 64px)' }}
            >
              IT FITS.
            </span>
          </h2>

          <p className="type-body text-base md:text-lg leading-relaxed max-w-md mx-auto mb-10 font-light">
            Scan your body. Enter Infinite Drape Studio. Buy with confidence.
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="flex justify-center">
            {user ? (
              <Link
                to="/home"
                className="w-full max-w-md bg-primary text-primary-foreground font-bold rounded-full py-4 px-8 text-base tracking-wide flex items-center justify-center gap-2 hover:opacity-90 transition-opacity duration-200"
              >
                Enter App <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-0 w-full max-w-md">
                <Link
                  to="/auth"
                  className="w-full bg-primary text-primary-foreground font-bold rounded-full py-4 px-8 text-base tracking-wide flex items-center justify-center gap-2 hover:opacity-90 transition-opacity duration-200"
                >
                  Start Your Scan <ArrowRight className="h-4 w-4" />
                </Link>
                <span className="text-xs text-center text-muted-foreground/85 mt-3">
                  Biometric data encrypted end-to-end. Never sold.
                </span>
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
