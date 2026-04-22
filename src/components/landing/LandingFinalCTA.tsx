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
          {/* Proof bar */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-8 text-[11px] tracking-[.18em] uppercase font-mono text-muted-foreground/70">
            <span><span className="text-primary">186</span> Brands</span>
            <span className="opacity-30">·</span>
            <span><span className="text-primary">389</span> Size Charts</span>
            <span className="opacity-30">·</span>
            <span><span className="text-primary">9,000+</span> Pieces</span>
          </div>

          {/* Headline — matches hero voice: Playfair 500 sentence-case + italic gold accent */}
          <h2
            className="leading-[1.04] mb-6 text-foreground"
            style={{
              fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
              fontWeight: 500,
              letterSpacing: '0.005em',
              fontSize: 'clamp(38px, 6vw, 64px)',
            }}
          >
            Stop praying.
            <span
              className="block text-primary mt-1"
              style={{
                fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif",
                fontStyle: 'italic',
                fontWeight: 500,
                letterSpacing: '0',
                fontSize: 'clamp(38px, 6vw, 64px)',
                lineHeight: 1.04,
              }}
            >
              It fits.
            </span>
          </h2>

          <p className="type-body text-base md:text-lg leading-relaxed max-w-md mx-auto mb-10 font-light">
            Scan your body. Enter Infinite Drape Studio. Cop with confidence.
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
                  Your biometric data is encrypted and never sold.
                </span>
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
