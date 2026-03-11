import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Crown, LogIn, LogOut, Shield, Sparkles, Users, Ruler, Star, ChevronRight, ArrowRight, TrendingUp, Share2, Gift, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOnboarded, isGuestMode } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import BottomTabBar from '@/components/BottomTabBar';
import AuthenticatedHome from '@/components/home/AuthenticatedHome';

const PILLARS = [
  { icon: Ruler, label: 'Scan', desc: 'AI body measurements in 60 seconds', action: '/capture' },
  { icon: Sparkles, label: 'Try-On', desc: 'See it on you before you buy', action: '/tryon' },
  { icon: Users, label: 'Style Check', desc: 'Real feedback from real people', action: '/style-check' },
];

const TRUST = [
  { icon: Shield, text: 'Private by default' },
  { icon: Star, text: '10+ retailer charts' },
  { icon: TrendingUp, text: 'Confidence scores' },
];

const SOCIAL_PROOF = [
  { stat: '50K+', label: 'Scans completed' },
  { stat: '92%', label: 'Size accuracy' },
  { stat: '4.8★', label: 'User rating' },
];

const stagger = {
  container: {
    animate: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
  },
  item: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  },
};

const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [showScrollTop, setShowScrollTop] = useState(false);
  usePageTitle();

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!loading && !user && !isGuestMode() && !isOnboarded()) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleStartScan = () => {
    trackEvent('home_start_scan_click');
    navigate('/capture');
  };

  if (user) {
    return (
      <>
        <AuthenticatedHome />
        <BottomTabBar />
      </>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden pb-safe-tab">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.04] rounded-full blur-[120px] pointer-events-none" />

      {/* Sticky top nav bar */}
      <nav className="sticky top-0 z-50 h-[56px] flex items-center justify-between px-6 bg-background/60 backdrop-blur-2xl border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <Crown className="h-4 w-4 text-primary" />
          <span className="font-display text-[17px] tracking-[3px] text-foreground">DRIPFITCHECK</span>
        </div>
        <button
          onClick={() => { trackEvent('auth_started'); navigate('/auth'); }}
          className="text-[12px] font-medium text-muted-foreground active:opacity-70 transition-opacity tracking-wider uppercase"
        >
          Sign In
        </button>
      </nav>

      <motion.div
        variants={stagger.container}
        initial="initial"
        animate="animate"
        className="relative z-10 flex flex-col items-center px-6 pt-8"
      >

        {/* Hero */}
        <motion.div variants={stagger.item} className="text-center max-w-[340px] mb-8">
          <h1 className="font-display text-[32px] font-bold tracking-tight mb-3 leading-[1.1] text-foreground">
            Know your size{' '}
            <span className="gradient-drip-text italic">before</span> you buy
          </h1>
          <p className="text-muted-foreground text-[14px] leading-relaxed">
            Get your measurements, preview the outfit, and get real feedback — all in under 2 minutes.
          </p>
        </motion.div>

        {/* Primary CTA */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-3">
          <Button
            onClick={handleStartScan}
            variant="luxury"
            className="w-full h-13 text-[13px] font-bold uppercase tracking-[0.15em] rounded-2xl active:scale-[0.97] transition-transform"
            size="lg"
          >
            <Camera className="mr-2 h-4 w-4" /> Get My Size
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-2 tracking-wider uppercase">
            Free · 2 photos · 60 seconds
          </p>
        </motion.div>

        {/* How It Works */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-8 mt-6">
          <p className="section-label mb-3">How it works</p>
          <div className="space-y-2">
            {PILLARS.map((p, i) => (
              <motion.button
                key={p.label}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (p.label === 'Scan') handleStartScan();
                  else if (p.label === 'Try-On') { trackEvent('home_tryon_click'); navigate(p.action); }
                  else { trackEvent('home_fitcheck_click'); navigate(p.action); }
                }}
                className="w-full flex items-center gap-3.5 glass-card rounded-2xl py-3.5 px-4 group min-h-[44px]"
              >
                <div className="flex items-center justify-center h-9 w-9 rounded-xl gradient-drip shrink-0">
                  <p.icon className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[13px] font-bold text-foreground flex items-center gap-2">
                    <span className="text-[10px] text-primary/70 font-semibold">{String(i + 1).padStart(2, '0')}</span> {p.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{p.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Gold divider */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] my-2">
          <div className="divider-gold" />
        </motion.div>

        {/* What You'll Get */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-6 mt-6">
          <p className="section-label mb-3">What you'll get</p>
          <div className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">Your best size</p>
                <p className="font-display text-3xl font-bold gradient-drip-text leading-none">M</p>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5">
                <Star className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-bold text-primary">92% match</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Chest', val: '96–100' },
                { label: 'Waist', val: '80–84' },
                { label: 'Hips', val: '98–102' },
                { label: 'Inseam', val: '78–80' },
              ].map((m) => (
                <div key={m.label} className="bg-muted/50 rounded-xl px-2 py-2 text-center">
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
                  <p className="text-[11px] font-semibold text-foreground mt-0.5">{m.val}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-3">
              {['S', 'M', 'L'].map((s) => (
                <span
                  key={s}
                  className={`text-[10px] font-bold rounded-full px-3 py-1 transition-all ${
                    s === 'M'
                      ? 'gradient-drip text-primary-foreground shadow-gold-glow'
                      : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {s}
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground ml-auto tracking-wide">Zara · Regular fit</span>
            </div>
          </div>
        </motion.div>

        {/* Skip to Try-On */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-6 text-center">
          <button
            onClick={() => { trackEvent('home_tryon_click'); navigate('/tryon'); }}
            className="text-[12px] text-muted-foreground active:opacity-70 transition-opacity underline underline-offset-4 tracking-wide"
          >
            Or skip to Try-On →
          </button>
        </motion.div>

        {/* Trust bar */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] flex items-center justify-between mb-6">
          {TRUST.map((t) => (
            <div key={t.text} className="flex items-center gap-1.5">
              <t.icon className="h-3 w-3 text-primary/50" />
              <span className="text-[10px] text-muted-foreground tracking-wide">{t.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-6">
          <div className="grid grid-cols-3 gap-2.5">
            {SOCIAL_PROOF.map((s) => (
              <div key={s.label} className="text-center glass-card rounded-2xl py-4 px-2">
                <p className="font-display text-[22px] font-bold gradient-drip-text leading-none">{s.stat}</p>
                <p className="text-[9px] text-muted-foreground mt-1 tracking-wider uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Size Guide shortcut */}
        <motion.button
          variants={stagger.item}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/size-guide')}
          className="w-full max-w-[340px] flex items-center justify-between glass-card rounded-2xl px-5 py-4 mb-4 group min-h-[44px]"
        >
          <div>
            <p className="text-[14px] font-semibold text-foreground">Size Guide Match</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Upload any brand's chart → get your size</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </motion.button>

        {/* Referral CTA */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-8">
          <button
            onClick={() => {
              const baseUrl = window.location.origin;
              const url = user ? `${baseUrl}?ref=${user.id}` : baseUrl;
              if (navigator.share) {
                navigator.share({ title: 'DripFitCheck — Know your size before you buy', text: 'Get AI body measurements, virtual try-on, and real fit feedback. We both get 5 extra try-ons!', url });
              } else {
                navigator.clipboard.writeText(url);
                toast({ title: 'Link copied!', description: 'Share it with friends — you both get 5 extra try-ons.' });
              }
              trackEvent('share_action', { source: 'home_referral' });
            }}
            className="w-full flex items-center gap-3.5 glass-card rounded-2xl px-5 py-4 group active:scale-[0.98] transition-transform min-h-[44px]"
          >
            <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Gift className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-foreground">Invite Friends</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">You both get 5 extra try-ons this month</p>
            </div>
            <Share2 className="h-3.5 w-3.5 text-primary/50 shrink-0" />
          </button>
        </motion.div>
      </motion.div>

      {/* Scroll to top FAB */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 right-4 z-40 h-10 w-10 rounded-full glass-card flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Scroll to top"
          >
            <ChevronUp className="h-4 w-4 text-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      <BottomTabBar />
    </div>
  );
};

export default Welcome;
