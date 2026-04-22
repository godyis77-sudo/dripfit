import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDES = [
  {
    headline: 'Your closet. Verified.',
    sub: '7,000 pieces. 130 brands. Every link real.',
    video: '/videos/onboarding-bg-1.mp4',
    poster: '/videos/onboarding-poster-1.jpg',
  },
  {
    headline: 'See the drape. Before the bag drops.',
    sub: 'AI try-on. Your body. Any piece. Any background.',
    video: '/videos/onboarding-bg-2.mp4',
    poster: '/videos/onboarding-poster-2.jpg',
  },
  {
    headline: 'They already voted.',
    sub: 'Your Body Twins COP or DROP every fit.',
    video: '/videos/onboarding-bg-3.mp4',
    poster: '/videos/onboarding-poster-3.jpg',
  },
] as const;

const STORAGE_KEY = 'onboarding_complete';

export default function OnboardingOverlay() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const [slide, setSlide] = useState(() => (localStorage.getItem(STORAGE_KEY) ? 0 : -1)); // -1 = logo intro
  const [needsTap, setNeedsTap] = useState(false);
  const [allPlaying, setAllPlaying] = useState(false);
  const [logoPhase, setLogoPhase] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([null, null, null]);
  const logoRan = useRef(false);

  // Start video 1 early, then fade out logo
  useEffect(() => {
    if (!visible || !logoPhase || logoRan.current) return;
    logoRan.current = true;
    const t1 = setTimeout(() => setSlide(0), 1000);
    const t2 = setTimeout(() => setLogoPhase(false), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible, logoPhase]);

  /** Play all 3 videos. Returns true if video 1 started successfully. */
  const playAll = useCallback(() => {
    let v1Success = false;

    videoRefs.current.forEach((video, i) => {
      if (!video) return;

      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');

      // Ensure src is set (videos 2 & 3 start with data-src only)
      if (!video.src || video.src === window.location.href) {
        const dataSrc = SLIDES[i].video;
        video.src = dataSrc;
        video.load();
      }

      const p = video.play();
      if (p) {
        p.then(() => {
          if (i === 0) {
            v1Success = true;
            setNeedsTap(false);
            setAllPlaying(true);
          }
        }).catch(() => {
          if (i === 0) setNeedsTap(true);
        });
      }
    });

    return v1Success;
  }, []);

  // Attempt autoplay when logo phase ends (slide becomes 0)
  useEffect(() => {
    if (!visible || slide < 0) return;

    const t1 = setTimeout(() => playAll(), 50);
    const t2 = setTimeout(() => {
      const v1 = videoRefs.current[0];
      if (v1 && v1.paused) playAll();
    }, 500);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visible, slide >= 0, playAll]);

  // Handle user tap — this is a real gesture so play() will work
  const handleUserGesture = useCallback(() => {
    playAll();
  }, [playAll]);

  const transitionToSlide = useCallback((next: number) => {
    if (next < 0 || next >= SLIDES.length) return;
    setSlide(next);
    // Ensure target video is playing (within gesture context)
    const v = videoRefs.current[next];
    if (v && v.paused) {
      v.muted = true;
      const p = v.play();
      if (p) p.catch(() => {});
    }
  }, []);

  const complete = useCallback((dest?: string) => {
    localStorage.setItem(STORAGE_KEY, 'true');
    videoRefs.current.forEach((v) => v?.pause());
    setVisible(false);
    if (dest) navigate(dest);
  }, [navigate]);

  useEffect(() => {
    return () => { videoRefs.current.forEach((v) => v?.pause()); };
  }, []);

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] h-dvh w-screen overflow-hidden"
      onClick={handleUserGesture}
      onTouchStart={(e) => {
        handleUserGesture();
        touchStartX.current = e.touches[0].clientX;
        touchStartTime.current = Date.now();
      }}
      onTouchEnd={(e) => {
        if (logoPhase) return;
        e.stopPropagation();
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dt = Date.now() - touchStartTime.current;
        const velocity = Math.abs(dx) / Math.max(dt, 1);
        // Swipe triggers on either sufficient distance OR fast flick
        const triggered = Math.abs(dx) > 40 && (Math.abs(dx) > 80 || velocity > 0.3);
        if (!triggered) return;
        if (dx < 0 && slide < SLIDES.length - 1) transitionToSlide(slide + 1);
        if (dx > 0 && slide > 0) transitionToSlide(slide - 1);
      }}
    >
      <div className="absolute inset-0 bg-black" />

      {SLIDES.map((s, i) => (
        <video
          key={i}
          ref={(el) => { videoRefs.current[i] = el; }}
          src={i === 0 ? s.video : undefined}
          poster={s.poster}
          autoPlay={i === 0}
          muted
          loop
          playsInline
          preload={i === 0 ? 'auto' : 'none'}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            i === slide ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      <div className="absolute inset-0 editorial-gradient" />

      {/* DripFit logo intro — cross-fades into slide 1 */}
      <AnimatePresence>
        {logoPhase && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.15 }}
              className="flex flex-col items-center gap-0"
            >
              <h1 className="font-display text-5xl font-extrabold tracking-tight text-foreground uppercase">
                DRIPFIT <span className="text-primary" style={{ fontSize: '80%' }}>✔</span>
              </h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
                className="font-sans text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground mt-3"
              >
                YOUR BIOMETRIC SCAN.
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap-to-play prompt — only shows when autoplay is blocked */}
      <AnimatePresence>
        {needsTap && !allPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-20 flex items-center justify-center"
            onClick={handleUserGesture}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.05, 1] }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="ml-1">
                  <path d="M8 5v14l11-7L8 5z" fill="white" />
                </svg>
              </div>
              <p className="font-sans text-xs font-medium tracking-widest uppercase text-white/50">
                Tap to start
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!logoPhase && (
        <button
          onClick={(e) => { e.stopPropagation(); complete(); }}
          className="absolute top-4 right-4 z-30 flex min-h-[44px] min-w-[44px] items-center justify-center pt-[env(safe-area-inset-top)] font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30"
        >
          Skip
        </button>
      )}

      {!logoPhase && slide >= 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center px-8"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={slide}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 text-center"
            >
              <h2 className="headline-editorial mx-auto max-w-[300px] text-2xl text-primary">
                {SLIDES[slide].headline}
              </h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
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
                onClick={(e) => { e.stopPropagation(); transitionToSlide(i); }}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === slide ? 'w-5 bg-primary' : 'w-1.5 bg-white/20'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {slide < SLIDES.length - 1 ? (
            <button
              onClick={(e) => { e.stopPropagation(); transitionToSlide(slide + 1); }}
              className="btn-glass mb-4 h-12 w-full max-w-[280px] rounded-xl text-sm font-semibold text-white"
            >
              Next
            </button>
          ) : (
            <div className="mb-4 w-full max-w-[280px] space-y-2">
              <button
                onClick={(e) => { e.stopPropagation(); complete('/capture'); }}
                className="btn-luxury h-12 w-full rounded-xl text-sm font-bold text-primary-foreground"
              >
                Map Your Body
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); complete(); }}
                className="btn-glass h-12 w-full rounded-xl text-sm font-semibold text-white"
              >
                Enter the Closet
              </button>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
