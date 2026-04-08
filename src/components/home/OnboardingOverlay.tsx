import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDES = [
  {
    headline: 'Your closet. Verified.',
    sub: '7,000 pieces. 130 brands. Every link real.',
    video: '/videos/onboarding-bg-1.mp4',
  },
  {
    headline: 'See the drape. Before the bag drops.',
    sub: 'AI try-on. Your body. Any piece. Any background.',
    video: '/videos/onboarding-bg-2.mp4',
  },
  {
    headline: 'They already voted.',
    sub: 'Your Body Twins COP or DROP every fit.',
    video: '/videos/onboarding-bg-3.mp4',
  },
];

const STORAGE_KEY = 'onboarding_complete';

export default function OnboardingOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const hasInteracted = useRef(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
      setSlide(0);
    }
  }, [location.key]);

  // Play only the active slide's video, pause all others
  useEffect(() => {
    if (!visible) return;

    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === slide) {
        // Small delay lets the browser settle before play()
        setTimeout(() => {
          video.play().catch(() => {});
        }, 50);
      } else {
        video.pause();
      }
    });
  }, [slide, visible]);

  // On first user touch, force-start the current video (mobile autoplay unlock)
  const unlockPlayback = useCallback(() => {
    if (hasInteracted.current) return;
    hasInteracted.current = true;
    const active = videoRefs.current[slide];
    if (active) {
      active.play().catch(() => {});
    }
  }, [slide]);

  const complete = useCallback((dest?: string) => {
    localStorage.setItem(STORAGE_KEY, 'true');
    // Pause all videos on dismiss
    videoRefs.current.forEach(v => v?.pause());
    setVisible(false);
    if (dest) navigate(dest);
  }, [navigate]);

  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= SLIDES.length) return;
    setSlide(next);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      videoRefs.current.forEach(v => v?.pause());
    };
  }, []);

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] w-screen h-dvh overflow-hidden"
      onTouchStart={(e) => {
        e.stopPropagation();
        unlockPlayback();
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 50) {
          if (dx < 0 && slide < SLIDES.length - 1) goTo(slide + 1);
          if (dx > 0 && slide > 0) goTo(slide - 1);
        }
      }}
      onClick={unlockPlayback}
    >
      {/* Solid black base */}
      <div className="absolute inset-0 bg-black" />

      {/* One video per slide — only the active one plays */}
      {SLIDES.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === slide ? 1 : 0 }}
        >
          <video
            ref={(el) => { videoRefs.current[i] = el; }}
            src={s.video}
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ))}

      {/* Editorial gradient overlay */}
      <div className="absolute inset-0 editorial-gradient" />

      {/* Skip */}
      <button
        onClick={() => complete()}
        className="absolute top-4 right-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center pt-[env(safe-area-inset-top)] font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30"
      >
        Skip
      </button>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center px-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 text-center"
          >
            <h2 className="headline-editorial mx-auto max-w-[300px] text-2xl text-primary">
              {SLIDES[slide].headline}
            </h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="mx-auto mt-2 max-w-[260px] font-sans text-sm text-white/60"
            >
              {SLIDES[slide].sub}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="mb-6 flex gap-1.5">
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
            className="btn-glass mb-4 h-12 w-full max-w-[280px] rounded-xl text-sm font-semibold text-white"
          >
            Next
          </button>
        ) : (
          <div className="mb-4 w-full max-w-[280px] space-y-2">
            <button
              onClick={() => complete('/capture')}
              className="btn-luxury h-12 w-full rounded-xl text-sm font-bold text-primary-foreground"
            >
              Map Your Body
            </button>
            <button
              onClick={() => complete()}
              className="btn-glass h-12 w-full rounded-xl text-sm font-semibold text-white"
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
