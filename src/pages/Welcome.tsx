import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { LogIn, LogOut, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import HeroCarousel from '@/components/welcome/HeroCarousel';
import HowItWorks from '@/components/welcome/HowItWorks';
import FooterCTA from '@/components/welcome/FooterCTA';
import BottomTabBar from '@/components/BottomTabBar';

const Welcome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="relative min-h-screen bg-background overflow-hidden pb-24">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-10%] left-[-10%] h-[400px] w-[400px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] h-[300px] w-[300px] rounded-full bg-accent/6 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-5 pt-4">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-drip flex items-center justify-center">
              <Crown className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-base tracking-wide">DRIP FIT</span>
          </div>
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground text-xs">
              <LogOut className="mr-1 h-3.5 w-3.5" /> Out
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-muted-foreground text-xs">
              <LogIn className="mr-1 h-3.5 w-3.5" /> Sign In
            </Button>
          )}
        </motion.nav>

        {/* Hero heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-lg mb-4"
        >
          <h1 className="font-display text-4xl font-bold tracking-wide mb-2 leading-[1.1]">
            Check Your <span className="gradient-drip-text">Drip</span>
          </h1>
          <p className="text-foreground/60 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            AI body measurements & virtual try-on. Know your fit, flex your style.
          </p>
        </motion.div>

        <HeroCarousel />
        <HowItWorks />
        <FooterCTA />
      </div>

      <BottomTabBar />
    </div>
  );
};

export default Welcome;
