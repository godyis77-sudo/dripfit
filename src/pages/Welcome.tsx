import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Camera, Shirt, Crown, LogIn, LogOut, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isOnboarded } from '@/lib/session';
import BottomTabBar from '@/components/BottomTabBar';

const Welcome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleStartScan = () => {
    if (isOnboarded()) {
      navigate('/capture');
    } else {
      navigate('/onboarding');
    }
  };

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
          className="w-full max-w-lg flex items-center justify-between mb-10"
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

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-lg mb-8"
        >
          <h1 className="font-display text-3xl font-bold tracking-wide mb-3 leading-[1.15]">
            Find your <span className="gradient-drip-text">best size</span> in 30 seconds.
          </h1>
          <p className="text-foreground/60 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            Scan → estimate → match retailer charts → fitted / regular / relaxed.
          </p>
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full max-w-sm mb-4"
        >
          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 4, scale: 0.98 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            <Button
              onClick={handleStartScan}
              className="w-full h-16 text-xl font-display font-extrabold uppercase tracking-widest btn-3d-drip border-0 rounded-2xl"
              size="lg"
            >
              <Camera className="mr-2 h-5 w-5" /> Start Scan
            </Button>
          </motion.div>
        </motion.div>

        {/* Secondary CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-sm mb-8"
        >
          <Button
            variant="outline"
            onClick={() => navigate('/tryon')}
            className="w-full h-12 rounded-2xl text-sm font-bold"
          >
            <Shirt className="mr-2 h-4 w-4" /> Generate Try-On
          </Button>
        </motion.div>

        {/* Preview cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-full max-w-sm mb-8"
        >
          <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Sample Result Preview</p>
          <Card className="rounded-2xl border-border/30">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: 'Chest', range: '96–102 cm' },
                  { label: 'Waist', range: '80–86 cm' },
                  { label: 'Hips', range: '98–104 cm' },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-[10px] font-semibold text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-bold text-foreground">{m.range}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between bg-primary/5 rounded-xl p-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Best Size at Zara</p>
                  <p className="text-xl font-bold text-primary">M</p>
                </div>
                <div className="flex items-center gap-1 bg-primary/10 rounded-lg px-2 py-1">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold text-primary">High confidence</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="w-full max-w-sm mb-8"
        >
          <h2 className="font-display text-lg font-bold text-center mb-4 tracking-wide">
            How It <span className="gradient-drip-text">Works</span>
          </h2>
          <div className="space-y-3">
            {[
              { step: '1', text: '2 photos + your height → body estimate' },
              { step: '2', text: 'Match against 10+ retailer size charts' },
              { step: '3', text: 'Get your best size + fitted/relaxed alternatives' },
              { step: '4', text: 'Optional: try-on + community ratings' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg gradient-drip flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary-foreground">{item.step}</span>
                </div>
                <p className="text-sm font-medium text-foreground/70 pt-1">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Privacy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-[11px] text-muted-foreground flex items-center gap-1 mb-6"
        >
          <Shield className="h-3 w-3" /> Private by default • delete anytime
        </motion.p>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default Welcome;
