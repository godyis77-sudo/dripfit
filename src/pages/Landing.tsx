import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ScanLine, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BrandLogo from '@/components/ui/BrandLogo';
import LandingEmailCapture from '@/components/landing/LandingEmailCapture';

/* ── Reusable fade-in with whileInView ── */
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Data ── */
const FEATURES = [
  {
    icon: ScanLine,
    title: 'Precision Scan',
    desc: 'Map your exact dimensions in seconds. No measuring tape required.',
  },
  {
    icon: Smartphone,
    title: 'Virtual Try-On',
    desc: 'See the garments on your exact body before you buy. Zero guesswork.',
  },
  {
    icon: CheckCircle2,
    title: 'Verified Fit',
    desc: 'Filter out sizes that won\'t work. Save the heat that fits perfectly.',
  },
];

const STEPS = [
  'Seamless body mapping in 60 seconds',
  'Instantly generated AI try-ons',
  'Build your curated digital wardrobe',
];

const FAQ_DATA = [
  { q: 'How accurate is the body scan?', a: 'Our AI extracts 20+ biometric data points from two photos with sub-centimeter precision. Your measurements are cross-referenced against each brand\'s proprietary size chart.' },
  { q: 'How does virtual try-on work?', a: 'We render garments directly onto your mapped silhouette using AI. You see the actual drape, proportions, and fit on your body — not a mannequin.' },
  { q: 'What brands are available?', a: '130+ brands across 69 retailers — from Arc\'teryx and Stone Island to The Row and Totême. 7,000+ products and growing weekly.' },
  { q: 'Is my body data secure?', a: 'Your biometric data is encrypted end-to-end and never shared with retailers or third parties. You own your geometry.' },
  { q: 'Is DripFit free?', a: 'Core features including body scanning, size verification, and browsing are free. Premium features like unlimited try-ons are available with DripFit Pro.' },
];

/* ── FAQ Accordion Item ── */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      onClick={() => setOpen(!open)}
      className="cursor-pointer py-6 border-b border-border/50"
    >
      <div className="flex justify-between items-center">
        <h4 className="text-base font-medium text-foreground pr-5">{q}</h4>
        <span className={`text-xl text-muted-foreground shrink-0 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}>+</span>
      </div>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        <p className="text-sm text-muted-foreground leading-relaxed mt-3">{a}</p>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LANDING PAGE — Quiet Luxury / SSENSE Aesthetic
   ═══════════════════════════════════════════ */
export default function Landing() {
  usePageMeta({
    title: 'DripFit — Know Your Fit',
    description: 'AI-powered body mapping, virtual try-on, and verified sizing across 130+ brands. End the cycle of returns.',
    path: '/landing',
  });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-secondary">

      {/* ─── NAVIGATION ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-between items-center bg-background/60 backdrop-blur-xl border-b border-border/30">
        <BrandLogo size="sm" />
        <Link
          to="/auth"
          className="px-5 py-2 text-sm bg-foreground text-background font-medium rounded-full hover:opacity-90 transition-opacity"
        >
          Enter The Vault
        </Link>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:min-h-[90vh]">
        {/* Ambient glow */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-muted/30 blur-[160px] pointer-events-none" />

        <div className="flex-1 z-10">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 border border-border rounded-full bg-secondary/50 text-xs tracking-[0.15em] uppercase text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>The invitation is open</span>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-6 tracking-tight font-bold">
              Don't guess.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground">
                Know your fit.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.1}>
            <p className="text-muted-foreground text-lg md:text-xl max-w-md mb-10 font-light leading-relaxed">
              The AI-powered wardrobe. Map your body, try on luxury streetwear virtually, and end the cycle of returns.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <LandingEmailCapture id="hero" buttonText="Join The Waitlist" />
          </FadeIn>
        </div>

        {/* Hero visual — phone mockup placeholder */}
        <div className="flex-1 w-full max-w-md relative">
          <FadeIn delay={0.2}>
            <div className="absolute inset-0 bg-muted/20 blur-[100px] rounded-full" />
            <div className="relative aspect-[9/19] bg-secondary rounded-[3rem] border-[6px] border-border shadow-2xl overflow-hidden flex items-center justify-center">
              <p className="text-muted-foreground font-display text-sm italic">Cinematic Try-On Preview</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── THREE PILLARS ─── */}
      <section className="py-32 px-6 bg-secondary/20 border-y border-border/30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {FEATURES.map((f, i) => (
            <FadeIn delay={i * 0.1} key={f.title} className="flex flex-col items-start border-l border-border pl-6">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-6 text-foreground/70 border border-border">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-2xl mb-3 font-semibold">{f.title}</h3>
              <p className="text-muted-foreground font-light leading-relaxed">{f.desc}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── PROBLEM STATS ─── */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-5">The problem</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-6">
              Ordering three sizes.{' '}
              <span className="text-muted-foreground/50">Returning two.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto font-light leading-relaxed">
              Every brand fits different. Money locked. Drip delayed. We built the infrastructure to end it.
            </p>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="grid grid-cols-3 gap-4 mt-16">
              {[
                { stat: '$816B', label: 'Fashion returns yearly' },
                { stat: '30%', label: 'Online purchases returned' },
                { stat: '70%', label: 'Due to size or fit' },
              ].map((s) => (
                <div key={s.label} className="bg-secondary/60 border border-border/50 rounded-2xl py-8 px-4 text-center">
                  <p className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">{s.stat}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-[0.1em]">{s.label}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── THE VAULT DEMO ─── */}
      <section className="py-28 px-6 border-y border-border/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="flex-1 w-full max-w-md relative">
            <FadeIn>
              <div className="relative aspect-[4/5] bg-secondary rounded-2xl border border-border overflow-hidden flex items-center justify-center">
                <p className="text-muted-foreground font-display text-sm italic">The Swiping Closet UI</p>
              </div>
            </FadeIn>
          </div>
          <div className="flex-1">
            <FadeIn>
              <h2 className="font-display text-4xl md:text-5xl leading-tight mb-6 font-bold">
                Swipe. Try on.<br />Save the heat.
              </h2>
              <p className="text-muted-foreground text-lg mb-8 font-light leading-relaxed">
                Enter The Closet. Filter by your aesthetic — from Techwear to Quiet Luxury. Swipe right to pull items into your Vault and instantly generate photorealistic try-ons.
              </p>
              <ul className="space-y-4">
                {STEPS.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-foreground/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-28 px-6">
        <div className="max-w-2xl mx-auto">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-14">
              Everything you need to know
            </h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div>
              {FAQ_DATA.map((item, i) => (
                <FAQItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-32 px-6 border-t border-border/30 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-muted/20 blur-[120px] rounded-full -z-10" />

        <div className="max-w-3xl mx-auto text-center z-10 relative">
          <FadeIn>
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">Stop buying blind.</h2>
            <p className="text-muted-foreground text-xl mb-10 font-light">
              Join the waitlist. Gain early access to the Vault.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="flex justify-center">
              <LandingEmailCapture id="footer-cta" buttonText="Request Access" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border/30 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-5">
          <BrandLogo size="sm" className="opacity-50" />
          <p className="text-xs text-muted-foreground tracking-wide">© 2026 DripFit. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <a href="mailto:hello@dripfit.app" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
