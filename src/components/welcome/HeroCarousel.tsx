import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroDripFit from '@/assets/hero-body-measurements.jpg';
import heroGetDripped from '@/assets/hero-get-dripped.jpg';
import heroDripCheck from '@/assets/hero-drip-check.jpg';

const heroSlides = [
  { image: heroDripFit, label: 'DRIP FIT', desc: 'AI body measurements from a single photo', route: '/capture', cta: 'DRIP FIT' },
  { image: heroGetDripped, label: 'GET DRIPPED', desc: 'Virtual try-on — see any outfit on you', route: '/tryon', cta: 'GET DRIPPED' },
  { image: heroDripCheck, label: 'DRIP CHECK', desc: 'Community ratings on your style & fit', route: '/community', cta: 'DRIP CHECK' },
];

const MeasurementOverlay = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 pointer-events-none">
    {[
      { label: 'Shoulder', top: '17%' },
      { label: 'Chest', top: '26%' },
      { label: 'Waist', top: '38%' },
      { label: 'Hip', top: '46%' },
      { label: 'Inseam', top: '56%' },
    ].map((m, i) => (
      <motion.div key={m.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1, duration: 0.3 }} className="absolute left-0 right-0 flex items-center" style={{ top: m.top }}>
        <span className="text-[10px] font-bold text-drip-gold/90 pl-2 pr-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{m.label}</span>
        <div className="flex-1 h-px bg-drip-gold/40" />
      </motion.div>
    ))}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.3 }} className="absolute right-3 flex flex-col items-center" style={{ top: '5%', bottom: '8%' }}>
      <div className="w-px flex-1 bg-drip-gold/40" />
      <span className="text-[9px] font-bold text-drip-gold/90 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" style={{ writingMode: 'vertical-rl' }}>Height</span>
      <div className="w-px flex-1 bg-drip-gold/40" />
    </motion.div>
  </motion.div>
);

const SparkleOverlay = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
    {[
      { top: '15%', left: '12%', delay: 0.3, size: 'h-3 w-3' },
      { top: '25%', left: '78%', delay: 0.5, size: 'h-2.5 w-2.5' },
      { top: '45%', left: '85%', delay: 0.7, size: 'h-2 w-2' },
      { top: '60%', left: '8%', delay: 0.4, size: 'h-2 w-2' },
      { top: '35%', left: '5%', delay: 0.6, size: 'h-1.5 w-1.5' },
    ].map((s, i) => (
      <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0.6, 1], scale: 1 }} transition={{ delay: s.delay, duration: 0.6, repeat: Infinity, repeatDelay: 2 + i * 0.5 }} className="absolute" style={{ top: s.top, left: s.left }}>
        <Sparkles className={`${s.size} text-drip-gold/70`} />
      </motion.div>
    ))}
  </motion.div>
);

const RatingOverlay = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 pointer-events-none">
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }} className="absolute top-3 left-3 right-3 flex items-center gap-1.5">
      <div className="flex items-center gap-0.5 bg-background/60 backdrop-blur-sm rounded-full px-2 py-1">
        {[...Array(5)].map((_, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.1 }}>
            <Star className="h-2.5 w-2.5 text-drip-gold fill-drip-gold" />
          </motion.div>
        ))}
        <span className="text-[9px] font-bold text-drip-gold ml-1">4.8</span>
      </div>
      {['🔥', '💯', '✨'].map((emoji, i) => (
        <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: [0, 1.2, 1] }} transition={{ delay: 0.7 + i * 0.15, duration: 0.4 }} className="bg-background/50 backdrop-blur-sm rounded-full h-6 w-6 flex items-center justify-center text-xs">
          {emoji}
        </motion.div>
      ))}
    </motion.div>
  </motion.div>
);

const HeroCarousel = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paused, setPaused] = useState(false);

  const nextSlide = useCallback(() => setCurrentSlide(i => (i + 1) % heroSlides.length), []);
  const prevSlide = useCallback(() => setCurrentSlide(i => (i - 1 + heroSlides.length) % heroSlides.length), []);

  const pauseAutoAdvance = useCallback(() => {
    setPaused(true);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => setPaused(false), 8000);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    pauseAutoAdvance();
  }, [pauseAutoAdvance]);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) diff > 0 ? nextSlide() : prevSlide();
  }, [nextSlide, prevSlide]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const handleArrowClick = useCallback((direction: 'prev' | 'next') => {
    pauseAutoAdvance();
    direction === 'prev' ? prevSlide() : nextSlide();
  }, [pauseAutoAdvance, prevSlide, nextSlide]);

  const handleDotClick = useCallback((i: number) => {
    pauseAutoAdvance();
    setCurrentSlide(i);
  }, [pauseAutoAdvance]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(nextSlide, 6500);
    return () => clearInterval(timer);
  }, [nextSlide, paused]);

  return (
    <>
      {/* Carousel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="w-full max-w-[260px] mb-8 relative"
      >
        <div className="absolute inset-0 -inset-x-8 -inset-y-6 rounded-[2rem] bg-primary/12 blur-3xl" />
        <div
          className="relative rounded-3xl overflow-hidden border-2 border-primary/25 shadow-[0_0_40px_-5px_hsl(42_45%_62%/0.35)] cursor-pointer aspect-[3/4]"
          onClick={() => navigate(heroSlides[currentSlide].route)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence initial={false}>
            <motion.img
              key={currentSlide}
              src={heroSlides[currentSlide].image}
              alt={heroSlides[currentSlide].label}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          </AnimatePresence>

          <AnimatePresence>
            {currentSlide === 0 && <MeasurementOverlay />}
            {currentSlide === 1 && <SparkleOverlay />}
            {currentSlide === 2 && <RatingOverlay />}
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 text-center px-4 pb-5 pt-10 bg-gradient-to-t from-background via-background/80 to-transparent">
            <span className="font-display text-lg font-extrabold gradient-drip-text tracking-wider block drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{heroSlides[currentSlide].label}</span>
            <p className="text-sm font-semibold text-foreground/90 mt-1.5 leading-snug max-w-[220px] mx-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{heroSlides[currentSlide].desc}</p>
          </div>
        </div>

        <button onClick={() => handleArrowClick('prev')} className="absolute left-[-18px] top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full glass border border-border/30 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => handleArrowClick('next')} className="absolute right-[-18px] top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full glass border border-border/30 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="flex justify-center gap-1.5 mt-3">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-5 bg-primary' : 'w-1.5 bg-foreground/20'}`}
            />
          ))}
        </div>
      </motion.div>

      {/* Contextual CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="w-full max-w-sm mb-10 text-center"
      >
        <motion.div whileHover={{ y: -2 }} whileTap={{ y: 4, scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <Button
            onClick={() => navigate(heroSlides[currentSlide].route)}
            className="w-full h-16 text-3xl font-display font-extrabold uppercase tracking-widest btn-3d-drip border-0 rounded-2xl animate-pulse-subtle"
            size="lg"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={currentSlide}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {heroSlides[currentSlide].cta}
              </motion.span>
            </AnimatePresence>
          </Button>
        </motion.div>
      </motion.div>
    </>
  );
};

export { heroSlides };
export default HeroCarousel;
