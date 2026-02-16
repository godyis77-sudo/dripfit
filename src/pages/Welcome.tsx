import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Camera, Sparkles, Shirt, Users, LogIn, LogOut,
  Zap, Eye, TrendingUp, ArrowRight,
  Heart, Crown, Star
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import heroPreview from '@/assets/hero-preview.png';
import BottomTabBar from '@/components/BottomTabBar';

const features = [
  { icon: Camera, title: "DRIP FIT", desc: "Snap a photo, get instant body measurements.", gradient: "from-primary to-accent", path: "/capture" },
  { icon: Shirt, title: "GET DRIPPED", desc: "See how clothes look on you before you buy.", gradient: "from-accent to-drip-gold", path: "/tryon" },
  { icon: Users, title: "DRIP CHECK", desc: "Share fits, get rated, discover styles.", gradient: "from-drip-gold to-primary", path: "/community" },
];

const inView = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

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

        {/* Hero — compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-lg mb-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.2 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-drip glow-primary ring-2 ring-primary/20"
          >
            <Crown className="h-8 w-8 text-primary-foreground" />
          </motion.div>

          <h1 className="font-display text-4xl font-bold tracking-wide mb-2 leading-[1.1]">
            Check Your <span className="gradient-drip-text">Drip</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            AI body measurements & virtual try-on. Know your fit, flex your style.
          </p>
        </motion.div>

        {/* Hero Preview Image with glow backdrop */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="w-full max-w-[200px] mb-6 relative"
        >
          {/* Gold glow behind phone */}
          <div className="absolute inset-0 -inset-x-6 -inset-y-4 rounded-[2rem] bg-primary/10 blur-2xl" />
          <div className="relative rounded-3xl overflow-hidden border-2 border-primary/25 shadow-[0_0_30px_-5px_hsl(42_45%_62%/0.3)]">
            <img src={heroPreview} alt="DripCheck virtual try-on preview" className="w-full h-auto" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          </div>
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-sm space-y-2.5 mb-10"
        >
          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 4, scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Button
              onClick={() => navigate('/capture')}
              className="w-full h-16 text-xl font-display font-extrabold uppercase tracking-widest btn-3d-drip border-0 rounded-2xl"
              size="lg"
            >
              DRIP FIT
            </Button>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 4, scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Button
              onClick={() => navigate('/tryon')}
              className="w-full h-16 text-xl font-display font-extrabold uppercase tracking-widest btn-3d-drip border-0 rounded-2xl"
              size="lg"
            >
              GET DRIPPED
            </Button>
          </motion.div>

          <motion.div whileHover={{ y: -2 }} whileTap={{ y: 4, scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Button
              onClick={() => navigate('/community')}
              className="w-full h-16 text-xl font-display font-extrabold uppercase tracking-widest btn-3d-drip border-0 rounded-2xl"
              size="lg"
            >
              DRIP CHECK
            </Button>
          </motion.div>
        </motion.div>

        {/* Features Grid — whileInView */}
        <motion.div
          variants={inView}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="w-full max-w-lg mb-10"
        >
          <h2 className="font-display text-lg font-bold text-center mb-5 tracking-wide">
            Your Drip, <span className="gradient-drip-text">Elevated</span>
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                onClick={() => navigate(feat.path)}
                className="glass rounded-2xl p-3.5 border border-border/30 group cursor-pointer hover:border-primary/30 transition-colors duration-300"
              >
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${feat.gradient} flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform duration-300`}>
                  <feat.icon className="h-4.5 w-4.5 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-sm mb-0.5">{feat.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Community Rated — with stars back */}
        <motion.div
          variants={inView}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="w-full max-w-lg mb-10"
        >
          <div className="glass rounded-2xl p-5 border border-border/30 text-center">
            <div className="flex items-center justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4.5 w-4.5 text-drip-gold fill-drip-gold" />
              ))}
            </div>
            <h3 className="font-display text-base font-bold mb-2">Community Rated</h3>
            <p className="text-muted-foreground text-xs leading-relaxed mb-3">
              Share your virtual try-ons and get real feedback on style, color, fit, and "would you buy it?"
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5 text-primary" /> Style</span>
              <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 text-primary" /> Color</span>
              <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Fit</span>
              <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-primary" /> Buy It?</span>
            </div>
          </div>
        </motion.div>

        {/* How It Works — with connecting line */}
        <motion.div
          variants={inView}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="w-full max-w-lg mb-10"
        >
          <h2 className="font-display text-lg font-bold text-center mb-5 tracking-wide">
            How It <span className="gradient-drip-text">Works</span>
          </h2>
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-[1.35rem] top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
            <div className="space-y-2.5">
              {[
                { step: "01", text: "Snap a photo with any reference object", icon: Camera },
                { step: "02", text: "AI analyzes your measurements instantly", icon: Sparkles },
                { step: "03", text: "Drip check any outfit virtually", icon: Shirt },
                { step: "04", text: "Share & get community feedback", icon: Users },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="relative flex items-center gap-3 glass rounded-xl p-3 border border-border/30"
                >
                  <span className="font-display text-xl font-bold gradient-drip-text shrink-0 w-8 text-center relative z-10">{item.step}</span>
                  <p className="text-xs font-medium flex-1">{item.text}</p>
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Final CTA */}
        <motion.div
          variants={inView}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="w-full max-w-sm text-center mb-8"
        >
          <h2 className="font-display text-xl font-bold mb-2 tracking-wide">
            Ready to Check Your <span className="gradient-drip-text">Drip</span>?
          </h2>
          <p className="text-muted-foreground text-xs mb-4">Join the community and never second-guess your fit.</p>
          <Button
            onClick={() => user ? navigate('/capture') : navigate('/auth')}
            className="w-full h-16 text-xl font-display font-extrabold uppercase tracking-widest btn-3d-drip border-0 rounded-2xl"
            size="lg"
          >
            {user ? "LET'S GO" : "GET STARTED"} <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>

        {/* Footer with social links */}
        <motion.footer
          variants={inView}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="flex flex-col items-center gap-3 text-muted-foreground mb-4"
        >
          <div className="flex items-center gap-4">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-display">Instagram</a>
            <span className="text-border">•</span>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-display">TikTok</a>
            <span className="text-border">•</span>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-[10px] font-display">Twitter</a>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <Zap className="h-3 w-3 text-primary" />
            <span className="font-display">DripCheck</span>
            <span>• AI-Powered Fashion</span>
          </div>
          <div className="flex items-center gap-3 text-[9px]">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <span className="text-border">•</span>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <span className="text-border">•</span>
            <span>Made with ❤️</span>
          </div>
        </motion.footer>
      </div>

      <BottomTabBar />
    </div>
  );
};

export default Welcome;
