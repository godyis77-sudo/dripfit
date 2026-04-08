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

export default function OnboardingOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const [slide, setSlide] = useState(0);
  const [videoVisible, setVideoVisible] = useState(false);
  const touchStartX = useRef(0);
  const activeSlideRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const readyHandlerRef = useRef<(() => void) | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearReadyHandler = useCallback(() => {
    const video = videoRef.current;
    if (video && readyHandlerRef.current) {
      video.removeEventListener('canplay', readyHandlerRef.current);
    }
    readyHandlerRef.current = null;
  }, []);

  const configureVideo = useCallback((video: HTMLVideoElement) => {
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
      setSlide(0);
      setVideoVisible(false);
      activeSlideRef.current = 0;
    }
  }, [location.key]);

  const schedulePlaybackRetry = useCallback((index: number) => {
    clearRetryTimer();

    retryTimerRef.current = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || activeSlideRef.current !== index) {
        clearRetryTimer();
        return;
      }

      configureVideo(video);

      if (!video.paused) {
        setVideoVisible(true);
        clearRetryTimer();
        return;
      }

      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            setVideoVisible(true);
            clearRetryTimer();
          })
          .catch(() => {});
      }
    }, 350);
  }, [clearRetryTimer, configureVideo]);

  const playCurrentVideo = useCallback((index: number, options?: { fade?: boolean; restart?: boolean }) => {
    const video = videoRef.current;
    const src = SLIDES[index]?.video;
    if (!video || !src) return;

    activeSlideRef.current = index;
    configureVideo(video);
    clearRetryTimer();
    clearReadyHandler();

    const resolvedSrc = new URL(src, window.location.origin).href;
    const currentSrc = video.currentSrc || video.src || '';
    const shouldFade = options?.fade ?? true;
    const shouldRestart = options?.restart ?? true;

    const startPlayback = () => {
      if (activeSlideRef.current !== index) return;

      if (shouldRestart) {
        try {
          video.currentTime = 0;
        } catch {
          // Ignore currentTime failures on browsers that block seeks before metadata.
        }
      }

      setVideoVisible(true);
      const playPromise = video.play();

      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            setVideoVisible(true);
            clearRetryTimer();
          })
          .catch(() => {
            schedulePlaybackRetry(index);
          });
      }
    };

    if (currentSrc !== resolvedSrc) {
      if (shouldFade) setVideoVisible(false);
      video.pause();
      readyHandlerRef.current = startPlayback;
      video.addEventListener('canplay', startPlayback, { once: true });
      video.src = src;
      video.load();
      schedulePlaybackRetry(index);
      return;
    }

    if (video.readyState >= 2) {
      startPlayback();
      return;
    }

    readyHandlerRef.current = startPlayback;
    video.addEventListener('canplay', startPlayback, { once: true });
    video.load();
    schedulePlaybackRetry(index);
  }, [clearReadyHandler, clearRetryTimer, configureVideo, schedulePlaybackRetry]);

  useEffect(() => {
    if (!visible) return;

    const frame = window.requestAnimationFrame(() => {
      playCurrentVideo(0, { fade: false, restart: false });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.key, playCurrentVideo, visible]);

  const unlockPlayback = useCallback(() => {
    playCurrentVideo(activeSlideRef.current, { fade: false, restart: false });
  }, [playCurrentVideo]);

  const transitionToSlide = useCallback((next: number) => {
    if (next < 0 || next >= SLIDES.length || next === activeSlideRef.current) return;
    activeSlideRef.current = next;
    setSlide(next);
    playCurrentVideo(next, { fade: true, restart: true });
  }, [playCurrentVideo]);

  const complete = useCallback((dest?: string) => {
    localStorage.setItem(STORAGE_KEY, 'true');
    clearRetryTimer();
    clearReadyHandler();
    videoRef.current?.pause();
    setVisible(false);
    if (dest) navigate(dest);
  }, [clearReadyHandler, clearRetryTimer, navigate]);

  useEffect(() => {
    return () => {
      clearRetryTimer();
      clearReadyHandler();
      videoRef.current?.pause();
    };
  }, [clearReadyHandler, clearRetryTimer]);

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
        if (dx < 0 && slide < SLIDES.length - 1) transitionToSlide(slide + 1);
        if (dx > 0 && slide > 0) transitionToSlide(slide - 1);
      }}
      onClick={unlockPlayback}
    >
      <div className="absolute inset-0 bg-black" />

      <video
        ref={videoRef}
        src={SLIDES[0].video}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out ${videoVisible ? 'opacity-100' : 'opacity-0'}`}
      />

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
              onClick={() => transitionToSlide(i)}
              className={`h-1 rounded-full transition-all duration-300 ${i === slide ? 'w-5 bg-primary' : 'w-1.5 bg-white/20'}`}
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
