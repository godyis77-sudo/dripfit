import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Crown, Scan, Shirt, Users, CheckCircle2, ChevronUp, Sparkles, ArrowRight, Mail, Shield, Zap, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import DecorativeSilhouette from '@/components/ui/DecorativeSilhouette';
import BrandMarquee from '@/components/waitlist/BrandMarquee';

/* ─── Data ─── */

const FEATURES = [
  {
    icon: Scan,
    title: 'AI Body Scan',
    desc: 'Two photos. 60 seconds. Your exact measurements mapped to 200+ brand size charts.',
    badge: 'Core',
  },
  {
    icon: Shirt,
    title: 'Virtual Try-On',
    desc: 'See yourself in it before you buy it. Upload any clothing item and let AI put it on your body.',
    badge: 'AI',
  },
  {
    icon: Users,
    title: 'Style Check',
    desc: 'Real opinions from people built like you. Get outfit feedback from users with your exact measurements.',
    badge: 'Social',
  },
];

const CHECKLIST = [
  { text: 'Your exact measurements for Zara, ASOS, SHEIN, H&M and 4 more.', icon: Sparkles },
  { text: 'The 3-question checklist before every online order.', icon: Shield },
  { text: 'How to never pay return shipping again.', icon: Zap },
];

const STATS = [
  { stat: '73%', label: 'of returns are sizing issues' },
  { stat: '$550', label: 'wasted per shopper yearly' },
  { stat: '300+', label: 'brand size charts' },
];

/* ─── Animation helpers ─── */
const ease = [0.16, 1, 0.3, 1] as const;

function FadeUp({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Email Capture ─── */
function EmailCapture({ id, compact = false }: { id: string; compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || !email.includes('.')) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('waitlist_signups' as any)
        .insert([{ email: email.toLowerCase().trim(), source: id }] as any);

      if (error) {
        if (error.code === '23505') {
          toast({ title: '✔ Already on the list!', description: "You're already signed up. We'll be in touch." });
          setSubmitted(true);
          return;
        }
        throw error;
      }

      setSubmitted(true);
      setEmail('');
      toast({ title: '✔ Guide sent!', description: "You're on the waitlist. Check your inbox." });
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease }}
        className="flex items-center gap-3 justify-center py-5 px-5 rounded-2xl bg-primary/10 border border-primary/25"
      >
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-foreground">You're on the list!</p>
          <p className="text-[12px] text-foreground/70">Check your inbox for the free guide.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md" id={id}>
      <div className={`flex ${compact ? 'flex-row' : 'flex-col sm:flex-row'} gap-2.5`}>
        <div className="relative flex-1">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="email"
            required
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-12 pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground rounded-xl focus-visible:ring-primary/50 focus-visible:border-primary/40 transition-all"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 px-6 rounded-xl font-bold text-[12px] tracking-wider uppercase whitespace-nowrap shrink-0 relative overflow-hidden"
          style={{
            boxShadow: '0 0 28px -4px hsl(42 76% 42% / 0.35), 0 0 80px -12px hsl(42 76% 42% / 0.12)',
          }}
        >
          {loading ? (
            <motion.div
              className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <>Send Me the Guide <ArrowRight className="h-3.5 w-3.5 ml-1" /></>
          )}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-3 tracking-wide">
        No spam. Just the guide + occasional DripFit updates.
      </p>
    </form>
  );
}

/* ─── Floating particles ─── */
function GoldParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/30"
          style={{
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.4,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
const Waitlist = () => {
  usePageTitle('Get Your Free Size Guide');
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const handler = () => setShowTop(window.scrollY > 500);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 h-14 flex items-center justify-between px-5 sm:px-8 backdrop-blur-2xl bg-background/80 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <Crown className="h-4 w-4 text-primary shimmer-icon" />
          <span className="font-display text-[15px] tracking-[3px] text-foreground font-semibold">
            DRIPFIT <span className="text-primary">✔</span>
          </span>
        </div>
        <Link
          to="/auth"
          className="text-[10px] font-bold text-foreground/70 uppercase tracking-[0.2em] hover:text-primary transition-colors border border-border rounded-full px-4 py-1.5 hover:border-primary/40"
        >
          Sign In
        </Link>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-14 sm:pt-20 pb-16 px-5 sm:px-8 flex flex-col items-center text-center overflow-hidden">
        <GoldParticles />

        {/* Multi-layered ambient glow */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[180px] pointer-events-none bg-primary/[0.07]" />
        <div className="absolute top-[100px] right-[-200px] w-[400px] h-[400px] rounded-full blur-[140px] pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(280 40% 35% / 0.04), transparent)' }} />

        {/* Eyebrow badge */}
        <FadeUp className="relative z-10 mb-6">
          <motion.div
            className="inline-flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-full px-4 py-1.5"
            animate={{ boxShadow: ['0 0 0 0 hsl(42 76% 42% / 0)', '0 0 20px 2px hsl(42 76% 42% / 0.1)', '0 0 0 0 hsl(42 76% 42% / 0)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[11px] font-bold text-primary uppercase tracking-[0.2em]">Free Size Guide</span>
          </motion.div>
        </FadeUp>

        {/* Headline */}
        <FadeUp delay={0.05} className="relative z-10 max-w-2xl mx-auto">
          <h1 className="font-display text-[36px] sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.06] text-foreground mb-5">
            Stop Ordering{' '}
            <span className="relative">
              <span className="gradient-drip-text">the Wrong</span>
            </span>
            <br />Size.
          </h1>
        </FadeUp>

        {/* Subheadline */}
        <FadeUp delay={0.1} className="relative z-10 max-w-md mx-auto mb-10">
          <p className="text-foreground/70 text-[15px] sm:text-base leading-relaxed">
            The exact measurements you need to order correctly from <span className="text-foreground font-semibold">70+ brands</span> verified across <span className="text-foreground font-semibold">300 unique size charts</span> — plus the app that does it automatically.
          </p>
        </FadeUp>

        {/* Email form */}
        <FadeUp delay={0.18} className="relative z-10 w-full flex flex-col items-center mb-12">
          <EmailCapture id="hero" />
        </FadeUp>

        {/* Phone mockup with scan results */}
        <FadeUp delay={0.3} className="relative z-10">
          <div className="relative">
            {/* Glow behind phone */}
            <div className="absolute inset-0 blur-[60px] bg-primary/10 rounded-full scale-125 pointer-events-none" />
            <DecorativeSilhouette height={380} className="relative z-10" />
          </div>
        </FadeUp>

        {/* Scroll indicator */}
        <FadeUp delay={0.5} className="relative z-10 mt-8">
          <motion.div
            className="flex flex-col items-center gap-2 text-muted-foreground"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-[9px] uppercase tracking-[0.3em]">Scroll</span>
            <div className="w-px h-6 bg-gradient-to-b from-muted-foreground/40 to-transparent" />
          </motion.div>
        </FadeUp>
      </section>

      {/* ─── LEAD MAGNET ─── */}
      <section className="py-20 px-5 sm:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-lg mx-auto relative z-10">
          <FadeUp>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/30" />
              <span className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">Instant Download</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/30" />
            </div>
            <h2 className="font-display text-[22px] sm:text-3xl font-bold text-foreground mb-2 leading-tight text-center">
              Get The Complete Online Shopping Size Guide
            </h2>
            <p className="text-[14px] text-foreground/60 text-center mb-8">
              Join the waitlist and get this guide sent to your inbox instantly.
            </p>
          </FadeUp>

          <div className="space-y-3">
            {CHECKLIST.map((item, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="flex gap-4 items-start bg-secondary border border-border rounded-2xl p-4 group hover:border-primary/30 transition-colors">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-[13px] text-foreground/80 leading-relaxed pt-1.5">{item.text}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SEPARATOR ─── */}
      <div className="max-w-xs mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* ─── 3 CORE FEATURES ─── */}
      <section className="py-20 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <FadeUp className="text-center mb-14">
            <span className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">Coming Soon</span>
            <h2 className="font-display text-[22px] sm:text-3xl font-bold text-foreground leading-tight mt-3">
              The App That <span className="gradient-drip-text">Ends Returns</span>
            </h2>
            <p className="text-[14px] text-foreground/60 mt-3 max-w-md mx-auto">
              Three powerful features working together to make sure every order fits perfectly.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.1}>
                <div className="relative bg-secondary border border-border rounded-2xl p-6 h-full flex flex-col group hover:border-primary/30 transition-all">
                  {/* Badge */}
                  <span className="absolute top-4 right-4 text-[9px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5">
                    {f.badge}
                  </span>

                  <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-[13px] text-foreground/65 leading-relaxed flex-1">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF / AGITATION ─── */}
      <section className="py-20 px-5 sm:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/50 to-transparent pointer-events-none" />

        <div className="max-w-xl mx-auto text-center relative z-10">
          <FadeUp>
            <h2 className="font-display text-[22px] sm:text-3xl font-bold text-foreground mb-3 leading-tight">
              The average shopper wastes hundreds on return shipping.
            </h2>
            <p className="font-display text-xl sm:text-2xl font-bold gradient-drip-text">
              Don't be average.
            </p>
          </FadeUp>

          {/* Brand marquee */}
          <FadeUp delay={0.12}>
            <BrandMarquee />
          </FadeUp>

          {/* Stats */}
          <FadeUp delay={0.2} className="mt-14 grid grid-cols-3 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="text-center bg-secondary border border-border rounded-2xl py-5 px-3">
                <p className="font-display text-[22px] sm:text-2xl font-bold gradient-drip-text leading-none">{s.stat}</p>
                <p className="text-[10px] text-foreground/50 mt-2 uppercase tracking-[0.1em] leading-tight">{s.label}</p>
              </div>
            ))}
          </FadeUp>
        </div>
      </section>

      {/* ─── TESTIMONIAL STRIP ─── */}
      <section className="py-12 px-5 sm:px-8">
        <div className="max-w-lg mx-auto">
          <FadeUp>
            <div className="bg-secondary border border-border rounded-2xl p-5 text-center">
              <div className="flex justify-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-[13px] text-foreground/75 leading-relaxed italic mb-3">
                "I used to return 3 out of every 5 orders. After using DripFit, I haven't had a single return in 4 months."
              </p>
              <p className="text-[11px] text-foreground/45 uppercase tracking-[0.2em]">— Early Beta Tester</p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ─── FOOTER CTA ─── */}
      <section className="py-20 px-5 sm:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-secondary/40 to-transparent pointer-events-none" />
        <div className="max-w-lg mx-auto text-center relative z-10">
          <FadeUp>
            <h2 className="font-display text-[22px] sm:text-3xl font-bold text-foreground mb-2 leading-tight">
              Your exact size. Every brand.
            </h2>
            <p className="font-display text-xl font-bold gradient-drip-text mb-8">Finally.</p>
          </FadeUp>

          <FadeUp delay={0.1} className="flex flex-col items-center">
            <EmailCapture id="footer" compact />
          </FadeUp>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-5 sm:px-8 border-t border-border/50">
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Crown className="h-3 w-3 text-primary/60" />
            <span className="text-[10px] text-foreground/40 tracking-[2px] font-semibold">DRIPFIT ✔</span>
          </div>
          <div className="flex items-center gap-6 text-[11px] text-foreground/40">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <a href="mailto:hello@dripfit.app" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* ─── Scroll to top ─── */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-4 z-40 h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center shadow-luxury active:scale-95 transition-transform"
            aria-label="Scroll to top"
          >
            <ChevronUp className="h-4 w-4 text-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Waitlist;
