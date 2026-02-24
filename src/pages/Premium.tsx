import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown, Check, Sparkles, Ruler, Shirt, MessageSquare, Store, Shield, Zap, BarChart3, Eye, Star, Ban } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import PremiumBadge from '@/components/monetization/PremiumBadge';
import { motion } from 'framer-motion';

const PLANS = [
  { key: 'monthly' as const, label: 'Monthly', price: '$7.99', period: '/mo', badge: '', total: 'Billed $7.99/month', trial: '7-day free trial' },
  { key: 'annual' as const, label: 'Annual', price: '$4.17', period: '/mo', badge: 'Best Value', total: 'Billed $49.99/year (save 48%)', trial: '7-day free trial' },
];

const FEATURES = [
  { icon: Sparkles, title: 'Unlimited AI Try-Ons', description: 'No monthly cap on virtual try-ons', free: '3/month', premium: 'Unlimited' },
  { icon: Zap, title: 'Priority Generation Queue', description: 'Skip the line — your try-ons render first', free: 'Standard', premium: 'Priority' },
  { icon: Eye, title: 'Side-by-Side Comparison', description: 'Compare 2 looks on your body at once', free: '—', premium: '✓' },
  { icon: Store, title: 'Multi-Retailer Size Sync', description: 'Sync your size across 50+ retailers automatically', free: 'Top 10', premium: '50+' },
  { icon: BarChart3, title: 'Advanced Fit Analytics', description: 'Trend history, fit score over time, body change tracking', free: '—', premium: '✓' },
  { icon: Ban, title: 'Ad-Free Experience', description: 'No ads or sponsored content — ever', free: 'Ads shown', premium: 'Ad-free' },
  { icon: Star, title: 'Early Access', description: 'Be first to try new features before everyone else', free: '—', premium: '✓' },
  { icon: Crown, title: 'Premium Crown Badge', description: 'Gold crown on your profile — flex your status', free: '—', premium: '✓' },
];

const Premium = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  const handleStart = () => {
    trackEvent('premium_started', { plan: selectedPlan });
    toast({ title: 'Coming soon', description: 'Premium subscriptions launch soon — you\'ll be first to know!' });
  };

  const currentPlan = PLANS.find(p => p.key === selectedPlan)!;

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-8">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PremiumBadge label="DRIP FIT Premium" />
        </div>

        {/* Hero */}
        <motion.div
          className="text-center mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="h-16 w-16 rounded-2xl gradient-drip flex items-center justify-center mx-auto mb-3 glow-primary">
            <Crown className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">Unlock Your Full Potential</h1>
          <p className="text-[12px] text-muted-foreground max-w-[260px] mx-auto">
            Unlimited try-ons, smarter sizing, zero ads — the ultimate fit experience.
          </p>
        </motion.div>

        {/* Plan selector */}
        <div className="flex gap-2 mb-3">
          {PLANS.map(p => (
            <button
              key={p.key}
              onClick={() => setSelectedPlan(p.key)}
              className={`flex-1 relative rounded-xl border-2 p-3 transition-all active:scale-[0.97] ${
                selectedPlan === p.key
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              {p.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full gradient-drip text-primary-foreground whitespace-nowrap">
                  {p.badge}
                </span>
              )}
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{p.label}</p>
              <p className="text-[20px] font-bold text-foreground mt-0.5">{p.price}<span className="text-[11px] text-muted-foreground font-normal">{p.period}</span></p>
              {p.total && <p className="text-[9px] text-muted-foreground">{p.total}</p>}
            </button>
          ))}
        </div>

        {/* Plan terms */}
        <div className="bg-card border border-border rounded-xl p-3 mb-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary" />
            <span className="text-[11px] text-foreground">{currentPlan.trial} included</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary" />
            <span className="text-[11px] text-foreground">{currentPlan.total}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-primary" />
            <span className="text-[11px] text-foreground">Cancel anytime — no questions asked</span>
          </div>
        </div>

        {/* CTA */}
        <Button className="w-full h-12 rounded-xl btn-luxury text-primary-foreground text-sm font-bold mb-2" onClick={handleStart}>
          <Sparkles className="mr-2 h-4 w-4" /> Start 7-Day Free Trial
        </Button>
        <p className="text-[9px] text-muted-foreground text-center mb-5">No charge until trial ends · Cancel anytime</p>

        {/* Feature comparison */}
        <div className="space-y-1.5">
          <div className="flex items-center px-1 mb-1">
            <p className="section-label flex-1">Feature</p>
            <p className="section-label w-16 text-center">Free</p>
            <p className="section-label w-16 text-center text-primary">Premium</p>
          </div>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2"
            >
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-foreground leading-tight">{f.title}</p>
                <p className="text-[9px] text-muted-foreground">{f.description}</p>
              </div>
              <span className="w-16 text-center text-[10px] text-muted-foreground shrink-0">{f.free}</span>
              <span className="w-16 text-center text-[10px] font-bold text-primary shrink-0">{f.premium}</span>
            </motion.div>
          ))}
        </div>

        {/* Trust footer */}
        <div className="mt-6 text-center space-y-1 pb-4">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" /> Your core results stay free — always
          </p>
          <p className="text-[9px] text-muted-foreground/50">
            Premium adds confidence, not paywalls. Terms apply.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Premium;
