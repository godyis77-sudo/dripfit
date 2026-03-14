import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Ruler, Sparkles, Users, ShoppingBag, Store, Shuffle, Eye, Shield, Camera } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import { setOnboarded, setShoppingHabit, setGuestMode, type ShoppingHabit } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import AuthForm from '@/components/auth/AuthForm';

import heroScan from '@/assets/onboarding-scan-results.jpg';
import ScanPreviewCard from '@/components/ui/ScanPreviewCard';
import DecorativeSilhouette from '@/components/ui/DecorativeSilhouette';
import heroTryon from '@/assets/hero-tryon-mirror.jpg';
import heroCommunity from '@/assets/hero-community-feedback.jpg';

type Screen = 'splash' | 'carousel' | 'auth' | 'personalize' | 'gender' | 'scan-prompt';

const GENDER_CHOICES = [
  { value: 'male', label: "Men's", desc: 'Show me menswear & sizing' },
  { value: 'female', label: "Women's", desc: 'Show me womenswear & sizing' },
  { value: 'both', label: 'Both', desc: "I shop across both sections" },
] as const;

const SLIDES = [
  {
    icon: Ruler,
    title: 'Know your exact size in every brand',
    highlight: '',
    desc: 'Stop guessing. Two photos and 60 seconds gives you precise measurements across SHEIN, Zara, H&M, Lululemon, and 10+ more.',
    image: heroScan,
  },
  {
    icon: Sparkles,
    title: 'See how it looks before you buy',
    highlight: '',
    desc: "Upload a photo of any clothing item and see yourself wearing it. No more buying blind — try-on thousands of styles instantly.",
    image: heroTryon,
  },
  {
    icon: Users,
    title: 'Get honest opinions from real people',
    highlight: '',
    desc: 'Post your virtual try-on to the Style Check community. Get votes from people with similar body types. Shop with total confidence.',
    image: heroCommunity,
  },
];

const HABITS: { value: ShoppingHabit; icon: typeof ShoppingBag; label: string; desc: string }[] = [
  { value: 'online', icon: ShoppingBag, label: 'Mostly Online', desc: 'I shop from my phone or laptop' },
  { value: 'mix', icon: Shuffle, label: 'Mix of Both', desc: 'Browse online, buy in-store or vice versa' },
  { value: 'instore', icon: Store, label: 'Mostly In-Store', desc: 'I prefer trying things on first' },
  { value: 'browser', icon: Eye, label: 'I Browse, Rarely Buy', desc: 'Sizing uncertainty stops me' },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [screen, setScreen] = useState<Screen>('splash');
  const [slideIdx, setSlideIdx] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const [habit, setHabit] = useState<ShoppingHabit | null>(null);
  const [genderChoice, setGenderChoice] = useState<string | null>(null);

  const slideVariants = {
    enter: (dir: number) => ({ x: reduceMotion ? 0 : (dir > 0 ? 24 : -24), opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: reduceMotion ? 0 : (dir > 0 ? -24 : 24), opacity: 0 }),
  };

  const smoothTransition = { duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] as const };
  const screenTransition = { duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as const };

  // Preload hero images, then advance splash
  useEffect(() => {
    if (screen !== 'splash') return;
    let advanced = false;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      trackEvent('onboarding_splash_done');
      setScreen('carousel');
    };

    // Show splash for at least 2.5s, then advance once images are ready or after 5s max
    const minDelay = window.setTimeout(() => { minElapsed = true; if (imagesReady) advance(); }, 1800);
    let minElapsed = false;
    let imagesReady = false;
    const timeout = window.setTimeout(advance, 3500);
    const imageUrls = SLIDES.map(s => s.image);
    let loaded = 0;
    imageUrls.forEach(src => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded >= imageUrls.length) { imagesReady = true; if (minElapsed) advance(); }
      };
      img.src = src;
    });

    return () => { advanced = true; window.clearTimeout(timeout); window.clearTimeout(minDelay); };
  }, [screen]);

  const tapSplash = useCallback(() => { trackEvent('onboarding_splash_done'); setScreen('carousel'); }, []);

  const nextSlide = () => {
    if (slideIdx < SLIDES.length - 1) { setSlideDir(1); setSlideIdx(i => i + 1); }
    else { trackEvent('onboarding_carousel_done'); setScreen(user ? 'personalize' : 'auth'); }
  };

  const skipCarousel = () => { trackEvent('onboarding_carousel_skip'); setScreen(user ? 'personalize' : 'auth'); };

  const onAuthDone = () => setScreen('personalize');

  const continueAsGuest = () => {
    setGuestMode();
    setOnboarded();
    trackEvent('onboarding_guest_mode');
    navigate('/');
  };

  const confirmHabit = () => {
    if (habit) { setShoppingHabit(habit); trackEvent('onboarding_shopping_habit', { habit }); }
    setScreen('gender');
  };

  const confirmGender = async () => {
    if (genderChoice) {
      trackEvent('onboarding_gender_selected', { gender: genderChoice });
      // Save to profile if authenticated
      if (user) {
        const mapped = genderChoice === 'both' ? null : genderChoice;
        await supabase.from('profiles').upsert({ user_id: user.id, gender: mapped }, { onConflict: 'user_id' });
      }
    }
    setScreen('scan-prompt');
  };

  const startScan = () => { setOnboarded(); trackEvent('onboarding_completed', { action: 'scan' }); navigate('/capture'); };
  const skipScan = () => { setOnboarded(); trackEvent('onboarding_scan_prompt_skip'); navigate('/'); };

  const totalSlides = SLIDES.length;
  const progress = useMemo(() => {
    if (screen === 'splash') return 0;
    if (screen === 'carousel') return 33 + (slideIdx + 1) * (34 / totalSlides);
    if (screen === 'auth' || screen === 'personalize') return 50;
    if (screen === 'gender') return 67;
    if (screen === 'scan-prompt') return 100;
    return 0;
  }, [screen, slideIdx, totalSlides]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center overflow-hidden">
      {/* Progress bar */}
      {screen !== 'splash' && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-muted">
          <div
            className="h-full bg-primary rounded-r-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <AnimatePresence mode="wait">

        {/* ── Screen 1: Splash — luxury brand reveal ── */}
        {screen === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.4, 0, 0.2, 1] }}
            onClick={tapSplash}
            className="flex flex-col items-center justify-center w-full h-screen bg-background cursor-pointer select-none"
          >
            <motion.div
              initial={{ scale: reduceMotion ? 1 : 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={screenTransition}
            >
              <BrandLogo size="lg" iconOnly className="mb-5" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduceMotion ? 0 : 0.25, ...screenTransition }}
              className="font-display text-2xl font-bold tracking-[0.2em]"
            >
              <span className="brand-logo-text">DRIPFIT</span> <span className="brand-logo-check">✔</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduceMotion ? 0 : 0.6, duration: reduceMotion ? 0 : 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="text-sm text-foreground mt-2"
            >
              The smarter way to shop fashion.
            </motion.p>
          </motion.div>
        )}

        {/* ── Screen 2: Value Prop Carousel ── */}
        {screen === 'carousel' && (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-[100dvh] flex flex-col"
          >
            {/* Skip */}
            <div className="px-6 pt-10 flex justify-end shrink-0">
              {slideIdx < SLIDES.length - 1 && (
                <button onClick={skipCarousel} className="text-[12px] text-muted-foreground font-semibold active:text-foreground transition-colors">
                  Skip
                </button>
              )}
            </div>

            {/* Slide content */}
            <div className="flex-1 flex flex-col min-h-0">
              <AnimatePresence mode="wait" custom={slideDir}>
                <motion.div
                  key={slideIdx}
                  custom={slideDir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={smoothTransition}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60 && slideIdx < SLIDES.length - 1) {
                      setSlideDir(1);
                      setSlideIdx(i => i + 1);
                    } else if (info.offset.x > 60 && slideIdx > 0) {
                      setSlideDir(-1);
                      setSlideIdx(i => i - 1);
                    }
                  }}
                  className="flex-1 flex flex-col items-center justify-center min-h-0 cursor-grab active:cursor-grabbing gap-6"
                >
                  {/* Image — centered with safe top padding */}
                  <div className="flex items-center justify-center mx-4 min-h-0 max-w-[480px] w-full self-center" style={{ maxHeight: '50dvh' }}>
                    {slideIdx === 0 ? (
                      <ScanPreviewCard height={356} />
                    ) : (
                      <div
                        className="relative rounded-2xl overflow-hidden"
                        style={{
                          maxHeight: '50dvh',
                          maxWidth: 'calc(100% - 30px)',
                          boxShadow: '0 0 16px 6px hsl(45 88% 50% / 0.7), 0 0 50px 18px hsl(45 88% 45% / 0.35), 0 0 90px 30px hsl(45 88% 40% / 0.15), inset 0 0 14px 3px hsl(45 88% 50% / 0.2)',
                          border: '2px solid hsl(45 88% 55% / 0.8)',
                        }}
                      >
                        <img
                          src={SLIDES[slideIdx].image}
                          alt={SLIDES[slideIdx].title}
                          className="w-full h-full object-cover rounded-2xl"
                          style={{
                            maxHeight: '100%',
                            ...(slideIdx === 1 ? { filter: 'brightness(0.8)' } : {}),
                          }}
                        />
                        {slideIdx === 1 && (
                          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
                            boxShadow: 'inset 0 0 60px 35px rgba(0,0,0,0.4)',
                          }} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Text — below image with consistent gap */}
                  <div className="flex flex-col items-center px-8 text-center shrink-0">
                    <div className="h-9 w-9 rounded-xl icon-3d flex items-center justify-center mb-2">
                      {(() => { const Icon = SLIDES[slideIdx].icon; return <Icon className="h-4 w-4 text-brand-logo-fg shimmer-icon" />; })()}
                    </div>
                    <h2 className="font-display text-[20px] font-bold text-foreground leading-tight">
                      {SLIDES[slideIdx].title}
                    </h2>
                    <p className="text-[13px] text-muted-foreground mt-1.5 leading-snug max-w-[300px]">
                      {SLIDES[slideIdx].desc}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dots + CTA — always visible */}
            <div className="shrink-0 flex flex-col items-center gap-3 px-6 pb-6 pt-2">
              <div className="flex gap-2">
                {SLIDES.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === slideIdx ? 'w-6 bg-primary' : 'w-1.5 bg-border'
                    }`}
                  />
                ))}
              </div>
              <Button
                onClick={nextSlide}
                className="w-full max-w-[300px] h-12 rounded-xl btn-luxury text-primary-foreground font-display font-bold text-base uppercase tracking-wider active:scale-[0.97] transition-transform"
              >
                {slideIdx < SLIDES.length - 1 ? 'Next' : 'Get Started'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Screen 3: Auth — frictionless ── */}
        {screen === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, x: reduceMotion ? 0 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduceMotion ? 0 : -30 }}
            transition={screenTransition}
            className="w-full h-screen flex flex-col items-center justify-center px-6"
          >
            <AuthForm onComplete={onAuthDone} showGuestContinue />
          </motion.div>
        )}

        {/* ── Screen 4: Personalization — 2×2 grid ── */}
        {screen === 'personalize' && (
          <motion.div
            key="personalize"
            initial={{ opacity: 0, x: reduceMotion ? 0 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduceMotion ? 0 : -30 }}
            transition={screenTransition}
            className="w-full h-screen flex flex-col px-6 pt-16 pb-8"
          >
            <p className="text-[11px] text-primary font-bold uppercase tracking-wider mb-1">Step 1 of 3</p>
            <h2 className="font-display text-xl font-bold text-foreground mb-1">How do you mainly shop?</h2>
            <p className="text-[13px] text-muted-foreground mb-6">This helps us personalize your experience.</p>

            {/* 2×2 grid */}
            <div className="grid grid-cols-2 gap-2.5 flex-1 content-start">
              {HABITS.map(h => {
                const Icon = h.icon;
                const selected = habit === h.value;
                return (
                  <button
                    key={h.value}
                    onClick={() => setHabit(h.value)}
                    className={`flex flex-col items-center justify-center text-center p-4 rounded-xl border-2 transition-all active:scale-[0.96] ${
                      selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-2 ${
                      selected ? 'icon-3d' : 'bg-card border border-border'
                    }`}>
                      <Icon className={`h-5 w-5 ${selected ? 'text-brand-logo-fg shimmer-icon' : 'text-muted-foreground'}`} />
                    </div>
                    <p className="font-bold text-[13px] text-foreground leading-tight">{h.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{h.desc}</p>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={confirmHabit}
              className="w-full h-12 rounded-xl btn-luxury text-primary-foreground font-display font-bold text-base uppercase tracking-wider active:scale-[0.97] transition-transform mt-4"
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {/* ── Screen 5: Gender Preference ── */}
        {screen === 'gender' && (
          <motion.div
            key="gender"
            initial={{ opacity: 0, x: reduceMotion ? 0 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduceMotion ? 0 : -30 }}
            transition={screenTransition}
            className="w-full h-screen flex flex-col px-6 pt-16 pb-8"
          >
            <p className="text-[11px] text-primary font-bold uppercase tracking-wider mb-1">Step 2 of 3</p>
            <h2 className="font-display text-xl font-bold text-foreground mb-1">I shop in the…</h2>
            <p className="text-[13px] text-muted-foreground mb-6">We'll show you the right products & sizing.</p>

            <div className="flex flex-col gap-2.5 flex-1 content-start">
              {GENDER_CHOICES.map(g => {
                const selected = genderChoice === g.value;
                return (
                  <button
                    key={g.value}
                    onClick={() => setGenderChoice(g.value)}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all active:scale-[0.97] ${
                      selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selected ? 'icon-3d' : 'bg-card border border-border'
                    }`}>
                      <ShoppingBag className={`h-5 w-5 ${selected ? 'text-brand-logo-fg shimmer-icon' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[14px] text-foreground leading-tight">{g.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{g.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              onClick={confirmGender}
              className="w-full h-12 rounded-xl btn-luxury text-primary-foreground font-display font-bold text-base uppercase tracking-wider active:scale-[0.97] transition-transform mt-4"
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {/* ── Screen 6: Scan Prompt — overcome the barrier ── */}
        {screen === 'scan-prompt' && (
          <motion.div
            key="scan-prompt"
            initial={{ opacity: 0, x: reduceMotion ? 0 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduceMotion ? 0 : -30 }}
            transition={screenTransition}
            className="w-full h-[100dvh] flex flex-col items-center px-6 pt-3 pb-4 overflow-hidden"
          >
            <p className="text-[11px] text-primary font-bold uppercase tracking-wider mb-1 shrink-0">Step 3 of 3</p>
            <div className="max-w-[320px] w-full flex flex-col items-center flex-1 min-h-0 justify-between">
              {/* Top section: image + text */}
              <div className="flex flex-col items-center min-h-0 flex-1">
                <div className="min-h-0 flex-1 flex items-center">
                  <ScanPreviewCard height={280} />
                </div>

                <h2 className="font-display text-lg font-bold text-foreground mb-0.5 text-center mt-1 shrink-0">Let's get your measurements</h2>
                <p className="text-[11px] text-muted-foreground text-center mb-1.5 shrink-0">See exactly how Zara M fits your 96cm chest.</p>

                {/* FAST */}
                <div className="flex items-center gap-5 mb-2 shrink-0">
                  {[
                    { val: '60s', label: 'seconds' },
                    { val: '2', label: 'photos' },
                    { val: '✓', label: "that's it" },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="font-display text-base font-bold gradient-drip-text">{s.val}</p>
                      <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom section: cards + CTA */}
              <div className="w-full flex flex-col items-center shrink-0">
                {/* SAFE */}
                <div className="w-full bg-card border border-border rounded-xl p-2.5 mb-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-[10px] text-foreground font-medium">Photos processed privately — never stored without your consent.</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-5.5">Delete anytime from Settings.</p>
                </div>

                {/* WORTH IT */}
                <div className="w-full bg-card border border-border rounded-xl p-2.5 mb-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">What you'll get</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'Chest', val: '96cm' },
                      { label: 'Waist', val: '82cm' },
                      { label: 'Hips', val: '100cm' },
                      { label: 'Size', val: 'M' },
                    ].map(m => (
                      <div key={m.label} className="bg-background rounded-lg py-1 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">{m.label}</p>
                        <p className="text-[11px] font-bold text-foreground">{m.val}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <Button
                  onClick={startScan}
                  className="w-full h-11 rounded-xl btn-luxury text-primary-foreground font-display font-bold text-base uppercase tracking-wider active:scale-[0.97] transition-transform"
                >
                  <Camera className="mr-2 h-4 w-4" /> Get My Size
                </Button>
                <button onClick={skipScan} className="text-[11px] text-muted-foreground font-semibold mt-2 hover:text-foreground transition-colors">
                  Skip for now — I'll do this later
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default Onboarding;