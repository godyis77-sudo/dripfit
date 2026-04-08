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
] as const;

const STORAGE_KEY = 'onboarding_complete';

/** Keep retrying .play() until it sticks — needed for restrictive autoplay policies */
function forcePlay(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', 'true');

  const attempt = () => {
    if (!video.paused) return;
    const p = video.play();
    if (p) p.catch(() => {});
  };

  attempt();

  // Retry a few times in case the browser blocked the first call
  const t1 = setTimeout(attempt, 200);
  const t2 = setTimeout(attempt, 600);
  const t3 = setTimeout(attempt, 1200);

  return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
}

export default function OnboardingOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null]);
  const cleanupRefs = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
      setSlide(0);
    }
  }, [location.key]);

  // Start all 3 videos once the overlay is visible.
  // Video 1 gets a slight head-start so it's playing by the time the user sees it.
  useEffect(() => {
    if (!visible) return;

    const cleanups: (() => void)[] = [];

    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      // First video starts immediately; others after a short stagger
      const delay = i === 0 ? 0 : 300 + i * 200;
      const timer = setTimeout(() => {
        const cleanup = forcePlay(video);
        cleanups.push(cleanup);
      }, delay);
      cleanups.push(() => clearTimeout(timer));
    });

    // Extra aggressive retry for video 1 specifically
    const v1 = videoRefs.current[0];
    if (v1) {
      const interval = setInterval(() => {
        if (!v1.paused) { clearInterval(interval); return; }
        v1.muted = true;
        const p = v1.play();
        if (p) p.catch(() => {});
      }, 400);
      cleanups.push(() => clearInterval(interval));
    }

    cleanupRefs.current = cleanups;

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [visible]);

  // Also try to play on any user interaction (unlocks autoplay)
  const unlockAll = useCallback(() => {
    videoRefs.current.forEach((video) => {
      if (video && video.paused) {
        const p = video.play();
        if (p) p.catch(() => {});
      }
    });
  }, []);

  const transitionToSlide = useCallback((next: number) => {
    if (next < 0 || next >= SLIDES.length) return;
    setSlide(next);
    unlockAll();
  }, [unlockAll]);

  const complete = useCallback((dest?: string) => {
    localStorage.setItem(STORAGE_KEY, 'true');
    videoRefs.current.forEach((v) => v?.pause());
    cleanupRefs.current.forEach((fn) => fn());
    setVisible(false);
    if (dest) navigate(dest);
  }, [navigate]);

  useEffect(() => {
    return () => {
      videoRefs.current.forEach((v) => v?.pause());
      cleanupRefs.current.forEach((fn) => fn());
    };
  }, []);

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] h-dvh w-screen overflow-hidden"
      onPointerDownCapture={unlockAll}
      onTouchStart={(e) => {
        e.stopPropagation();
        unlockAll();
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) <= 50) return;
        if (dx < 0 && slide < SLIDES.length - 1) transitionToSlide(slide + 1);
        if (dx > 0 && slide > 0) transitionToSlide(slide - 1);
      }}
      onClick={unlockAll}
    >
      {/* Black base so crossfade doesn't flash white */}
      <div className="absolute inset-0 bg-black" />

      {/* All 3 videos stacked — active one is opacity-100, others opacity-0 */}
      {SLIDES.map((s, i) => (
        <video
          key={i}
          ref={(el) => { videoRefs.current[i] = el; }}
          src={s.video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
            i === slide ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      <div className="absolute inset-0 editorial-gradient" />

      <button
        onClick={() => complete()}
        className="absolute top-4 right-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center pt-[env(safe-area-inset-top)] font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30"
      >
        Skip
      </button>

      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col items-center px-8"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
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
              onClick={() => transitionToSlide(i)}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === slide ? 'w-5 bg-primary' : 'w-1.5 bg-white/20'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {slide < SLIDES.length - 1 ? (
          <button
            onClick={() => transitionToSlide(slide + 1)}
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
