import { useEffect, useState } from 'react';
import { Users, Crown, TrendingUp, Zap, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BrandLogo from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useCatalogStats } from '@/hooks/useCatalogStats';
// P3 placeholder — swap when real founder portrait is shot
import editorialFounderImg from '@/assets/editorial-founder.jpg';

const TOTAL_SPOTS = 100;
const FALLBACK_CLAIMED = 12;

const buildPerks = (brandsLabel: string, sizeChartsLabel: string) => [
  { icon: Zap, title: 'Early Access', desc: 'You test it first. Virtual try-on, AI sizing, new drops — before the public sees them.' },
  { icon: MessageSquare, title: 'Direct Input', desc: 'Your brands. Your features. Founding members shape what gets built next.' },
  { icon: Crown, title: 'Free Premium', desc: 'Premium. For life. Zero strings. The cheat code — locked in at founding tier.' },
  { icon: TrendingUp, title: 'Sizing Intel', desc: `${brandsLabel} brands. ${sizeChartsLabel} size charts. Insider sizing data from Body Twins who actually wear the pieces.` },
];

const buildCapabilities = (brandsLabel: string, sizeChartsLabel: string, retailersLabel: string) => [
  { stat: brandsLabel, label: 'Brands mapped' },
  { stat: sizeChartsLabel, label: 'Verified size charts' },
  { stat: retailersLabel, label: 'Retailers connected' },
];

const FoundingMembers = () => {
  usePageMeta({ title: 'Founding Members', description: 'Join the Founding 100 — exclusive early access, direct input on features, and lifetime perks.', path: '/founding-members' });
  const [spotsClaimed, setSpotsClaimed] = useState(FALLBACK_CLAIMED);
  const stats = useCatalogStats();
  const PERKS = buildPerks(stats.brandsLabel, stats.sizeChartsLabel);
  const CAPABILITIES = buildCapabilities(stats.brandsLabel, stats.sizeChartsLabel, stats.retailersLabel);

  useEffect(() => {
    supabase
      .from('app_config')
      .select('value')
      .eq('key', 'founding_members_claimed')
      .single()
      .then(({ data }) => {
        if (data?.value) setSpotsClaimed(parseInt(data.value, 10));
      });
  }, []);

  const spotsLeft = TOTAL_SPOTS - spotsClaimed;
  const progress = (spotsClaimed / TOTAL_SPOTS) * 100;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Hero ───────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/6 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />

        <div className="relative max-w-md mx-auto px-6 pt-14 pb-8 text-center">
          <BrandLogo size="md" className="justify-center mb-6" />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[3px] text-primary bg-primary/10 px-3 py-1.5 rounded-full mb-5">
              <Sparkles className="h-3 w-3" /> Founding 100
            </span>

            <h1 className="headline-editorial text-3xl sm:text-4xl tracking-tight leading-[1.15] mb-3 text-primary">
              Help us build the future of{' '}
              <span className="text-primary">online sizing</span>
            </h1>

            <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto">
              We're recruiting 100 founding members to shape DripFit Check — 
              get lifetime perks, early access, and a direct line to the team.
            </p>
          </motion.div>

          {/* ── Spots Counter ──────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-8 glass-dark rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Spots claimed</span>
              <span className="text-xs font-bold text-foreground">{spotsClaimed} / {TOTAL_SPOTS}</span>
            </div>
            <div className="h-3 glass rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-3 text-center">
              <span className="headline-editorial text-2xl text-primary">{spotsLeft}</span>
              <span className="text-xs text-muted-foreground ml-1.5">spots remaining</span>
            </p>
          </motion.div>

          {/* ── CTA Button ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-6"
          >
            <Button size="lg" className="w-full text-base gap-2" asChild>
              <a href="/waitlist">
                <Users className="h-5 w-5" />
                Claim your spot
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <p className="text-[11px] text-muted-foreground mt-2">Free forever · No spam · Leave anytime</p>
          </motion.div>
        </div>
      </section>

      {/* ── What You're Joining (live capabilities) ── */}
      <section className="max-w-md mx-auto px-6 pb-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <h2 className="font-display text-lg font-bold text-center mb-4 uppercase tracking-wide">What You're Joining</h2>
          <div className="grid grid-cols-3 gap-2">
            {CAPABILITIES.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.08, duration: 0.3 }}
                className="text-center bg-secondary border border-border rounded-2xl py-4 px-2"
              >
                <p className="font-display text-xl font-bold text-primary leading-none">{c.stat}</p>
                <p className="text-[10px] text-foreground/55 mt-2 uppercase tracking-[0.08em] leading-tight font-medium">{c.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── The Promise ────────────────────────────── */}
      <section className="max-w-md mx-auto px-6 pb-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="glass-dark rounded-2xl p-5"
        >
          <h2 className="font-display text-base font-bold mb-3 uppercase tracking-wide">The Promise.</h2>
          <ul className="space-y-2.5 text-[12px] text-foreground/80 leading-relaxed">
            <li className="flex gap-2"><span className="text-primary">→</span> Stop buying multiple sizes "just in case"</li>
            <li className="flex gap-2"><span className="text-primary">→</span> Get the right size on the first order</li>
            <li className="flex gap-2"><span className="text-primary">→</span> Vote on which brands and features get built next</li>
            <li className="flex gap-2"><span className="text-primary">→</span> Lock in Premium for life — never pay a monthly fee</li>
          </ul>
        </motion.div>
      </section>


      <section
        data-placeholder="p3-founder-photo"
        className="max-w-md mx-auto px-6 pb-10 w-full"
      >
        <motion.figure
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-border/40"
        >
          <img
            src={editorialFounderImg}
            alt="DripFit founder portrait — placeholder"
            loading="lazy"
            width={896}
            height={1152}
            className="w-full h-auto object-cover"
          />
          <figcaption className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/85 via-black/45 to-transparent">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary/80 mb-2">
              From the founder
            </p>
            <p className="font-serif italic text-[15px] text-white leading-snug">
              "We're building DripFit for the 100 people who want to shape it.
              You'll see every brand we add. You'll vote on every feature."
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/50 mt-2.5">
              — Founder · DripFit Check
            </p>
          </figcaption>
        </motion.figure>
      </section>

      {/* ── Perks ──────────────────────────────────── */}
      <section className="max-w-md mx-auto px-6 pb-10 w-full">
        <h2 className="font-display text-lg font-bold text-center mb-5">Founding Member Perks</h2>
        <div className="grid grid-cols-1 gap-3">
          {PERKS.map((perk, i) => (
            <motion.div
              key={perk.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.35 }}
              className="flex items-start gap-3 glass-dark rounded-xl p-4"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <perk.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-[13px]">{perk.title}</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{perk.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-border py-5 text-center">
        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} DripFit Check · <a href="/privacy" className="text-primary hover:underline underline-offset-4">Privacy</a> · <a href="/terms" className="text-primary hover:underline underline-offset-4">Terms</a>
        </p>
      </footer>
    </div>
  );
};

export default FoundingMembers;
