import { useEffect, useState } from 'react';
import { Users, Crown, TrendingUp, Zap, MessageSquare, ArrowRight, Quote, Sparkles } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BrandLogo from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const TOTAL_SPOTS = 100;
const FALLBACK_CLAIMED = 12;

const PERKS = [
  { icon: Zap, title: 'Early Access', desc: 'You test it first. Virtual try-on, AI sizing, new drops — before the public sees them.' },
  { icon: MessageSquare, title: 'Direct Input', desc: 'Your brands. Your features. Founding members shape what gets built next.' },
  { icon: Crown, title: 'Free Premium', desc: 'Premium. For life. Zero strings. The cheat code — locked in at founding tier.' },
  { icon: TrendingUp, title: 'Sizing Intel', desc: '186 brands. Insider sizing data from Body Twins who actually wear the pieces.' },
];

const EARLY_MEMBERS = [
  { initials: 'JT', name: 'Jordan T.', label: 'Sneakerhead', color: 'bg-primary/20 text-primary' },
  { initials: 'AK', name: 'Ava K.', label: 'Capsule wardrobe', color: 'bg-accent/20 text-accent-foreground' },
  { initials: 'ML', name: 'Marcus L.', label: 'Streetwear', color: 'bg-foreground/10 text-foreground' },
  { initials: 'SR', name: 'Sofia R.', label: 'Petite fashion', color: 'bg-foreground/10 text-foreground' },
  { initials: 'DW', name: 'Derek W.', label: 'Big & tall', color: 'bg-foreground/10 text-foreground' },
  { initials: 'NK', name: 'Nina K.', label: 'Thrift queen', color: 'bg-primary/20 text-primary' },
];

const TESTIMONIALS = [
  { quote: "Finally stopped buying 3 sizes of everything and returning 2. This saved me so much money already.", name: 'Jordan T.', detail: 'Founding Member' },
  { quote: "The sizing is eerily accurate. Got my Zara size right on the first try — that never happens.", name: 'Sofia R.', detail: 'Beta Member' },
  { quote: "Love that I can actually influence what brands get added next. Feels like I'm building this with the team.", name: 'Marcus L.', detail: 'Day-one beta' },
];

const FoundingMembers = () => {
  usePageMeta({ title: 'Founding Members', description: 'Join the Founding 100 — exclusive early access, direct input on features, and lifetime perks.', path: '/founding-members' });
  const [spotsClaimed, setSpotsClaimed] = useState(FALLBACK_CLAIMED);

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

      {/* ── Who's Already In ───────────────────────── */}
      <section className="max-w-md mx-auto px-6 pb-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <h2 className="font-display text-lg font-bold text-center mb-4">Who's Already In</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {EARLY_MEMBERS.map((m, i) => (
              <motion.div
                key={m.initials}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.07, duration: 0.3 }}
                className="flex items-center gap-2 glass-dark rounded-full pl-1 pr-3 py-1"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className={`text-[10px] font-bold ${m.color}`}>
                    {m.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-[11px] font-semibold leading-tight">{m.name}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{m.label}</p>
                </div>
              </motion.div>
            ))}
            {/* Remaining placeholder */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0, duration: 0.3 }}
              className="flex items-center gap-2 glass rounded-full pl-1 pr-3 py-1 border-dashed"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] text-muted-foreground bg-muted">?</AvatarFallback>
              </Avatar>
              <p className="text-[11px] text-muted-foreground font-medium">You?</p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── Testimonials ───────────────────────────── */}
      <section className="max-w-md mx-auto px-6 pb-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <h2 className="font-display text-lg font-bold text-left mb-4 uppercase">The Verdict.</h2>
          <div className="space-y-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, x: i % 2 === 0 ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.12, duration: 0.35 }}
                className="glass-dark rounded-xl p-4 relative"
              >
                <Quote className="h-4 w-4 text-primary/30 absolute top-3 right-3" />
                <p className="text-[12px] text-foreground leading-relaxed mb-2.5 pr-5">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  <span className="text-[11px] font-semibold">{t.name}</span>
                  <span className="text-[10px] text-muted-foreground">· {t.detail}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
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
