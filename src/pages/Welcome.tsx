import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Camera, Crown, LogIn, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOnboarded } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import BottomTabBar from '@/components/BottomTabBar';

const Welcome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleStartScan = () => {
    trackEvent('home_start_scan_click');
    if (isOnboarded()) {
      navigate('/capture');
    } else {
      navigate('/onboarding');
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden pb-24">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[10%] left-[50%] -translate-x-1/2 h-[350px] w-[350px] rounded-full bg-primary/6 blur-[140px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 pt-5">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm flex items-center justify-between mb-16"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl gradient-drip flex items-center justify-center">
              <Crown className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-base tracking-wide">DRIP FIT</span>
          </div>
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground text-xs h-9 px-3 rounded-xl">
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign Out
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-muted-foreground text-xs h-9 px-3 rounded-xl">
              <LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign In
            </Button>
          )}
        </motion.nav>

        {/* Hero — simple, focused */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-xs mb-10"
        >
          <h1 className="font-display text-[28px] font-bold tracking-tight mb-3 leading-[1.2]">
            Find your <span className="gradient-drip-text">best size</span> in 30 seconds.
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            2 photos + your height. Matched against real retailer size charts.
          </p>
        </motion.div>

        {/* Single CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-xs mb-6"
        >
          <Button
            onClick={handleStartScan}
            className="w-full h-14 text-base font-display font-bold uppercase tracking-widest btn-luxury text-primary-foreground rounded-xl"
            size="lg"
          >
            <Camera className="mr-2.5 h-5 w-5" /> Start Scan
          </Button>
        </motion.div>

        {/* Trust line — one clean sentence */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-muted-foreground text-xs text-center max-w-[260px] leading-relaxed mb-14"
        >
          10+ retailer charts · confidence scores · fitted, regular & relaxed alternatives
        </motion.p>

        {/* How it works — minimal */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="w-full max-w-xs mb-10"
        >
          <h2 className="font-display text-base font-bold text-center mb-5">
            How It Works
          </h2>
          <div className="space-y-4">
            {[
              'Take 2 photos + enter your height',
              'We estimate your body measurements',
              'Match against retailer size charts',
              'Get your best size + alternatives',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-md gradient-drip flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold text-primary-foreground">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground/80">{text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Privacy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-6"
        >
          <Shield className="h-3 w-3" /> Private by default · delete anytime
        </motion.p>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default Welcome;
