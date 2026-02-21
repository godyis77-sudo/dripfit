import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Camera, Crown, LogIn, LogOut, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOnboarded } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import BottomTabBar from '@/components/BottomTabBar';

const STEPS = [
  { num: '1', text: '2 photos + enter your height' },
  { num: '2', text: 'We estimate your body measurements' },
  { num: '3', text: 'Match against retailer size charts' },
  { num: '4', text: 'Get your best size + alternatives' },
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
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 h-[280px] w-[280px] rounded-full bg-primary/6 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-5 pt-4">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm flex items-center justify-between mb-10"
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
          className="text-center max-w-[280px] mb-8"
        >
          <h1 className="font-display text-[26px] font-bold tracking-tight mb-2 leading-[1.15]">
            Find your <span className="gradient-drip-text">best size</span> in 30s
          </h1>
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            2 photos + your height. Matched against real retailer size charts.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="w-full max-w-[280px] mb-4"
        >
          <Button
            onClick={handleStartScan}
            className="w-full h-12 text-sm font-display font-bold uppercase tracking-widest btn-luxury text-primary-foreground rounded-lg"
            size="lg"
          >
            <Camera className="mr-2 h-4 w-4" /> Start Scan
          </Button>
        </motion.div>

        {/* Trust */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-muted-foreground text-[11px] text-center max-w-[240px] leading-relaxed mb-10"
        >
          10+ retailer charts · confidence scores · fitted, regular & relaxed
        </motion.p>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="w-full max-w-[280px] mb-8"
        >
          <p className="section-label mb-3">How It Works</p>
          <div className="space-y-2">
            {STEPS.map((s) => (
              <div key={s.num} className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5">
                <div className="h-6 w-6 rounded-md gradient-drip flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-primary-foreground">{s.num}</span>
                </div>
                <p className="text-[13px] text-foreground/85 leading-snug">{s.text}</p>
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
          className="w-full max-w-[280px] flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3 mb-6 group"
        >
          <div>
            <p className="text-[13px] font-semibold text-foreground">Size Guide Match</p>
            <p className="text-[11px] text-muted-foreground">Upload any brand's chart → get your size</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </motion.button>

        {/* Privacy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-4"
        >
          <Shield className="h-3 w-3" /> Private by default · delete anytime
        </motion.p>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default Welcome;
