import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Camera, Crown, LogIn, LogOut, Shield, Sparkles, Users, Ruler, Star, ChevronRight, ArrowRight, TrendingUp, Share2, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOnboarded } from '@/lib/session';
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

const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  usePageTitle();

  // Redirect first-time visitors to onboarding (only after auth finishes loading)
  useEffect(() => {
    if (!loading && !user) {
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
    <div className="relative min-h-screen bg-background overflow-hidden pb-safe-bottom">
      {/* Sticky top nav bar */}
      <nav className="sticky top-0 z-50 h-[52px] flex items-center justify-between px-5 bg-background/80 backdrop-blur-lg border-b border-[hsl(0,0%,10%)]">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <span className="font-display font-bold text-[16px] tracking-[2px] text-foreground">DRIPFITCHECK</span>
        </div>
        <button
          onClick={() => { trackEvent('auth_started'); navigate('/auth'); }}
          className="text-[13px] text-muted-foreground active:opacity-70 transition-opacity"
        >
          Sign In
        </button>
      </nav>

      <div className="relative z-10 flex flex-col items-center px-5 pt-4">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-[300px] mb-6"
        >
          <h1 className="font-display text-[28px] font-bold tracking-tight mb-2 leading-[1.12] text-foreground">
            Know your size{' '}
            <span className="text-primary">before</span> you buy
          </h1>
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            Get your measurements, preview the outfit, and get real feedback — all in under 2 minutes.
          </p>
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="w-full max-w-[300px] mb-2"
        >
          <Button
            onClick={handleStartScan}
            className="w-full h-12 text-sm font-semibold uppercase tracking-widest rounded-xl active:scale-[0.97] transition-transform"
            size="lg"
          >
            <Camera className="mr-2 h-4 w-4" /> Get My Size
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Free · 2 photos · 60 seconds
          </p>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-full max-w-[300px] mb-6 mt-4"
        >
          <p className="section-label mb-2">How it works</p>
          <div className="space-y-1.5">
            {PILLARS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => {
                  if (p.label === 'Scan') handleStartScan();
                  else if (p.label === 'Try-On') { trackEvent('home_tryon_click'); navigate(p.action); }
                  else { trackEvent('home_fitcheck_click'); navigate(p.action); }
                }}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-xl py-3 px-3 group active:scale-[0.97] transition-transform min-h-[44px]"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary shrink-0">
                  <p.icon className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[12px] font-bold text-foreground flex items-center gap-1.5">
                    <span className="text-[10px] text-primary font-bold">{i + 1}.</span> {p.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{p.desc}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Separator */}
        <div className="w-full max-w-[300px] my-6">
          <div className="h-px bg-[hsl(0,0%,16%)]" />
        </div>

        {/* What You'll Get */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-full max-w-[300px] mb-5"
        >
          <p className="section-label mb-2">What you'll get</p>
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your best size</p>
                <p className="font-display text-2xl font-bold text-primary leading-none">M</p>
              </div>
              <div className="flex items-center gap-1 bg-primary/15 rounded-lg px-2 py-1">
                <Star className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-bold text-primary">92% match</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Chest', val: '96–100' },
                { label: 'Waist', val: '80–84' },
                { label: 'Hips', val: '98–102' },
                { label: 'Inseam', val: '78–80' },
              ].map((m) => (
                <div key={m.label} className="bg-muted rounded-lg px-1.5 py-1.5 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                  <p className="text-[11px] font-semibold text-foreground">{m.val}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {['S', 'M', 'L'].map((s) => (
                <span
                  key={s}
                  className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 ${
                    s === 'M'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s}
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground ml-auto">Zara · Regular fit</span>
            </div>
          </div>
        </motion.div>

        {/* Skip to Try-On text link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="w-full max-w-[300px] mb-5 text-center"
        >
          <button
            onClick={() => { trackEvent('home_tryon_click'); navigate('/tryon'); }}
            className="text-[13px] text-muted-foreground active:opacity-70 transition-opacity"
          >
            Or skip to Try-On →
          </button>
        </motion.div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-[300px] flex items-center justify-between mb-5"
        >
          {TRUST.map((t) => (
            <div key={t.text} className="flex items-center gap-1">
              <t.icon className="h-3 w-3 text-primary/70" />
              <span className="text-[10px] text-muted-foreground">{t.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="w-full max-w-[300px] mb-5"
        >
          <div className="grid grid-cols-3 gap-2">
            {SOCIAL_PROOF.map((s) => (
              <div key={s.label} className="text-center bg-card border border-border rounded-xl py-3 px-2">
                <p className="font-display text-[20px] font-bold text-primary leading-none">{s.stat}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Size Guide shortcut */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          onClick={() => navigate('/size-guide')}
          className="w-full max-w-[300px] flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 mb-3 group active:scale-[0.98] transition-transform min-h-[44px]"
        >
          <div>
            <p className="text-[13px] font-semibold text-foreground">Size Guide Match</p>
            <p className="text-[11px] text-muted-foreground">Upload any brand's chart → get your size</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </motion.button>

        {/* Referral CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-[300px] mb-6"
        >
          <button
            onClick={() => {
              const url = window.location.origin;
              if (navigator.share) {
                navigator.share({ title: 'DripFitCheck — Know your size before you buy', text: 'Get AI body measurements, virtual try-on, and real fit feedback.', url });
              } else {
                navigator.clipboard.writeText(url);
                toast({ title: 'Link copied!', description: 'Share it with friends to help them find their size.' });
              }
              trackEvent('share_action', { source: 'home_referral' });
            }}
            className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 group active:scale-[0.98] transition-transform min-h-[44px]"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Gift className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[12px] font-bold text-foreground">Invite Friends</p>
              <p className="text-[10px] text-muted-foreground">Share DripFitCheck — help your crew find their size</p>
            </div>
            <Share2 className="h-3.5 w-3.5 text-primary shrink-0" />
          </button>
        </motion.div>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default Welcome;
