import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Shield, Sparkles, Users, Ruler, Star, ChevronRight, TrendingUp, Share2, Gift, ChevronUp, Zap } from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import FeatureIcon from '@/components/ui/FeatureIcon';
import { useAuth } from '@/hooks/useAuth';
import { isOnboarded, isGuestMode } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import BottomTabBar from '@/components/BottomTabBar';
import AuthenticatedHome from '@/components/home/AuthenticatedHome';
import HeroParticles from '@/components/home/HeroParticles';

const PILLARS = [
  { featureIcon: 'scan' as const, label: 'Scan', desc: 'AI body measurements in 60 seconds', action: '/capture' },
  { featureIcon: 'tryon' as const, label: 'Try-On', desc: 'See how it looks before you buy', action: '/tryon' },
  { featureIcon: 'stylecheck' as const, label: 'Style Check', desc: 'Get honest opinions from real people', action: '/style-check' },
];

const TRUST = [
  { icon: Shield, text: 'Private by default' },
  { icon: Star, text: '10+ brand charts' },
  { icon: TrendingUp, text: 'Confidence scores' },
];

const SOCIAL_PROOF = [
  { stat: '50K+', label: 'Scans completed' },
  { stat: '92%', label: 'Size accuracy' },
  { stat: '4.8★', label: 'User rating' },
];

const stagger = {
  container: {
    animate: { transition: { staggerChildren: 0.06, delayChildren: 0 } },
  },
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
  },
};

const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
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
      <div className="min-h-screen bg-background">
        <AuthenticatedHome />
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background overflow-hidden pb-safe-tab aurora-bg">
      {/* Ambient orbs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/[0.03] rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed top-1/3 -right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(280 40% 35% / 0.04), transparent)' }} />

      {/* Sparkle particles */}
      <div className="fixed inset-0 z-[1] pointer-events-none">
        <HeroParticles />
      </div>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 h-[56px] flex items-center justify-between px-6 glass-bar border-b">
        <BrandLogo size="sm" />
        <button
          onClick={() => { trackEvent('auth_started'); navigate('/auth'); }}
          className="text-[11px] font-semibold text-muted-foreground active:opacity-70 transition-all tracking-widest uppercase hover:text-primary"
        >
          Sign In
        </button>
      </nav>

      {/* Hero — no animation wrapper so LCP paints instantly */}
      <div className="relative z-10 flex flex-col items-center px-6 pt-10">
        <div className="text-center max-w-[340px] mb-10">
          <h1 className="font-display text-[34px] font-bold tracking-tight mb-4 leading-[1.08] text-foreground">
            Your Tailored Size & Style.{' '}
            <span className="gradient-drip-text italic">Verified Culture,</span>{' '}
            Certified Drip.
          </h1>
          <p className="text-muted-foreground text-[14px] leading-relaxed max-w-[300px] mx-auto">
            Two photos. Sixty seconds. Your exact measurements across every brand — plus virtual try-on and real feedback.
          </p>
        </div>
      </div>

      <motion.div
        variants={stagger.container}
        initial="initial"
        animate="animate"
        className="relative z-10 flex flex-col items-center px-6"
      >

        {/* Primary CTA */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-3">
          <Button
            onClick={handleStartScan}
            className="w-full h-14 text-[13px] font-bold uppercase tracking-[0.18em] rounded-2xl active:scale-[0.97] transition-transform btn-luxury text-primary-foreground shimmer-sweep"
            size="lg"
          >
            <Camera className="mr-2.5 h-4.5 w-4.5" /> Get My Size
          </Button>
          <p className="text-[10px] text-muted-foreground/70 text-center mt-2.5 tracking-[0.2em] uppercase">
            Free · 2 photos · 60 seconds
          </p>
        </motion.div>

        {/* How It Works */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-8 mt-8">
          <p className="section-label mb-4">How it works</p>
          <div className="space-y-2.5">
            {PILLARS.map((p, i) => (
              <motion.button
                key={p.label}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (p.label === 'Scan') handleStartScan();
                  else if (p.label === 'Try-On') { trackEvent('home_tryon_click'); navigate(p.action); }
                  else { trackEvent('home_fitcheck_click'); navigate(p.action); }
                }}
                className="w-full flex items-center gap-4 glass-card rounded-2xl py-4 px-4.5 group min-h-[44px] glow-hover"
              >
                <div className="h-11 w-11 shrink-0 flex items-center justify-center">
                  <FeatureIcon name={p.featureIcon} size={40} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[13px] font-bold text-foreground flex items-center gap-2">
                    <span className="text-[11px] text-primary/60 font-bold tabular-nums">{String(i + 1).padStart(2, '0')}</span> {p.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{p.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Gold divider */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] my-2">
          <div className="divider-gold" />
        </motion.div>

        {/* What You'll Get */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-8 mt-8">
          <p className="section-label mb-4">What you'll get</p>
          <div className="glass-card rounded-2xl p-5 border-glow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] text-muted-foreground/70 uppercase tracking-[0.2em]">Your best size</p>
                <p className="font-display text-4xl font-bold gradient-drip-text leading-none mt-1">M</p>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                <Star className="h-3 w-3 text-primary shimmer-icon" />
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
                <div key={m.label} className="bg-muted/40 rounded-xl px-2 py-2.5 text-center border border-border/30">
                  <p className="text-[10px] text-muted-foreground/70 uppercase tracking-[0.15em]">{m.label}</p>
                  <p className="text-[11px] font-bold text-foreground mt-1 tabular-nums">{m.val}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-4">
              {['S', 'M', 'L'].map((s) => (
                <span
                  key={s}
                  className={`text-[10px] font-bold rounded-full px-3.5 py-1.5 transition-all ${
                    s === 'M'
                      ? 'btn-gold-3d text-primary-foreground shadow-gold-glow'
                      : 'bg-muted/40 text-muted-foreground/60 border border-border/30'
                  }`}
                >
                  {s}
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground/60 ml-auto tracking-wide">Zara · Regular fit</span>
            </div>
          </div>
        </motion.div>

        {/* Skip to Try-On */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-8 text-center">
          <button
            onClick={() => { trackEvent('home_tryon_click'); navigate('/tryon'); }}
            className="text-[12px] text-muted-foreground/60 active:opacity-70 transition-all underline underline-offset-4 decoration-muted-foreground/20 hover:text-primary hover:decoration-primary/40 tracking-wide"
          >
            Skip to Try-On →
          </button>
        </motion.div>

        {/* Trust bar */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] flex items-center justify-between mb-8 px-2">
          {TRUST.map((t) => (
            <div key={t.text} className="flex items-center gap-1.5">
              <t.icon className="h-3 w-3 text-primary/70 shimmer-icon" />
              <span className="text-[10px] text-muted-foreground/70 tracking-wide">{t.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-8">
          <div className="grid grid-cols-3 gap-2.5">
            {SOCIAL_PROOF.map((s) => (
              <div key={s.label} className="text-center glass-card rounded-2xl py-5 px-2 glow-hover">
                <p className="font-display text-[24px] font-bold gradient-drip-text leading-none">{s.stat}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1.5 tracking-[0.15em] uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Size Guide shortcut */}
        <motion.button
          variants={stagger.item}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/size-guide')}
          className="w-full max-w-[340px] flex items-center justify-between glass-card rounded-2xl px-5 py-4.5 mb-4 group min-h-[44px] glow-hover"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 flex items-center justify-center">
              <FeatureIcon name="sizeguide" size={32} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-foreground">Size Guide Match</p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">Upload any brand's chart → get your size</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </motion.button>

        {/* Referral CTA */}
        <motion.div variants={stagger.item} className="w-full max-w-[340px] mb-10">
          <button
            onClick={() => {
              const baseUrl = window.location.origin;
              const url = user ? `${baseUrl}?ref=${user.id}` : baseUrl;
              if (navigator.share) {
                navigator.share({ title: 'DRIPFIT ✔ — Your Tailored Size & Style. Verified Culture, Certified Drip.', text: 'AI body measurements, virtual try-on, and real fit feedback. We both get 5 extra try-ons!', url });
              } else {
                navigator.clipboard.writeText(url);
                toast({ title: 'Link copied!', description: 'Share it with friends — you both get 5 extra try-ons.' });
              }
              trackEvent('share_action', { source: 'home_referral' });
            }}
            className="w-full flex items-center gap-4 glass-card rounded-2xl px-5 py-4.5 group active:scale-[0.98] transition-transform min-h-[44px] glow-hover"
          >
            <div className="h-10 w-10 badge-gold-3d shimmer-sweep shrink-0 flex items-center justify-center">
              <Gift className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-bold text-foreground">Invite a Friend</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">You both earn 5 extra try-ons this month</p>
            </div>
            <Share2 className="h-3.5 w-3.5 text-primary/40 group-hover:text-primary transition-colors shrink-0" />
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
            className="fixed bottom-24 right-4 z-40 h-10 w-10 rounded-full glass-card flex items-center justify-center active:scale-95 transition-transform glow-hover"
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
