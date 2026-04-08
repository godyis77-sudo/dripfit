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

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
      setSlide(0);
    }
  }, [location.key]);

  const resumeCurrentVideo = useCallback(() => {
    const activeVideo = videoRefs.current[slide];
    if (!activeVideo) return;

    activeVideo.muted = true;
    activeVideo.playsInline = true;

    const playPromise = activeVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignore autoplay failures until the next user gesture.
      });
    }
  }, [slide]);

  useEffect(() => {
    if (!visible) return;

    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      if (index === slide) {
        video.muted = true;
        video.playsInline = true;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            // Some mobile browsers require an explicit gesture.
          });
        }
        return;
      }

      video.pause();
    });
  }, [slide, visible]);

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
      onPointerDownCapture={resumeCurrentVideo}
      onTouchStart={(e) => {
        e.stopPropagation();
        resumeCurrentVideo();
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
    >
      <div className="absolute inset-0 bg-black" />

      {SLIDES.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === slide ? 1 : 0 }}
        >
          <video
            ref={(el) => {
              videoRefs.current[i] = el;
            }}
            src={s.video}
            autoPlay={i === 0}
            loop
            muted
            playsInline
            preload={Math.abs(i - slide) <= 1 ? 'auto' : 'metadata'}
            onLoadedData={() => {
              if (i === slide) {
                const activeVideo = videoRefs.current[i];
                activeVideo?.play().catch(() => {
                  // Ignore until user interacts.
                });
              }
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ))}

      <div className="absolute inset-0 editorial-gradient" />

      <button
        onClick={() => complete()}
        className="absolute top-4 right-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center pt-[env(safe-area-inset-top)] font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30"
      >
        Skip
      </button>

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
