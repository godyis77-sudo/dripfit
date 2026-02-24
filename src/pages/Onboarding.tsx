import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Crown, Ruler, Sparkles, Users, ShoppingBag, Store, Shuffle, Eye, Shield, Camera } from 'lucide-react';
import { setOnboarded } from '@/lib/session';
import { setShoppingHabit, type ShoppingHabit } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';

import heroScan from '@/assets/hero-measurements.png';
import heroTryon from '@/assets/hero-preview.png';
import heroCommunity from '@/assets/icon-community.png';

// ─── Screen types ──────────────────────────────
type Screen = 'splash' | 'carousel' | 'auth' | 'personalize' | 'scan-prompt';

// ─── Carousel slides ──────────────────────────
const SLIDES = [
  {
    icon: Ruler,
    title: 'Know your exact size',
    subtitle: 'across every brand',
    desc: 'AI-powered body scan in 60 seconds. No tape measure needed.',
    image: heroScan,
  },
  {
    icon: Sparkles,
    title: 'See how it looks on YOU',
    subtitle: 'before you buy',
    desc: 'Virtual try-on powered by AI. Upload any outfit and see it on your body.',
    image: heroTryon,
  },
  {
    icon: Users,
    title: 'Get honest feedback',
    subtitle: 'from real people like you',
    desc: 'Post your fit checks and get real ratings from the community.',
    image: heroCommunity,
  },
];

// ─── Shopping habit cards ─────────────────────
const HABITS: { value: ShoppingHabit; icon: typeof ShoppingBag; label: string; desc: string }[] = [
  { value: 'online', icon: ShoppingBag, label: 'Mostly online', desc: 'I shop from my phone or laptop' },
  { value: 'mix', icon: Shuffle, label: 'Mix of both', desc: 'I browse online and buy in-store (or vice versa)' },
  { value: 'instore', icon: Store, label: 'Mostly in-store', desc: 'I prefer trying things on first' },
  { value: 'browser', icon: Eye, label: 'I browse but rarely buy', desc: 'I love looking but sizing stops me' },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [screen, setScreen] = useState<Screen>('splash');
  const [slideIdx, setSlideIdx] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const [habit, setHabit] = useState<ShoppingHabit | null>(null);

  // Auto-advance splash
  useEffect(() => {
    if (screen !== 'splash') return;
    const t = setTimeout(() => {
      trackEvent('onboarding_splash_done');
      setScreen('carousel');
    }, 1500);
    return () => clearTimeout(t);
  }, [screen]);

  // Tap splash to skip timer
  const tapSplash = useCallback(() => {
    trackEvent('onboarding_splash_done');
    setScreen('carousel');
  }, []);

  const nextSlide = () => {
    if (slideIdx < SLIDES.length - 1) {
      setSlideDir(1);
      setSlideIdx(i => i + 1);
    } else {
      trackEvent('onboarding_carousel_done');
      // If user is already logged in, skip auth
      setScreen(user ? 'personalize' : 'auth');
    }
  };

  const skipCarousel = () => {
    trackEvent('onboarding_carousel_skip');
    setScreen(user ? 'personalize' : 'auth');
  };

  const onAuthDone = () => {
    setScreen('personalize');
  };

  const selectHabit = (h: ShoppingHabit) => {
    setHabit(h);
  };

  const confirmHabit = () => {
    if (habit) {
      setShoppingHabit(habit);
      trackEvent('onboarding_shopping_habit', { habit });
    }
    setScreen('scan-prompt');
  };

  const startScan = () => {
    setOnboarded();
    trackEvent('onboarding_completed', { action: 'scan' });
    navigate('/capture');
  };

  const skipScan = () => {
    setOnboarded();
    trackEvent('onboarding_scan_prompt_skip');
    navigate('/');
  };

  // ─── Render ──────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {/* ── Screen 1: Splash ───────────────── */}
        {screen === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={tapSplash}
            className="flex flex-col items-center justify-center w-full h-screen bg-foreground cursor-pointer select-none"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 16 }}
              className="h-20 w-20 rounded-2xl gradient-drip glow-primary flex items-center justify-center mb-4"
            >
              <Crown className="h-10 w-10 text-primary-foreground" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-display text-2xl font-bold tracking-widest text-background"
            >
              DRIP FIT
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-background/50 mt-2"
            >
              The smarter way to shop fashion.
            </motion.p>
          </motion.div>
        )}

        {/* ── Screen 2: Value Prop Carousel ──── */}
        {screen === 'carousel' && (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-screen flex flex-col px-6 pt-12 pb-8"
          >
            {/* Skip */}
            <button onClick={skipCarousel} className="self-end text-[12px] text-muted-foreground font-semibold mb-4">
              Skip
            </button>

            {/* Slide content */}
            <div className="flex-1 flex flex-col items-center justify-center relative">
              <AnimatePresence mode="wait" custom={slideDir}>
                <motion.div
                  key={slideIdx}
                  custom={slideDir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center max-w-[300px]"
                >
                  {/* Illustration */}
                  <div className="h-40 w-40 rounded-3xl bg-card border border-border flex items-center justify-center mb-6 overflow-hidden">
                    <img src={SLIDES[slideIdx].image} alt={SLIDES[slideIdx].title} className="h-32 w-32 object-contain" />
                  </div>
                  <div className="h-10 w-10 rounded-xl gradient-drip flex items-center justify-center mb-3">
                    {(() => { const Icon = SLIDES[slideIdx].icon; return <Icon className="h-5 w-5 text-primary-foreground" />; })()}
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground leading-tight">
                    {SLIDES[slideIdx].title}
                  </h2>
                  <p className="font-display text-lg font-bold gradient-drip-text leading-tight">
                    {SLIDES[slideIdx].subtitle}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
                    {SLIDES[slideIdx].desc}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dots + CTA */}
            <div className="flex flex-col items-center gap-4">
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

        {/* ── Screen 3: Auth ────────────────── */}
        {screen === 'auth' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="w-full h-screen flex flex-col items-center justify-center px-6"
          >
            <AuthInline onComplete={onAuthDone} />
          </motion.div>
        )}

        {/* ── Screen 4: Personalization ──────── */}
        {screen === 'personalize' && (
          <motion.div
            key="personalize"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="w-full h-screen flex flex-col px-6 pt-16 pb-8"
          >
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">Almost there</p>
            <h2 className="font-display text-xl font-bold text-foreground mb-1">How do you mainly shop?</h2>
            <p className="text-[13px] text-muted-foreground mb-6">This helps us give better recommendations.</p>

            <div className="space-y-2 flex-1">
              {HABITS.map(h => {
                const Icon = h.icon;
                return (
                  <button
                    key={h.value}
                    onClick={() => selectHabit(h.value)}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all active:scale-[0.98] ${
                      habit === h.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        habit === h.value ? 'gradient-drip' : 'bg-card border border-border'
                      }`}>
                        <Icon className={`h-4 w-4 ${habit === h.value ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-bold text-[14px] text-foreground">{h.label}</p>
                        <p className="text-[12px] text-muted-foreground">{h.desc}</p>
                      </div>
                    </div>
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

        {/* ── Screen 5: Scan Prompt ──────────── */}
        {screen === 'scan-prompt' && (
          <motion.div
            key="scan-prompt"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="w-full h-screen flex flex-col items-center justify-center px-6"
          >
            <div className="max-w-[300px] text-center flex flex-col items-center">
              <div className="h-32 w-32 rounded-3xl bg-card border border-border flex items-center justify-center mb-6 overflow-hidden">
                <img src={heroScan} alt="Body scan" className="h-24 w-24 object-contain" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-1">Let's get your measurements</h2>
              <div className="flex items-center gap-4 mb-6 mt-3">
                {[
                  { val: '60s', label: 'seconds' },
                  { val: '2', label: 'photos' },
                  { val: '100%', label: 'private' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="font-display text-lg font-bold gradient-drip-text">{s.val}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-muted-foreground flex items-center gap-1 mb-6">
                <Shield className="h-3 w-3" /> Completely private · delete anytime
              </p>
              <Button
                onClick={startScan}
                className="w-full h-12 rounded-xl btn-luxury text-primary-foreground font-display font-bold text-base uppercase tracking-wider active:scale-[0.97] transition-transform"
              >
                <Camera className="mr-2 h-4 w-4" /> Get My Size
              </Button>
              <button onClick={skipScan} className="text-[12px] text-muted-foreground font-semibold mt-3 hover:text-foreground transition-colors">
                Skip for now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Inline Auth Component (embedded in onboarding) ───
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, EyeOff as EyeOffIcon, Eye as EyeIcon } from 'lucide-react';

const AuthInline = ({ onComplete }: { onComplete: () => void }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  // If user becomes authenticated, advance
  useEffect(() => {
    if (user) onComplete();
  }, [user, onComplete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        trackEvent('auth_completed', { method: 'email' });
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        trackEvent('auth_completed', { method: 'email_signup' });
        toast({ title: 'Check your email', description: 'We sent a confirmation link to verify your account.' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleSocial = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSocialLoading(null); }
  };

  return (
    <div className="w-full max-w-[320px]">
      <div className="flex flex-col items-center mb-5">
        <div className="h-11 w-11 rounded-xl gradient-drip glow-primary flex items-center justify-center ring-2 ring-primary/20 mb-2">
          <Crown className="h-5 w-5 text-primary-foreground" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">Join DRIP FIT</h2>
        <p className="text-[13px] text-muted-foreground text-center mt-1">Create your free account to save results</p>
      </div>

      {/* Social */}
      <div className="flex gap-2 mb-3">
        <Button variant="outline" className="flex-1 h-10 rounded-lg text-[12px] font-semibold border-border/60 active:scale-[0.97] transition-transform" onClick={() => handleSocial('google')} disabled={!!socialLoading}>
          {socialLoading === 'google' ? '…' : (
            <><svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>Google</>
          )}
        </Button>
        <Button variant="outline" className="flex-1 h-10 rounded-lg text-[12px] font-semibold border-border/60 active:scale-[0.97] transition-transform" onClick={() => handleSocial('apple')} disabled={!!socialLoading}>
          {socialLoading === 'apple' ? '…' : (
            <><svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>Apple</>
          )}
        </Button>
      </div>

      <div className="relative mb-3">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
        <div className="relative flex justify-center text-[11px]"><span className="bg-background px-2 text-muted-foreground">or continue with email</span></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="space-y-1">
          <Label htmlFor="ob-email" className="text-[11px] text-foreground/70">Email</Label>
          <div className="relative">
            <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input id="ob-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-8 rounded-lg h-9 text-[13px] border-border/60 focus:border-primary" required />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ob-pw" className="text-[11px] text-foreground/70">Password</Label>
          <div className="relative">
            <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input id="ob-pw" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-8 pr-9 rounded-lg h-9 text-[13px] border-border/60 focus:border-primary" minLength={6} required />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-2.5 text-muted-foreground p-0.5">
              {showPw ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full h-10 rounded-lg btn-luxury text-primary-foreground font-display font-bold text-[14px] uppercase tracking-wider" disabled={loading}>
          {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
        </Button>
      </form>

      <p className="text-center text-[12px] text-muted-foreground mt-3">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-bold hover:underline">
          {isLogin ? 'Sign Up' : 'Sign in instead'}
        </button>
      </p>
      <p className="text-[10px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
        <Shield className="h-3 w-3" /> Private by default · delete anytime
      </p>
    </div>
  );
};

export default Onboarding;
