import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Camera, Crown, LogIn, LogOut, Shield, Sparkles, Users, Ruler, Star, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOnboarded } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import BottomTabBar from '@/components/BottomTabBar';

const PILLARS = [
  { icon: Ruler, label: 'Scan', desc: 'AI body measurements' },
  { icon: Sparkles, label: 'Try-On', desc: 'Virtual outfit preview' },
  { icon: Users, label: 'Fit Check', desc: 'Feedback before you buy' },
];

const TRUST = [
  { icon: Shield, text: 'Private by default' },
  { icon: Star, text: '10+ retailer charts' },
  { icon: Sparkles, text: 'Confidence scores' },
];

const Welcome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleStartScan = () => {
    trackEvent('home_start_scan_click');
    navigate(isOnboarded() ? '/capture' : '/onboarding');
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden pb-20">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 h-[320px] w-[320px] rounded-full bg-primary/8 blur-[140px]" />
        <div className="absolute bottom-[20%] right-0 h-[200px] w-[200px] rounded-full bg-drip-accent/5 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-5 pt-4">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-drip flex items-center justify-center">
              <Crown className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm tracking-wider">DRIP FIT</span>
          </div>
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground text-xs h-8 px-2.5 rounded-lg">
              <LogOut className="mr-1 h-3.5 w-3.5" /> Sign Out
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-muted-foreground text-xs h-8 px-2.5 rounded-lg">
              <LogIn className="mr-1 h-3.5 w-3.5" /> Sign In
            </Button>
          )}
        </motion.nav>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-[300px] mb-6"
        >
          <h1 className="font-display text-[28px] font-bold tracking-tight mb-2 leading-[1.12]">
            Never buy the <span className="gradient-drip-text">wrong size</span> again
          </h1>
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            Scan → Try-On → Fit Check — all before you buy.
          </p>
        </motion.div>

        {/* 3 Pillars */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="w-full max-w-[300px] grid grid-cols-3 gap-2 mb-6"
        >
          {PILLARS.map((p) => (
            <div key={p.label} className="flex flex-col items-center gap-1.5 bg-card border border-border rounded-lg py-3 px-2">
              <div className="h-8 w-8 rounded-lg gradient-drip flex items-center justify-center">
                <p.icon className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-[11px] font-bold text-foreground">{p.label}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{p.desc}</span>
            </div>
          ))}
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-full max-w-[300px] mb-2"
        >
          <Button
            onClick={handleStartScan}
            className="w-full h-12 text-sm font-display font-bold uppercase tracking-widest btn-luxury text-primary-foreground rounded-lg active:scale-[0.97] transition-transform"
            size="lg"
          >
            <Camera className="mr-2 h-4 w-4" /> Start Scan
          </Button>
        </motion.div>

        {/* Secondary CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="w-full max-w-[300px] mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/tryon')}
            className="w-full h-10 text-xs font-display font-semibold uppercase tracking-wider text-primary hover:text-primary hover:bg-primary/5 rounded-lg"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Try Virtual Try-On
          </Button>
        </motion.div>

        {/* Sample Result Preview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-full max-w-[300px] mb-6"
        >
          <p className="section-label mb-2">Sample Result</p>
          <div className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recommended</p>
                <p className="font-display text-2xl font-bold gradient-drip-text leading-none">M</p>
              </div>
              <div className="flex items-center gap-1 bg-primary/10 rounded-md px-2 py-1">
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
                <div key={m.label} className="bg-background rounded-md px-1.5 py-1.5 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                  <p className="text-[11px] font-semibold text-foreground">{m.val}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {['S', 'M', 'L'].map((s) => (
                <span
                  key={s}
                  className={`text-[10px] font-bold rounded-md px-2.5 py-0.5 ${
                    s === 'M'
                      ? 'gradient-drip text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {s}
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground ml-auto">Zara · Regular fit</span>
            </div>
          </div>
        </motion.div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-[300px] flex items-center justify-between mb-6"
        >
          {TRUST.map((t) => (
            <div key={t.text} className="flex items-center gap-1">
              <t.icon className="h-3 w-3 text-primary/70" />
              <span className="text-[10px] text-muted-foreground">{t.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Size Guide shortcut */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          onClick={() => navigate('/size-guide')}
          className="w-full max-w-[300px] flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 mb-4 group active:scale-[0.98] transition-transform"
        >
          <div>
            <p className="text-[13px] font-semibold text-foreground">Size Guide Match</p>
            <p className="text-[11px] text-muted-foreground">Upload any brand's chart → get your size</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </motion.button>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default Welcome;
