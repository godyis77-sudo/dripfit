import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import BrandLogo from '@/components/ui/BrandLogo';
import FeatureIcon, { type FeatureIconName } from '@/components/ui/FeatureIcon';

const SLIDES: { icon: FeatureIconName; headline: string; sub: string; tag?: string }[] = [
  {
    icon: 'crown',
    headline: '7,000 pieces. 130 brands. Yours.',
    sub: 'Real products. Real prices. Real links. Not a mood board.',
    tag: 'SHOP DRIPFIT',
  },
  {
    icon: 'tryon',
    headline: 'On your body. Before your wallet.',
    sub: 'AI try-on. Any piece. Any background. See the drape before you drop the bag.',
  },
  {
    icon: 'stylecheck',
    headline: 'COP or DROP. Your Body & Drip Twins decide.',
    sub: 'People with your exact measurements rate every fit. The verdict is real.',
  },
];

const STORAGE_KEY = 'onboarding_complete';

export default function OnboardingOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(0);

  // Re-check localStorage when navigating back (e.g. from /onboarding reset)
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
      setSlide(0);
    }
  }, [location.key]);

  const complete = useCallback((dest?: string) => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
    if (dest) navigate(dest);
  }, [navigate]);

  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= SLIDES.length) return;
    setSlide(next);
  }, []);

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] w-screen h-dvh bg-background flex flex-col items-center justify-center px-8 overflow-hidden"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 50) {
          if (dx < 0 && slide < SLIDES.length - 1) goTo(slide + 1);
          if (dx > 0 && slide > 0) goTo(slide - 1);
        }
      }}
    >
      {/* Skip */}
      <button
        onClick={() => complete()}
        className="absolute top-4 right-4 pt-[env(safe-area-inset-top)] text-[12px] font-semibold text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        Skip
      </button>

      {/* Brand logo — always visible at top */}
      <div className="text-center mb-10">
        {/* Slide-specific icon */}
        <div className="mb-4 flex items-center justify-center">
          <FeatureIcon name={SLIDES[slide].icon} size={80} />
        </div>
        {SLIDES[slide].tag && <p className="text-[11px] font-bold tracking-[0.2em] text-primary uppercase mb-1">{SLIDES[slide].tag}</p>}
        <h2 className="text-xl font-bold font-display text-foreground mb-2">{SLIDES[slide].headline}</h2>
        <p className="text-[13px] text-muted-foreground max-w-[260px] mx-auto">{SLIDES[slide].sub}</p>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${i === slide ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* CTAs */}
      {slide < SLIDES.length - 1 ? (
        <button
          onClick={() => goTo(slide + 1)}
          className="w-full max-w-[280px] h-12 rounded-xl btn-luxury text-primary-foreground text-sm font-bold"
        >
          Next
        </button>
      ) : (
        <div className="w-full max-w-[280px] space-y-2">
          <button
            onClick={() => complete('/capture')}
            className="w-full h-12 rounded-xl btn-luxury text-primary-foreground text-sm font-bold"
          >
            Map Your Body
          </button>
          <button
            onClick={() => complete()}
            className="w-full h-12 rounded-xl border border-border text-foreground text-sm font-semibold"
          >
            Enter the Closet
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
