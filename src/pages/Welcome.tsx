import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Camera, Sparkles, Shirt, Users, LogIn, LogOut,
  Zap, ArrowRight, Crown
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import iconRuler from '@/assets/icon-ruler.png';
import iconOutfit from '@/assets/icon-outfit.png';
import iconCommunity from '@/assets/icon-community.png';

const Welcome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="relative min-h-screen bg-background overflow-hidden pb-20">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] h-[400px] w-[400px] rounded-full bg-primary/6 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[300px] w-[300px] rounded-full bg-accent/6 blur-[140px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 py-6">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-drip flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-base tracking-wide">DripCheck</span>
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

        {/* Compact Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-lg mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 18, delay: 0.2 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-drip glow-primary"
          >
            <Crown className="h-7 w-7 text-primary-foreground" />
          </motion.div>

          <h1 className="font-display text-4xl font-bold tracking-wide mb-2 leading-[1.1]">
            Check Your <span className="gradient-drip-text">Drip</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            AI body measurements, virtual try-on & community ratings — all in one app.
          </p>
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-full max-w-sm mb-4"
        >
          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 1, scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Button
              onClick={() => user ? navigate('/capture') : navigate('/auth')}
              className="w-full h-16 text-xl font-display font-bold uppercase tracking-wide btn-luxury border-0 text-primary-foreground shadow-[0_4px_0_0_hsl(42_40%_48%),0_6px_14px_hsl(0_0%_0%/0.15)]"
              size="lg"
            >
              {user ? "Check Your Drip" : "Get Started"} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>

        {/* Secondary Action Row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="w-full max-w-sm grid grid-cols-3 gap-2 mb-10"
        >
          {[
            { icon: iconRuler, label: "Fit Drip", path: "/capture" },
            { icon: iconOutfit, label: "Try-On", path: "/tryon" },
            { icon: iconCommunity, label: "Community", path: "/community" },
          ].map((item, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(item.path)}
              className="glass rounded-2xl border border-border/30 p-3 flex flex-col items-center gap-2 transition-all"
            >
              <img src={item.icon} alt="" className="h-8 w-8 object-contain brightness-0 invert" />
              <span className="text-xs font-display font-semibold text-foreground">{item.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* How It Works — compact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="w-full max-w-lg mb-10"
        >
          <h2 className="font-display text-lg font-bold text-center mb-5 tracking-wide">
            How It <span className="gradient-drip-text">Works</span>
          </h2>
          <div className="space-y-2.5">
            {[
              { step: "01", text: "Snap a photo with any reference object", icon: Camera },
              { step: "02", text: "AI analyzes your body measurements", icon: Sparkles },
              { step: "03", text: "Drip check any outfit virtually", icon: Shirt },
              { step: "04", text: "Share & get community feedback", icon: Users },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.08, duration: 0.5 }}
                className="flex items-center gap-3 glass rounded-xl p-3 border border-border/30"
              >
                <span className="font-display text-lg font-bold gradient-drip-text shrink-0 w-8">{item.step}</span>
                <p className="text-xs font-medium flex-1">{item.text}</p>
                <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Social Proof — compact */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="w-full max-w-lg mb-8"
        >
          <div className="glass rounded-2xl p-5 border border-border/30 text-center">
            <h3 className="font-display text-base font-bold mb-1">Community Rated</h3>
            <p className="text-muted-foreground text-xs leading-relaxed mb-3">
              Get honest ratings on style, color, fit & "would you buy it?"
            </p>
            <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" /> Style</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" /> Color</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" /> Fit</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" /> Buy It?</span>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="flex items-center gap-2 text-[10px] text-muted-foreground mb-4"
        >
          <Zap className="h-3 w-3 text-primary" />
          <span className="font-display">DripCheck</span>
          <span>• AI-Powered Fashion</span>
        </motion.footer>
      </div>
    </div>
  );
};

export default Welcome;
