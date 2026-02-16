import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Sparkles, Shirt, Users, LogIn, LogOut,
  Star, Zap, Eye, TrendingUp, ChevronRight, ArrowRight,
  MessageCircle, Heart, Crown
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import iconRuler from '@/assets/icon-ruler.png';
import iconOutfit from '@/assets/icon-outfit.png';
import iconCommunity from '@/assets/icon-community.png';

const features = [
  {
    icon: Camera,
    title: "AI Body Scan",
    desc: "Snap a photo, get instant measurements. No tape needed.",
    gradient: "from-primary to-accent",
  },
  {
    icon: Shirt,
    title: "Drip Check",
    desc: "See how clothes look on you before you buy.",
    gradient: "from-accent to-drip-gold",
  },
  {
    icon: Users,
    title: "Community Drip",
    desc: "Share fits, get rated, discover trending styles.",
    gradient: "from-drip-gold to-primary",
  },
  {
    icon: MessageCircle,
    title: "Real Feedback",
    desc: "Get honest ratings on style, color, and fit from real people.",
    gradient: "from-primary to-drip-gold",
  },
];

const stats = [
  { value: "AI", label: "Powered Measurements" },
  { value: "∞", label: "Virtual Try-Ons" },
  { value: "4", label: "Rating Categories" },
];

const Welcome = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/6 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-accent/6 blur-[140px]" />
        <div className="absolute top-[40%] right-[20%] h-[300px] w-[300px] rounded-full bg-drip-gold/4 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 py-8">
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-lg flex items-center justify-between mb-12"
        >
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-drip flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg tracking-wide">DripCheck</span>
          </div>
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground">
              <LogOut className="mr-1 h-4 w-4" /> Out
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-muted-foreground">
              <LogIn className="mr-1 h-4 w-4" /> Sign In
            </Button>
          )}
        </motion.nav>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-lg mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 18, delay: 0.3 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl gradient-drip glow-primary"
          >
            <Crown className="h-10 w-10 text-primary-foreground" />
          </motion.div>

          <h1 className="font-display text-5xl font-bold tracking-wide mb-4 leading-[1.1]">
            Check Your{' '}
            <span className="gradient-drip-text">Drip</span>
            <br />
            Before You Buy
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-sm mx-auto">
            AI-powered body measurements & virtual try-on. Know your fit, flex your style, get rated by the community.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="flex gap-6 mb-12"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.12, duration: 0.6 }}
              className="text-center"
            >
              <p className="text-2xl font-display font-bold gradient-drip-text">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="w-full max-w-sm space-y-3 mb-16"
        >
          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 1, scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Button
              onClick={() => navigate('/capture')}
              className="w-full h-16 text-lg font-display font-bold uppercase tracking-widest btn-luxury border-0 text-primary-foreground shadow-[0_4px_0_0_hsl(42_40%_48%),0_6px_14px_hsl(0_0%_0%/0.15)]"
              size="lg"
            >
              <img src={iconRuler} alt="" className="mr-3 h-8 w-8 object-contain" /> START MEASURING
            </Button>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 1, scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Button
              onClick={() => navigate('/tryon')}
              variant="outline"
              className="w-full h-16 text-lg font-display font-bold uppercase tracking-widest border-border/40 shadow-[0_4px_0_0_hsl(0_0%_0%/0.12),0_6px_14px_hsl(0_0%_0%/0.08)] hover:bg-accent/10"
              size="lg"
            >
              <img src={iconOutfit} alt="" className="mr-3 h-8 w-8 object-contain" /> DRIP CHECK
            </Button>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 1, scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Button
              onClick={() => navigate('/community')}
              variant="outline"
              className="w-full h-16 text-lg font-display font-bold uppercase tracking-widest border-border/40 shadow-[0_4px_0_0_hsl(0_0%_0%/0.12),0_6px_14px_hsl(0_0%_0%/0.08)] hover:bg-primary/10"
              size="lg"
            >
              <img src={iconCommunity} alt="" className="mr-3 h-8 w-8 object-contain" /> COMMUNITY
            </Button>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          className="w-full max-w-lg mb-16"
        >
          <h2 className="font-display text-xl font-bold text-center mb-8 tracking-wide">
            Your Drip, <span className="gradient-drip-text">Elevated</span>
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.12, duration: 0.6 }}
                whileHover={{ scale: 1.02, y: -3, transition: { duration: 0.3 } }}
                className="glass rounded-2xl p-4 border border-border/30 cursor-default group"
              >
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${feat.gradient} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300`}>
                  <feat.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-sm mb-1">{feat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Community Vibe Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.7 }}
          className="w-full max-w-lg mb-16"
        >
          <div className="glass rounded-3xl p-6 border border-border/30 text-center">
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 text-drip-gold fill-drip-gold" />
              ))}
            </div>
            <h3 className="font-display text-lg font-bold mb-2">Community Rated</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Share your virtual try-ons and get honest feedback from real people. Rate outfits on style, color matching, fit suitability, and "would you buy it?"
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-primary" /> Style</span>
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-primary" /> Color</span>
              <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Fit</span>
              <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-primary" /> Buy It?</span>
            </div>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.7 }}
          className="w-full max-w-lg mb-16"
        >
          <h2 className="font-display text-xl font-bold text-center mb-8 tracking-wide">
            How It <span className="gradient-drip-text">Works</span>
          </h2>
          <div className="space-y-4">
            {[
              { step: "01", text: "Snap a photo with any reference object", icon: Camera },
              { step: "02", text: "AI analyzes your body measurements instantly", icon: Sparkles },
              { step: "03", text: "Drip check any outfit virtually", icon: Shirt },
              { step: "04", text: "Share your look & get community feedback", icon: Users },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + i * 0.12, duration: 0.6 }}
                className="flex items-center gap-4 glass rounded-2xl p-4 border border-border/30"
              >
                <span className="font-display text-2xl font-bold gradient-drip-text shrink-0 w-10">{item.step}</span>
                <p className="text-sm font-medium flex-1">{item.text}</p>
                <item.icon className="h-5 w-5 text-muted-foreground shrink-0" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.7 }}
          className="w-full max-w-sm text-center mb-12"
        >
          <h2 className="font-display text-2xl font-bold mb-3 tracking-wide">
            Ready to Check Your <span className="gradient-drip-text">Drip</span>?
          </h2>
          <p className="text-muted-foreground text-sm mb-6">Join the community and never second-guess your fit again.</p>
          <Button
            onClick={() => user ? navigate('/capture') : navigate('/auth')}
            className="w-full h-14 text-base font-display font-semibold btn-luxury border-0 text-primary-foreground"
            size="lg"
          >
            {user ? "Let's Go" : "Get Started Free"} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.7 }}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="font-display">DripCheck</span>
          <span>• AI-Powered Fashion</span>
        </motion.footer>
      </div>
    </div>
  );
};

export default Welcome;
