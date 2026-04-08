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
  const hasInteracted = useRef(false);
  const activeSlideRef = useRef(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
      setSlide(0);
      activeSlideRef.current = 0;
    }
  }, [location.key]);

  const playSlideVideo = useCallback((index: number) => {
    activeSlideRef.current = index;

    // Clear any existing retry loop
    if (retryTimerRef.current) {
      window.clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      video.muted = true;
      video.playsInline = true;
      video.loop = true;

      if (i !== index) {
        video.pause();
        return;
      }

      const attemptPlay = () => {
        if (activeSlideRef.current !== index) return false;
        const p = video.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
        return true;
      };

      if (video.readyState >= 2) {
        attemptPlay();
      } else {
        video.load();
        video.addEventListener('loadeddata', () => attemptPlay(), { once: true });
      }

      // Retry loop: keep trying every 300ms until the video is actually playing
      retryTimerRef.current = window.setInterval(() => {
        if (activeSlideRef.current !== index) {
          if (retryTimerRef.current) window.clearInterval(retryTimerRef.current);
          return;
        }
        if (video.paused && video.readyState >= 2) {
          video.play().catch(() => {});
        }
        if (!video.paused) {
          // Playing! Stop retrying.
          if (retryTimerRef.current) window.clearInterval(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      }, 300);
    });
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => playSlideVideo(slide), 0);
    return () => window.clearTimeout(timer);
  }, [slide, visible, playSlideVideo]);

  const unlockPlayback = useCallback(() => {
    hasInteracted.current = true;
    playSlideVideo(activeSlideRef.current);
  }, [playSlideVideo]);

  const transitionToSlide = useCallback((next: number, fromGesture = false) => {
    if (next < 0 || next >= SLIDES.length) return;
    if (fromGesture) hasInteracted.current = true;

    setSlide(next);
    playSlideVideo(next);
  }, [playSlideVideo]);

  const complete = useCallback((dest?: string) => {
    localStorage.setItem(STORAGE_KEY, 'true');
    videoRefs.current.forEach((video) => video?.pause());
    setVisible(false);
    if (dest) navigate(dest);
  }, [navigate]);

  useEffect(() => {
    return () => {
      videoRefs.current.forEach((video) => video?.pause());
    };
  }, []);

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] h-dvh w-screen overflow-hidden"
      onPointerDownCapture={unlockPlayback}
      onTouchStart={(e) => {
        e.stopPropagation();
        unlockPlayback();
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) <= 50) return;
        if (dx < 0 && slide < SLIDES.length - 1) transitionToSlide(slide + 1, true);
        if (dx > 0 && slide > 0) transitionToSlide(slide - 1, true);
      }}
      onClick={unlockPlayback}
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
            muted
            loop
            playsInline
            preload="auto"
            onLoadedData={() => {
              if (visible && activeSlideRef.current === i) {
                playSlideVideo(i);
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
            onAnimationComplete={() => playSlideVideo(slide)}
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
              onClick={() => transitionToSlide(i, true)}
              className={`h-1 rounded-full transition-all duration-300 ${i === slide ? 'w-5 bg-primary' : 'w-1.5 bg-white/20'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {slide < SLIDES.length - 1 ? (
          <button
            onClick={() => transitionToSlide(slide + 1, true)}
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
