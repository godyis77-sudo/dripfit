import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Sparkles, Camera, Heart, ShoppingBag, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/analytics';
import { useState } from 'react';

const TRENDING_FITS = [
  { id: '1', img: '', user: 'Alex', votes: 42, caption: 'Date night look?' },
  { id: '2', img: '', user: 'Jordan', votes: 38, caption: 'Office casual vibes' },
  { id: '3', img: '', user: 'Sam', votes: 55, caption: 'Festival ready?' },
  { id: '4', img: '', user: 'Kai', votes: 29, caption: 'Street style check' },
  { id: '5', img: '', user: 'Riley', votes: 61, caption: 'Too bold?' },
  { id: '6', img: '', user: 'Morgan', votes: 34, caption: 'Brunch fit' },
];

const RECOMMENDED = [
  { id: '1', label: 'Oversized tee — Your size: L', brand: 'Zara' },
  { id: '2', label: 'Slim chinos — Your size: 32', brand: 'H&M' },
  { id: '3', label: 'Bomber jacket — Your size: M', brand: 'Uniqlo' },
];

const AuthenticatedHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fabOpen, setFabOpen] = useState(false);

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="relative min-h-screen bg-background pb-safe-bottom">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[5%] left-1/2 -translate-x-1/2 h-[280px] w-[280px] rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <div className="relative z-10 px-5 pt-5">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <p className="text-muted-foreground text-[12px]">{greeting},</p>
          <h1 className="font-display text-xl font-bold text-foreground capitalize">{displayName}</h1>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-2 mb-6"
        >
          <button
            onClick={() => { trackEvent('home_quick_scan'); navigate('/capture'); }}
            className="flex items-center gap-2.5 bg-card border border-border rounded-xl p-3 active:scale-[0.97] transition-transform"
          >
            <div className="h-9 w-9 rounded-lg gradient-drip flex items-center justify-center shrink-0">
              <Camera className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="text-[12px] font-bold text-foreground">New Scan</p>
              <p className="text-[10px] text-muted-foreground">60 seconds</p>
            </div>
          </button>
          <button
            onClick={() => { trackEvent('home_quick_tryon'); navigate('/tryon'); }}
            className="flex items-center gap-2.5 bg-card border border-border rounded-xl p-3 active:scale-[0.97] transition-transform"
          >
            <div className="h-9 w-9 rounded-lg gradient-drip flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="text-[12px] font-bold text-foreground">Try-On</p>
              <p className="text-[10px] text-muted-foreground">See it on you</p>
            </div>
          </button>
        </motion.div>

        {/* Trending Fits */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <p className="section-label mb-0">Trending Fits</p>
            </div>
            <button
              onClick={() => navigate('/community')}
              className="text-[10px] text-primary font-semibold"
            >
              See all
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TRENDING_FITS.map((fit) => (
              <button
                key={fit.id}
                onClick={() => navigate('/community')}
                className="relative bg-card border border-border rounded-xl overflow-hidden aspect-[3/4] group active:scale-[0.97] transition-transform"
              >
                {/* Placeholder gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-card" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                  <Sparkles className="h-5 w-5 text-muted-foreground/40 mb-1" />
                  <p className="text-[9px] text-muted-foreground text-center leading-tight">{fit.caption}</p>
                </div>
                {/* Vote count */}
                <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                  <Heart className="h-2.5 w-2.5 text-primary" />
                  <span className="text-[9px] font-bold text-foreground">{fit.votes}</span>
                </div>
                {/* Username */}
                <div className="absolute top-1.5 left-1.5">
                  <span className="text-[8px] font-bold text-muted-foreground bg-background/60 rounded px-1 py-0.5">{fit.user}</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recommended For You */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2.5">
            <p className="section-label mb-0">Recommended for you</p>
          </div>
          <div className="space-y-1.5">
            {RECOMMENDED.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate('/tryon')}
                className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5 active:scale-[0.98] transition-transform"
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[12px] font-semibold text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.brand}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recently Saved */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <p className="section-label mb-0">Recently Saved</p>
            </div>
            <button
              onClick={() => navigate('/saved')}
              className="text-[10px] text-primary font-semibold"
            >
              View all
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[1, 2, 3, 4].map((i) => (
              <button
                key={i}
                onClick={() => navigate('/saved')}
                className="shrink-0 w-[100px] bg-card border border-border rounded-xl overflow-hidden active:scale-[0.97] transition-transform"
              >
                <div className="aspect-square bg-gradient-to-br from-muted to-card flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground/30" />
                </div>
                <div className="p-1.5">
                  <p className="text-[9px] text-muted-foreground truncate">Saved item {i}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-5 z-50">
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="mb-2 flex flex-col gap-1.5"
          >
            <Button
              onClick={() => { setFabOpen(false); navigate('/tryon'); }}
              className="h-10 rounded-xl bg-card border border-border text-foreground text-[11px] font-semibold shadow-lg hover:bg-card/80 px-4"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" /> New Try-On
            </Button>
            <Button
              onClick={() => { setFabOpen(false); navigate('/community'); }}
              className="h-10 rounded-xl bg-card border border-border text-foreground text-[11px] font-semibold shadow-lg hover:bg-card/80 px-4"
            >
              <Heart className="mr-1.5 h-3.5 w-3.5 text-primary" /> Post to Fit Check
            </Button>
          </motion.div>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className="h-12 w-12 rounded-full gradient-drip shadow-lg flex items-center justify-center active:scale-[0.93] transition-transform glow-primary"
        >
          <Plus className={`h-5 w-5 text-primary-foreground transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default AuthenticatedHome;
