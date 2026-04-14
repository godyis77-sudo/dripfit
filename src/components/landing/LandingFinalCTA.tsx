import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FadeIn } from './LandingAnimations';
import { useAuth } from '@/hooks/useAuth';
import { setGuestMode } from '@/lib/session';

export default function LandingFinalCTA() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGuestMode = () => {
    setGuestMode();
    navigate('/home');
  };

  return (
    <section className="py-20 md:py-24 relative overflow-hidden border-t border-border/30">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none bg-primary/[0.04] blur-[120px]" />
      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <FadeIn>
          <span className="type-data text-primary/60 block mb-6">Your Drip. Verified.</span>
          <h2 className="type-brand leading-[1.08] mb-6" style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}>
            Stop Praying<br />
            <span className="text-primary">It Fits.</span>
          </h2>
          <p className="type-body text-lg leading-relaxed max-w-md mx-auto mb-10">
            Map your body. Enter the Infinite Closet. Cop with confidence.
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="flex justify-center gap-3 flex-wrap">
            {user ? (
              <Link
                to="/home"
                className="inline-flex items-center gap-2 h-13 px-8 rounded-full bg-foreground text-background font-medium text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                Enter App <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/auth"
                className="bg-[#C49A00] text-[#0A0A0A] font-bold rounded-full py-4 px-8 text-base tracking-wide inline-flex items-center justify-center gap-2 hover:bg-[#D4AF37] transition-colors duration-200"
              >
                Sign Up Free <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
