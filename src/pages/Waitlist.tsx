import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Crown, Scan, Shirt, Users, CheckCircle2, ArrowRight, Shield, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Link } from 'react-router-dom';

const BRANDS = ['ZARA', 'H&M', 'ASOS', 'SHEIN', 'COS', 'UNIQLO', 'Nike', 'Mango'];

const FEATURES = [
  {
    icon: Scan,
    title: 'AI Body Scan.',
    desc: 'Two photos. 60 seconds. Your exact measurements mapped to 200+ brand size charts.',
  },
  {
    icon: Shirt,
    title: 'Virtual Try-On.',
    desc: 'See yourself in it before you buy it. Upload any clothing item and let AI put it on your body.',
  },
  {
    icon: Users,
    title: 'Style Check Community.',
    desc: 'Real opinions from people built like you. Get outfit feedback from users with your exact measurements.',
  },
];

const CHECKLIST = [
  'Your exact measurements for Zara, ASOS, SHEIN, H&M and 4 more.',
  'The 3-question checklist before every online order.',
  'How to never pay return shipping again.',
];

const ease = [0.16, 1, 0.3, 1] as const;

function FadeUp({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function EmailCapture({ id }: { id: string }) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setSubmitted(true);
    setEmail('');
    toast({ title: '✔ Guide sent!', description: "You're on the waitlist." });
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-3 justify-center py-4"
      >
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <p className="text-sm font-semibold text-foreground">You're on the list. Check your inbox.</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-md" id={id}>
      <Input
        type="email"
        required
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 h-12 bg-[hsl(220_12%_7%)] border-[hsl(220_6%_18%)] text-foreground placeholder:text-muted-foreground/50 rounded-xl focus-visible:ring-primary/50"
      />
      <Button
        type="submit"
        className="h-12 px-5 rounded-xl font-bold text-xs tracking-wider uppercase whitespace-nowrap shrink-0 relative overflow-hidden"
        style={{
          boxShadow: '0 0 24px -4px hsl(42 76% 42% / 0.35), 0 0 60px -8px hsl(42 76% 42% / 0.15)',
        }}
      >
        Send Me the Free Guide
      </Button>
    </form>
  );
}

const Waitlist = () => {
  usePageTitle('Waitlist');
  const [showTop, setShowTop] = useState(false);

  return (
    <div
      className="min-h-screen bg-background text-foreground overflow-x-hidden"
      onScroll={() => {}}
      ref={(el) => {
        if (!el) return;
        const handler = () => setShowTop(window.scrollY > 500);
        window.addEventListener('scroll', handler, { passive: true });
      }}
    >
      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 h-14 flex items-center justify-between px-6 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <span className="font-display text-base tracking-[3px] text-foreground">
            DRIPFIT <span className="text-primary">✔</span>
          </span>
        </div>
        <Link to="/auth" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors">
          Sign In
        </Link>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-16 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[160px] pointer-events-none bg-primary/[0.06]" />

        <FadeUp className="relative z-10 max-w-2xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-foreground mb-5">
            Stop Ordering<br />the Wrong Size.
          </h1>
        </FadeUp>

        <FadeUp delay={0.1} className="relative z-10 max-w-lg mx-auto mb-10">
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            The exact measurements you need to order correctly from 8 major brands — plus the app that does it automatically.
          </p>
        </FadeUp>

        <FadeUp delay={0.2} className="relative z-10 w-full flex flex-col items-center gap-3 mb-6">
          <EmailCapture id="hero-email" />
          <p className="text-[11px] text-muted-foreground/50 tracking-wide">
            No spam. Just the guide plus occasional DripFit updates.
          </p>
        </FadeUp>

        {/* Phone mockup placeholder */}
        <FadeUp delay={0.35} className="relative z-10 mt-6">
          <div
            className="w-[220px] h-[440px] rounded-[2.5rem] border-2 border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden flex items-center justify-center"
            style={{
              boxShadow: '0 30px 80px -20px hsl(42 76% 42% / 0.12), inset 0 0 60px -30px hsl(42 76% 42% / 0.06)',
            }}
          >
            <div className="relative w-24 h-40 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center">
              <motion.div
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'linear-gradient(180deg, hsl(42 76% 42% / 0.15) 0%, transparent 100%)',
                }}
                animate={{ y: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
              />
              <Scan className="h-8 w-8 text-primary/40" />
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ─── LEAD MAGNET ─── */}
      <section className="py-20 px-6">
        <div className="max-w-xl mx-auto">
          <FadeUp>
            <p className="text-[11px] font-bold text-primary uppercase tracking-[0.25em] mb-3">Instant Download</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-8 leading-tight">
              Get The Complete Online Shopping Size Guide instantly.
            </h2>
          </FadeUp>

          <div className="space-y-4">
            {CHECKLIST.map((item, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="flex gap-3.5 items-start bg-card/50 border border-border/30 rounded-2xl p-4 backdrop-blur-sm">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground/90 leading-relaxed">{item}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3 CORE FEATURES ─── */}
      <section className="py-20 px-6 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <FadeUp className="text-center mb-12">
            <p className="text-[11px] font-bold text-primary uppercase tracking-[0.25em] mb-3">Coming Soon</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-tight">
              The App That Ends Returns.
            </h2>
          </FadeUp>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={i * 0.12}>
                <div className="bg-card/60 border border-border/30 rounded-2xl p-6 backdrop-blur-sm h-full flex flex-col">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF / AGITATION ─── */}
      <section className="py-20 px-6">
        <div className="max-w-xl mx-auto text-center">
          <FadeUp>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4 leading-tight">
              The average shopper wastes hundreds on return shipping.{' '}
              <span className="gradient-drip-text">Don't be average.</span>
            </h2>
          </FadeUp>

          {/* Brand ticker */}
          <FadeUp delay={0.15} className="mt-10 overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10" />
            <motion.div
              className="flex gap-10 whitespace-nowrap"
              animate={{ x: ['0%', '-50%'] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              {[...BRANDS, ...BRANDS].map((b, i) => (
                <span key={`${b}-${i}`} className="text-lg font-bold text-muted-foreground/30 uppercase tracking-[0.2em] select-none">
                  {b}
                </span>
              ))}
            </motion.div>
          </FadeUp>

          {/* Stats row */}
          <FadeUp delay={0.25} className="mt-12 grid grid-cols-3 gap-4">
            {[
              { stat: '73%', label: 'of returns are sizing issues' },
              { stat: '$550', label: 'avg. wasted per shopper per year' },
              { stat: '200+', label: 'brand charts supported' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-2xl font-bold gradient-drip-text">{s.stat}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-[0.1em] leading-tight">{s.label}</p>
              </div>
            ))}
          </FadeUp>
        </div>
      </section>

      {/* ─── FOOTER CTA ─── */}
      <section className="py-20 px-6 bg-card/30 border-t border-border/20">
        <div className="max-w-xl mx-auto text-center">
          <FadeUp>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-tight">
              Your exact size. Every brand. <span className="gradient-drip-text">Finally.</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              Join the waitlist and get the free size guide today.
            </p>
          </FadeUp>

          <FadeUp delay={0.1} className="flex flex-col items-center gap-3">
            <EmailCapture id="footer-email" />
          </FadeUp>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 px-6 border-t border-border/20">
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 text-primary/60" />
            <span className="text-xs text-muted-foreground/50 tracking-[2px]">DRIPFIT ✔</span>
          </div>
          <div className="flex items-center gap-5 text-[11px] text-muted-foreground/40">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <a href="mailto:hello@dripfit.app" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Scroll to top */}
      {showTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-4 z-40 h-10 w-10 rounded-full bg-card border border-border/40 flex items-center justify-center shadow-luxury"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-4 w-4 text-foreground" />
        </motion.button>
      )}
    </div>
  );
};

export default Waitlist;
