import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Crown, Check, Sparkles, Ruler, Shirt, MessageSquare, Store, Shield, Zap } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import PremiumBadge from '@/components/monetization/PremiumBadge';

const PLANS = [
  { key: 'monthly' as const, label: 'Monthly', price: '$4.99', period: '/mo', badge: '', total: 'Billed $4.99/month', trial: '7-day free trial' },
  { key: 'annual' as const, label: 'Annual', price: '$2.99', period: '/mo', badge: 'Best Value', total: 'Billed $35.88/year (save 40%)', trial: '7-day free trial' },
];

const FEATURES = [
  { icon: Store, title: 'Expanded Retailer Coverage', description: '50+ retailers & niche brands + custom size chart uploads', free: 'Top 10 retailers' },
  { icon: Ruler, title: 'Advanced Calibration', description: 'Fit uncertainty breakdown, extra calibration options, more categories', free: 'Standard confidence score' },
  { icon: Zap, title: 'Brand Fit Memory', description: '"Zara runs small for you" — learns from your feedback over time', free: '—' },
  { icon: Shield, title: 'Return Risk Alerts', description: 'Warnings when you\'re between sizes or low confidence', free: '—' },
  { icon: Shirt, title: 'Try-On Pro', description: 'Multi-angle outputs, compare mode, saved outfits library', free: 'Standard preview' },
  { icon: MessageSquare, title: 'Fit Check Pro', description: 'Priority feedback from similar fits, top reviewer highlights', free: 'Basic votes' },
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
        <div className="text-center mb-5">
          <div className="h-14 w-14 rounded-2xl gradient-drip flex items-center justify-center mx-auto mb-3 glow-primary">
            <Crown className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-1">Upgrade Your Confidence</h1>
          <p className="text-[12px] text-muted-foreground max-w-[260px] mx-auto">
            Get smarter sizing, fewer returns, and a better shopping experience.
          </p>
        </div>

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

        {/* Clear plan terms */}
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

        {/* Features */}
        <div className="space-y-2">
          <p className="section-label">What you get</p>
          {FEATURES.map(f => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-3 flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[12px] font-bold text-foreground">{f.title}</p>
                  <PremiumBadge className="scale-[0.85] origin-left" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{f.description}</p>
                {f.free !== '—' && (
                  <p className="text-[9px] text-muted-foreground/60 mt-1">Free: {f.free}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Trust footer */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" /> Your core results stay free — always
          </p>
          <p className="text-[9px] text-muted-foreground/50">
            Premium adds confidence, not paywalls.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Premium;
