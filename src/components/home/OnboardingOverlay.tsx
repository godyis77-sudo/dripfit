import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDES = [
  {
    headline: 'Your closet. Verified.',
    sub: '7,000 pieces. 130 brands. Every link real.',
  },
  {
    headline: 'See the drape. Before the bag drops.',
    sub: 'AI try-on. Your body. Any piece. Any background.',
  },
  {
    headline: 'They already voted.',
    sub: 'Your Body Twins COP or DROP every fit.',
  },
];

const STORAGE_KEY = 'onboarding_complete';

export default function OnboardingOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(0);

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
      className="fixed inset-0 z-[100] w-screen h-dvh overflow-hidden"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 50) {
          if (dx < 0 && slide < SLIDES.length - 1) goTo(slide + 1);
          if (dx > 0 && slide > 0) goTo(slide - 1);
        }
      }}
    >
      {/* Background — dark editorial gradient placeholder */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 via-zinc-900 to-background" />

      {/* Editorial gradient overlay */}
      <div className="absolute inset-0 editorial-gradient" />

      {/* Skip */}
      <button
        onClick={() => complete()}
        className="absolute top-4 right-4 pt-[env(safe-area-inset-top)] z-10 text-[10px] font-sans font-semibold tracking-[0.2em] uppercase text-white/30 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        Skip
      </button>

      {/* Bottom content area */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center px-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {/* Animated text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-8"
          >
            <h2 className="headline-editorial text-2xl text-primary max-w-[300px] mx-auto">
              {SLIDES[slide].headline}
            </h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="text-sm text-white/60 max-w-[260px] mx-auto mt-2 font-sans"
            >
              {SLIDES[slide].sub}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex gap-1.5 mb-6">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1 rounded-full transition-all duration-300 ${i === slide ? 'w-5 bg-primary' : 'w-1.5 bg-white/20'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* CTAs */}
        {slide < SLIDES.length - 1 ? (
          <button
            onClick={() => goTo(slide + 1)}
            className="w-full max-w-[280px] h-12 rounded-xl btn-glass text-white font-semibold text-sm mb-4"
          >
            Next
          </button>
        ) : (
          <div className="w-full max-w-[280px] space-y-2 mb-4">
            <button
              onClick={() => complete('/capture')}
              className="w-full h-12 rounded-xl btn-luxury text-primary-foreground text-sm font-bold"
            >
              Map Your Body
            </button>
            <button
              onClick={() => complete()}
              className="w-full h-12 rounded-xl btn-glass text-white font-semibold text-sm"
            >
              Enter the Closet
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
