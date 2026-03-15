import { useState, useEffect } from 'react';
import BottomTabBar from '@/components/BottomTabBar';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Sparkles, Ruler, Shirt, MessageSquare, Store, Shield, Zap, BarChart3, Eye, Star, Ban, Loader2, Quote } from 'lucide-react';
import InlineCrown from '@/components/ui/InlineCrown';
import BrandLogo from '@/components/ui/BrandLogo';
import { trackEvent } from '@/lib/analytics';
import { useToast } from '@/hooks/use-toast';
import PremiumBadge from '@/components/monetization/PremiumBadge';
import { motion } from 'framer-motion';
import { useAuth, STRIPE_TIERS } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const PLANS = [
  { key: 'annual' as const, label: 'Annual', price: '$4.17', period: '/mo', badge: 'Best Value', total: 'Billed $49.99/year (save 48%)', trial: '7-day free trial' },
  { key: 'monthly' as const, label: 'Monthly', price: '$7.99', period: '/mo', badge: '', total: 'Billed $7.99/month', trial: '7-day free trial' },
];

const FEATURES = [
  { icon: Sparkles, title: 'Unlimited AI Try-Ons', description: 'No monthly cap on virtual try-ons', free: '3/month', premium: 'Unlimited' },
  { icon: Zap, title: 'Priority Generation Queue', description: 'Skip the line — your try-ons render first', free: 'Standard', premium: 'Priority' },
  { icon: Eye, title: 'Side-by-Side Comparison', description: 'Compare 2 looks on your body at once', free: '—', premium: '✓' },
  { icon: Store, title: 'Multi-Retailer Size Sync', description: 'Sync your size across 50+ retailers automatically', free: 'Top 10', premium: '50+' },
  { icon: BarChart3, title: 'Advanced Fit Analytics', description: 'Trend history, fit score over time, body change tracking', free: '—', premium: '✓' },
  { icon: Ban, title: 'Ad-Free Experience', description: 'No ads or sponsored content — ever', free: 'Ads shown', premium: 'Ad-free' },
  { icon: Star, title: 'Early Access', description: 'Be first to try new features before everyone else', free: '—', premium: '✓' },
  { icon: Star, title: 'Premium Crown Badge', description: 'Gold crown on your profile — flex your status', free: '—', premium: '✓' },
];

const Premium = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { user, isSubscribed, subscriptionEnd, checkSubscription } = useAuth();
  const [showWinback, setShowWinback] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [testimonials, setTestimonials] = useState<{ quote_text: string; attribution: string; star_rating: number }[]>([]);

  // Fetch member count and testimonials
  useEffect(() => {
    const fetchSocialProof = async () => {
      const [testimonialsRes] = await Promise.all([
        supabase.from('premium_testimonials').select('quote_text, attribution, star_rating').eq('is_active', true).limit(3),
      ]);
      if (testimonialsRes.data) setTestimonials(testimonialsRes.data);
      const { count } = await supabase
        .from('user_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('current_period_end', new Date().toISOString());
      if (count !== null) setMemberCount(count);
    };
    fetchSocialProof();
  }, []);

  // Check for success/cancel query params
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: '🎉 Welcome to Premium!', description: 'Your subscription is active. Enjoy unlimited features!' });
      checkSubscription();
    }
    if (searchParams.get('canceled') === 'true') {
      toast({ title: 'Checkout canceled', description: 'No worries — you can upgrade anytime.' });
    }
  }, [searchParams]);

  const handleBack = () => {
    const hasHistory = typeof window !== 'undefined' && (window.history.state?.idx ?? 0) > 0;
    if (hasHistory) navigate(-1);
    else navigate('/');
  };

  const handleStart = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setCheckoutLoading(true);
    trackEvent('premium_started', { plan: selectedPlan });

    try {
      const priceId = STRIPE_TIERS[selectedPlan].price_id;
      const { data: resp, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });
      if (error) throw error;
      const payload = resp?.data ?? resp;
      if (payload?.url) {
        window.location.href = payload.url;
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Could not start checkout', variant: 'destructive' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManage = () => {
    setShowWinback(true);
  };

  const goToPortal = async (action?: 'pause') => {
    setPortalLoading(true);
    try {
      const body = action ? { action } : undefined;
      const { data: resp, error } = await supabase.functions.invoke('customer-portal', { body });
      if (error) throw error;
      const payload = resp?.data ?? resp;
      if (payload?.url) {
        window.location.href = payload.url;
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Could not open subscription management', variant: 'destructive' });
    } finally {
      setPortalLoading(false);
      setShowWinback(false);
    }
  };

  const currentPlan = PLANS.find(p => p.key === selectedPlan)!;

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-safe-tab">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 rounded-lg" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <PremiumBadge label="DRIPFIT ✔ Premium" />
        </div>

        {/* Hero */}
        <motion.div
          className="text-center mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <BrandLogo size="lg" iconOnly className="mx-auto mb-3" />
          {isSubscribed ? (
            <>
              <h1 className="text-xl font-bold text-foreground mb-1">You're Premium 👑</h1>
              <p className="text-[12px] text-muted-foreground max-w-[260px] mx-auto">
                {subscriptionEnd ? `Active until ${new Date(subscriptionEnd).toLocaleDateString()}` : 'Your premium subscription is active'}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground mb-1">Unlock Your Full Potential</h1>
              <p className="text-[12px] text-muted-foreground max-w-[260px] mx-auto">
                Unlimited try-ons, smarter sizing, zero ads — the ultimate fit experience.
              </p>
              {/* Member count badge */}
              {memberCount !== null && memberCount >= 10 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-card border border-primary/20"
                >
                  <InlineCrown size={10} />
                  <span className="text-[10px] font-bold text-primary">
                    {memberCount >= 1000
                      ? `${Math.floor(memberCount / 1000).toLocaleString()},000+ premium members`
                      : memberCount >= 100
                        ? `${Math.floor(memberCount / 100) * 100}+ premium members`
                        : `${memberCount} premium members`}
                  </span>
                </motion.div>
              )}
            </>
          )}
        </motion.div>

        {isSubscribed ? (
          <Button className="w-full h-12 rounded-xl text-sm font-bold mb-5" variant="outline" onClick={handleManage}>
            Manage Subscription
          </Button>
        ) : (
          <>
            {!user && (
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl text-sm font-bold mb-3"
                onClick={() => navigate('/auth')}
              >
                Sign in to continue
              </Button>
            )}
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
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full btn-gold-3d text-primary-foreground whitespace-nowrap">
                      {p.badge}
                    </span>
                  )}
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{p.label}</p>
                  <p className="text-[20px] font-bold text-foreground mt-0.5">{p.price}<span className="text-[11px] text-muted-foreground font-normal">{p.period}</span></p>
                  {p.total && <p className="text-[11px] text-muted-foreground">{p.total}</p>}
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
            <Button
              className="w-full h-12 rounded-xl btn-luxury text-primary-foreground text-sm font-bold mb-2"
              onClick={handleStart}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {checkoutLoading ? 'Opening checkout…' : 'Start 7-Day Free Trial'}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center mb-5">No charge until trial ends · Cancel anytime</p>
          </>
        )}

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
              <div className="h-7 w-7 badge-gold-3d shrink-0 flex items-center justify-center">
                <f.icon className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-foreground leading-tight">{f.title}</p>
                <p className="text-[11px] text-muted-foreground">{f.description}</p>
              </div>
              <span className="w-16 text-center text-[10px] text-muted-foreground shrink-0">{f.free}</span>
              <span className="w-16 text-center text-[10px] font-bold text-primary shrink-0">{f.premium}</span>
            </motion.div>
          ))}
        </div>

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="section-label px-1 mb-2">WHAT PREMIUM MEMBERS SAY</p>
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i + 0.4, duration: 0.3 }}
                className="bg-card border border-border rounded-xl p-3 relative"
              >
                <Quote className="absolute top-2 left-2.5 h-5 w-5 text-primary/20" />
                <p className="text-[11px] text-foreground italic pl-5 leading-relaxed">{t.quote_text}</p>
                <div className="mt-1.5 pl-5 flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.star_rating }).map((_, s) => (
                      <Star key={s} className="h-2.5 w-2.5 text-primary fill-primary" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-primary">{t.attribution}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Trust footer */}
        <div className="mt-6 text-center space-y-1 pb-4">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" /> Your core results stay free — always
          </p>
          <p className="text-[11px] text-muted-foreground/50">
            Premium adds confidence, not paywalls. Terms apply.
          </p>
        </div>
      </div>

      {/* Win-back intercept sheet */}
      <Sheet open={showWinback} onOpenChange={setShowWinback}>
        <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-5">
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="text-[17px] font-bold text-foreground">Before you go…</SheetTitle>
          </SheetHeader>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
            Pause your subscription for 30 days instead of cancelling — you keep all your data and Premium features during the pause.
          </p>
          <div className="space-y-2">
            <Button
              className="w-full h-11 rounded-xl btn-luxury text-primary-foreground font-bold"
              onClick={() => goToPortal('pause')}
              disabled={portalLoading}
            >
              {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Pause Instead
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl font-semibold"
              onClick={() => goToPortal()}
              disabled={portalLoading}
            >
              {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continue to Portal
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <BottomTabBar />
    </div>
  );
};

export default Premium;
