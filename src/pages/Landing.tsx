import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import BrandLogo from '@/components/ui/BrandLogo';
import LandingEmailCapture from '@/components/landing/LandingEmailCapture';

const GOLD = '#D4AF37';
const PURPLE = '#6B21A8';

/* ── Intersection Observer hook ── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'translateY(0)' : 'translateY(40px)',
      transition: `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}s`,
    }}>{children}</div>
  );
}

function GlassCard({ children, style = {}, className = '' }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={className} style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      ...style,
    }}>{children}</div>
  );
}

/* ── Scan animation ── */
function ScanLine() {
  return (
    <div className="relative w-full h-[300px] overflow-hidden rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="absolute left-0 right-0 h-[2px] animate-scan-move" style={{
        background: 'linear-gradient(90deg, transparent, #00D4FF, transparent)',
        boxShadow: '0 0 20px #00D4FF, 0 0 60px rgba(0,212,255,0.3)',
      }} />
      <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
        <svg width="80" height="120" viewBox="0 0 80 120" fill="none">
          <ellipse cx="40" cy="20" rx="16" ry="18" stroke={GOLD} strokeWidth="1.5" opacity="0.6" />
          <path d="M12 50 Q12 35 40 35 Q68 35 68 50 L72 95 Q72 115 40 115 Q8 115 8 95 Z" stroke={GOLD} strokeWidth="1.5" fill="none" opacity="0.4" />
          <line x1="40" y1="0" x2="40" y2="120" stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="0" y1="60" x2="80" y2="60" stroke="rgba(212,175,55,0.15)" strokeWidth="0.5" strokeDasharray="3 3" />
        </svg>
        <span className="font-mono text-[11px] tracking-[0.2em] uppercase opacity-70" style={{ color: GOLD }}>BIOMETRIC SCAN ACTIVE</span>
      </div>
      <style>{`@keyframes scanMove { 0%,100%{top:10%} 50%{top:85%} } .animate-scan-move { animation: scanMove 2.5s ease-in-out infinite; }`}</style>
    </div>
  );
}

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-[36px] font-bold leading-none" style={{ color: GOLD }}>{value}</div>
      <div className="text-[12px] tracking-[0.12em] uppercase mt-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</div>
    </div>
  );
}

function FeatureCard({ icon, title, description, accent = GOLD }: { icon: React.ReactNode; title: string; description: string; accent?: string }) {
  return (
    <GlassCard style={{ padding: '36px 28px', transition: 'all 0.4s ease' }} className="hover:-translate-y-1 hover:border-primary/30">
      <div className="text-[32px] mb-5">{icon}</div>
      <h3 className="font-display text-xl font-semibold text-foreground mb-3 leading-tight">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{description}</p>
    </GlassCard>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-5 items-start">
      <div className="min-w-[48px] h-12 flex items-center justify-center rounded-full font-mono text-lg font-bold"
        style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)', color: GOLD }}>
        {number}
      </div>
      <div>
        <h4 className="text-base font-bold text-foreground mb-1.5 tracking-wide">{title}</h4>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{description}</p>
      </div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(!open)} className="cursor-pointer py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex justify-between items-center">
        <h4 className="text-base font-semibold text-foreground pr-5">{q}</h4>
        <span className="text-xl shrink-0 transition-transform duration-300" style={{ color: GOLD, transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </div>
      <div className="overflow-hidden transition-all duration-400" style={{ maxHeight: open ? '200px' : '0' }}>
        <p className="text-sm leading-relaxed mt-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{a}</p>
      </div>
    </div>
  );
}

function CopDropBar({ label, cop }: { label: string; cop: number }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
        <span className="font-mono text-[13px]" style={{ color: GOLD }}>{cop}% COP</span>
      </div>
      <div className="h-1 rounded-sm overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-sm transition-all duration-1000" style={{ width: `${cop}%`, background: `linear-gradient(90deg, ${GOLD}, #E5C349)` }} />
      </div>
    </div>
  );
}

/* ── Feature SVG icons ── */
const ScanIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" stroke={GOLD} strokeWidth="1.5" /><circle cx="16" cy="16" r="6" stroke={GOLD} strokeWidth="1.5" /><line x1="16" y1="2" x2="16" y2="30" stroke={GOLD} strokeWidth="0.5" opacity="0.3" /><line x1="2" y1="16" x2="30" y2="16" stroke={GOLD} strokeWidth="0.5" opacity="0.3" /></svg>
);
const ClosetIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="4" y="6" width="24" height="20" rx="3" stroke={GOLD} strokeWidth="1.5" fill="none" /><path d="M10 14 L16 10 L22 14 L22 22 L10 22Z" stroke={GOLD} strokeWidth="1" fill="none" opacity="0.5" /><circle cx="16" cy="18" r="3" stroke={GOLD} strokeWidth="1" fill="none" /></svg>
);
const TwinsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="11" cy="14" r="6" stroke={PURPLE} strokeWidth="1.5" fill="none" /><circle cx="21" cy="14" r="6" stroke={PURPLE} strokeWidth="1.5" fill="none" /><path d="M16 10 Q16 14 16 18" stroke={PURPLE} strokeWidth="1" opacity="0.5" /></svg>
);
const StarIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 6 L20 14 L28 14 L22 20 L24 28 L16 23 L8 28 L10 20 L4 14 L12 14Z" stroke={GOLD} strokeWidth="1.5" fill="none" /></svg>
);
const VerifyIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="6" y="4" width="20" height="24" rx="2" stroke={GOLD} strokeWidth="1.5" fill="none" /><line x1="10" y1="12" x2="22" y2="12" stroke={GOLD} strokeWidth="1" opacity="0.4" /><line x1="10" y1="17" x2="22" y2="17" stroke={GOLD} strokeWidth="1" opacity="0.4" /><line x1="10" y1="22" x2="18" y2="22" stroke={GOLD} strokeWidth="1" opacity="0.4" /><circle cx="22" cy="22" r="4" stroke={GOLD} strokeWidth="1.5" fill="none" /><polyline points="20,22 21.5,23.5 24,20.5" stroke={GOLD} strokeWidth="1.2" fill="none" /></svg>
);
const AIIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12" stroke={GOLD} strokeWidth="1.5" fill="none" /><path d="M16 4 Q28 16 16 28 Q4 16 16 4Z" stroke={GOLD} strokeWidth="0.8" fill="none" opacity="0.3" /><circle cx="16" cy="16" r="3" fill={GOLD} opacity="0.3" /></svg>
);

const FEATURES = [
  { icon: <ScanIcon />, title: 'The Biometric Scan', description: '2 photos. 60 seconds. Your exact geometry mapped with AI precision. Every measurement verified against 130 brand size charts.' },
  { icon: <ClosetIcon />, title: 'The Infinite Closet', description: '7,000+ pieces from 69 retailers. AR try-on shows the exact drape on your silhouette. No model proxies. Just you.' },
  { icon: <TwinsIcon />, title: 'Body & Style Twins', description: 'Find members who share your exact proportions or aesthetic. If it drapes on them, it drapes on you. Verified.', accent: PURPLE },
  { icon: <StarIcon />, title: 'COP / DROP Voting', description: 'The community verdict. Your Body Twins weigh in on every piece. Binary. Decisive. No ambiguity.' },
  { icon: <VerifyIcon />, title: 'Verified Sizing', description: "Your mapped size across every brand. Instantly. No more guessing between a Medium at Nike and a Large at Zara." },
  { icon: <AIIcon />, title: 'AI Style Assistant', description: 'Streaming AI that knows your measurements, your taste, and your closet. Personalized recommendations. No generic picks.' },
];

const FAQ_DATA = [
  { q: 'How accurate is the body scan?', a: 'Our AI extracts 20+ biometric data points from two photos with sub-centimeter precision. Your measurements are cross-referenced against each brand\'s proprietary size chart — not generic S/M/L ranges.' },
  { q: 'How does AR try-on work?', a: 'The Infinite Closet renders garments directly onto your mapped silhouette using augmented reality. You see the actual drape, proportions, and fit on YOUR body — not a mannequin or model approximation.' },
  { q: 'What are Body Twins?', a: 'Members who share your exact proportions — within verified measurement tolerances. When they try a piece, their fit feedback is directly applicable to you. Same body. Same drape.' },
  { q: 'Is my body data secure?', a: 'Your biometric data is encrypted end-to-end and never shared with retailers or third parties. You own your geometry. Period.' },
  { q: 'What brands are available?', a: '130+ brands across 69 retailers — from Arc\'teryx and Stone Island to The Row and Totême. 7,000+ products and growing weekly.' },
  { q: 'Is DripFit free?', a: 'Core features including body scanning, size verification, and browsing are free. Premium features like unlimited AR try-ons and advanced Twin matching are available with DripFit Pro.' },
];

/* ─── Main Page ─── */
export default function Landing() {
  usePageMeta({ title: 'DripFit — Stop Praying It Fits', description: 'AI biometric scanner maps your exact body to 7,000 pieces across 130 brands. Perfect drape. Verified before checkout.', path: '/landing' });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const section = 'max-w-[1120px] mx-auto px-6';

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrollY > 50 ? 'rgba(10,10,10,0.85)' : 'transparent',
          backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
          borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent',
        }}>
        <div className={`${section} flex items-center justify-between h-[72px]`}>
          <BrandLogo size="sm" />
          <div className="flex items-center gap-4 sm:gap-8">
            {['Features', 'How It Works'].map(t => (
              <a key={t} href={`#${t.toLowerCase().replace(/ /g, '-')}`}
                className="hidden sm:block text-[13px] tracking-[0.06em] uppercase font-medium transition-colors hover:text-foreground"
                style={{ color: 'rgba(255,255,255,0.5)' }}>{t}</a>
            ))}
            <Link to="/auth"
              className="text-[11px] font-bold uppercase tracking-[0.15em] px-5 py-2.5 rounded-md transition-all hover:-translate-y-px"
              style={{ background: GOLD, color: '#0A0A0A' }}>
              Get the Cheat Code
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-[30%] -left-[15%] w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(107,33,168,0.05) 0%, transparent 70%)' }} />

        <div className={`${section} pt-36 sm:pt-32 pb-20 relative z-10`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <FadeIn>
                <div className="font-mono text-[11px] tracking-[0.25em] uppercase mb-6 opacity-80" style={{ color: GOLD }}>
                  TECHNICAL INFRASTRUCTURE FOR FASHION CULTURE
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <h1 className="font-display text-[clamp(38px,5vw,64px)] font-extrabold leading-[1.08] mb-7 tracking-tight">
                  Stop Praying<br /><span style={{ color: GOLD }}>It Fits.</span>
                </h1>
              </FadeIn>

              <FadeIn delay={0.2}>
                <p className="text-[17px] leading-relaxed max-w-[440px] mb-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  AI biometric scanner maps your exact body to 7,000 pieces across 130 brands.
                  Perfect drape. Verified before checkout.
                </p>
              </FadeIn>

              <FadeIn delay={0.3}>
                <LandingEmailCapture id="hero" buttonText="Map Your Body" />
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="flex gap-10 mt-14 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <StatBadge value="7K+" label="Products" />
                  <StatBadge value="130" label="Brands" />
                  <StatBadge value="69" label="Retailers" />
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.2} className="hidden lg:block">
              <ScanLine />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF BAR ═══ */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className={`${section} py-10 flex items-center justify-center gap-8 sm:gap-16 flex-wrap`}>
          {['AI Body Scan', 'AR Try-On', 'Body Twins', 'Style Twins', 'COP/DROP Voting', 'Size Verification'].map((t, i) => (
            <span key={i} className="text-[12px] tracking-[0.15em] uppercase font-semibold"
              style={{ color: 'rgba(255,255,255,0.25)' }}>{t}</span>
          ))}
        </div>
      </section>

      {/* ═══ PROBLEM ═══ */}
      <section className="py-24 sm:py-28">
        <div className={section}>
          <FadeIn>
            <div className="text-center max-w-[640px] mx-auto">
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>THE PROBLEM</div>
              <h2 className="font-display text-[clamp(28px,4vw,48px)] font-bold leading-[1.15] mb-6">
                Ordering Three Sizes.<br />
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>Returning Two.</span>
              </h2>
              <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                You know the ritual. The grail piece drops. You cop three sizes because every brand fits different.
                Two go back. Money locked. Drip delayed.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16">
              {[
                { stat: '$816B', label: 'Global fashion returns annually', icon: '📦' },
                { stat: '30%', label: 'Of online purchases get returned', icon: '🔄' },
                { stat: '70%', label: 'Returned due to size or fit', icon: '📏' },
              ].map((item, i) => (
                <GlassCard key={i} style={{ padding: '32px', textAlign: 'center' }}>
                  <div className="text-[28px] mb-4">{item.icon}</div>
                  <div className="font-display text-[32px] font-bold mb-2" style={{ color: GOLD }}>{item.stat}</div>
                  <div className="text-[13px] tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>{item.label}</div>
                </GlassCard>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24 sm:py-28" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className={section}>
          <FadeIn>
            <div className="text-center mb-16">
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase mb-5 opacity-70" style={{ color: GOLD }}>THE ECOSYSTEM</div>
              <h2 className="font-display text-[clamp(28px,4vw,44px)] font-bold leading-[1.15]">
                Your Body. Mapped.<br />Your Closet. <span style={{ color: GOLD }}>Infinite.</span>
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <FeatureCard icon={f.icon} title={f.title} description={f.description} accent={f.accent} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-24 sm:py-28">
        <div className={section}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <FadeIn>
              <div>
                <div className="font-mono text-[11px] tracking-[0.2em] uppercase mb-5 opacity-70" style={{ color: GOLD }}>HOW IT WORKS</div>
                <h2 className="font-display text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] mb-12">
                  Scan. Try. <span style={{ color: GOLD }}>Cop.</span>
                </h2>

                <div className="flex flex-col gap-9">
                  <StepCard number="01" title="Map Your Body" description="Stand in front of your phone. Two photos. Our AI extracts 20+ biometric data points in 60 seconds. Your geometry — locked." />
                  <StepCard number="02" title="Enter the Infinite Closet" description="Browse 7,000+ pieces from 130 brands. AR try-on renders every garment on your exact silhouette. See the real drape." />
                  <StepCard number="03" title="Verify With Your Twins" description="Your Body Twins — same proportions — have already tried it. See their COP/DROP verdict and fit photos." />
                  <StepCard number="04" title="Cop With Confidence" description="Verified sizing. Perfect drape confirmation. Zero guessing. One size. One purchase. Zero returns." />
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <GlassCard style={{ padding: '32px' }}>
                <div className="font-mono text-[10px] tracking-[0.15em] uppercase mb-5" style={{ color: GOLD }}>LIVE COMMUNITY VERDICT</div>
                <CopDropBar label="Arc'teryx Beta LT — Size M" cop={94} />
                <CopDropBar label="The Row Margaux Bag" cop={87} />
                <CopDropBar label="Stone Island Ghost Overshirt — L" cop={91} />
                <CopDropBar label="Nike ACG Therma-FIT — S" cop={78} />
                <CopDropBar label="Totême Twisted Seam Denim — 28" cop={96} />
                <div className="mt-6 pt-5 text-[12px] text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                  Verdicts from Body Twins within your measurement range
                </div>
              </GlassCard>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ COMMUNITY ═══ */}
      <section className="py-24 sm:py-28" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className={section}>
          <FadeIn>
            <div className="text-center max-w-[580px] mx-auto mb-16">
              <div className="font-mono text-[11px] tracking-[0.2em] uppercase mb-5 opacity-80" style={{ color: PURPLE }}>COMMUNITY</div>
              <h2 className="font-display text-[clamp(28px,3.5vw,40px)] font-bold leading-[1.15] mb-5">
                Your Taste. <span style={{ color: PURPLE }}>Verified.</span>
              </h2>
              <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Find the heads who dress like you think. Share fits. Rate drape. Build your verified circle.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { title: 'Body Twin Match', value: '97.3%', sub: 'Measurement alignment', color: GOLD },
              { title: 'Style Twin Score', value: '84', sub: 'Aesthetic compatibility', color: PURPLE },
              { title: 'Fit Consensus', value: 'COP', sub: '92% community verdict', color: GOLD },
            ].map((card, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <GlassCard style={{ padding: '36px', textAlign: 'center' }}>
                  <div className="text-[12px] tracking-[0.1em] uppercase mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>{card.title}</div>
                  <div className="font-display text-[42px] font-bold mb-2" style={{ color: card.color }}>{card.value}</div>
                  <div className="font-mono text-[11px] tracking-[0.08em]" style={{ color: 'rgba(255,255,255,0.35)' }}>{card.sub}</div>
                </GlassCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="py-24 sm:py-28">
        <div className={`${section} max-w-[720px]`}>
          <FadeIn>
            <h2 className="font-display text-[clamp(28px,3vw,36px)] font-bold text-center mb-14">Everything You Need to Know</h2>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div>{FAQ_DATA.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}</div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-24 sm:py-28 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 60%)' }} />
        <div className={`${section} text-center relative z-10`}>
          <FadeIn>
            <div className="font-mono text-[11px] tracking-[0.25em] uppercase mb-6 opacity-70" style={{ color: GOLD }}>THE CHEAT CODE IS LIVE</div>
            <h2 className="font-display text-[clamp(32px,5vw,56px)] font-extrabold leading-[1.1] mb-6">
              Your Body. Mapped.<br />Your Drip. <span style={{ color: GOLD }}>Verified.</span>
            </h2>
            <p className="text-base mb-10 max-w-[480px] mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              7,000 pieces. 130 brands. Zero returns. The anti-return cheat code for your closet.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="flex justify-center">
              <LandingEmailCapture id="footer-cta" buttonText="Get the Cheat Code" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }} className="py-12">
        <div className={`${section} flex flex-col sm:flex-row justify-between items-center gap-5`}>
          <BrandLogo size="sm" className="opacity-60" />
          <div className="text-[12px] tracking-wide" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Discover styles. Verify size. Drip checked. © 2026
          </div>
          <div className="flex gap-6">
            {[
              { label: 'Privacy', to: '/privacy' },
              { label: 'Terms', to: '/terms' },
            ].map(l => (
              <Link key={l.label} to={l.to} className="text-[12px] tracking-wide hover:text-foreground transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>{l.label}</Link>
            ))}
            <a href="mailto:hello@dripfit.app" className="text-[12px] tracking-wide hover:text-foreground transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
