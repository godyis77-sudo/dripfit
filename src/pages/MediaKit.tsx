import { useEffect, useState } from 'react';
import { Palette, Type, Image, BarChart3, Users, ShoppingBag, Ruler, Eye, ExternalLink, Mail } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import BrandLogo from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import DecorativeSilhouette from '@/components/ui/DecorativeSilhouette';
import heroPreview from '@/assets/hero-preview.png';
import heroPreview2 from '@/assets/hero-preview-2.png';
import heroPreview3 from '@/assets/hero-preview-3.png';
import featureScan from '@/assets/feature-scan.jpg';
import featureTryon from '@/assets/feature-tryon.jpg';
import featureStylecheck from '@/assets/feature-stylecheck.jpg';

/* ── Types ──────────────────────────────────────────── */
interface DbStats {
  active_products: number;
  unique_brands: number;
  unique_retailers: number;
  size_charts: number;
  categories: number;
  total_users: number;
  total_scans: number;
  public_tryons: number;
}

const FALLBACK: DbStats = {
  active_products: 8504, unique_brands: 142, unique_retailers: 162,
  size_charts: 390, categories: 36, total_users: 0, total_scans: 0, public_tryons: 0,
};

/* ── Brand Colors (from index.css :root) ─────────────── */
const COLORS = [
  { name: 'Background',        hsl: '220 15% 3%',   hex: '#070809', token: '--background' },
  { name: 'DripFit Gold',      hsl: '43 74% 52%',   hex: '#D4AF37', token: '--primary' },
  { name: 'Warm Ivory',        hsl: '40 20% 95%',   hex: '#F5F2ED', token: '--foreground' },
  { name: 'Surface / Card',    hsl: '220 12% 7%',   hex: '#101215', token: '--card' },
  { name: 'Accent Gold',       hsl: '43 74% 40%',   hex: '#B2912B', token: '--accent' },
  { name: 'Muted Text',        hsl: '40 8% 58%',    hex: '#999490', token: '--muted-foreground' },
];

/* ── 7-Tier Typography System ────────────────────────── */
const TIERS = [
  { tier: 1, name: 'Brand Mark',    family: 'Playfair Display', weight: '800', size: '28 px', tracking: 'Tight', sample: 'DRIPFIT ✔', use: 'Wordmark only — uppercase, gold checkmark at 80 %' },
  { tier: 2, name: 'Headlines',     family: 'Playfair Display', weight: '600', size: '22 px', tracking: 'Normal', sample: 'Your Biometric Scan.', use: 'Section headlines, card titles' },
  { tier: 3, name: 'Taglines',      family: 'DM Sans',          weight: '500', size: '13 px', tracking: '0.15 em', sample: 'STOP PRAYING IT FITS', use: 'Uppercase subtitles, section labels' },
  { tier: 4, name: 'Body',          family: 'DM Sans',          weight: '400', size: '14 px', tracking: 'Normal', sample: 'The future of online sizing.', use: 'Paragraphs, descriptions, UI copy' },
  { tier: 5, name: 'Data / Meta',   family: 'DM Mono',          weight: '400', size: '10 px', tracking: '0.12 em', sample: 'CHEST · 96 CM', use: 'Measurement readouts, metadata, timestamps' },
  { tier: 6, name: 'Labels / Nav',  family: 'DM Sans',          weight: '600', size: '10 px', tracking: '0.1 em', sample: 'CLOSET', use: 'Tab labels, navigation, badges' },
  { tier: 7, name: 'Prices / CTA',  family: 'DM Mono / DM Sans', weight: '500–600', size: '14 px', tracking: 'Normal', sample: '$129.00', use: 'Price tags, primary action buttons' },
];

/* ── Key Assets ──────────────────────────────────────── */
const ASSETS = [
  { label: 'App — Home',     src: heroPreview,  aspect: 'aspect-[9/16]' },
  { label: 'App — Results',  src: heroPreview2, aspect: 'aspect-[9/16]' },
  { label: 'App — Try-On',   src: heroPreview3, aspect: 'aspect-[9/16]' },
  { label: 'Body Scan',      src: featureScan,  aspect: 'aspect-[4/3]' },
  { label: 'Virtual Try-On', src: featureTryon, aspect: 'aspect-[4/3]' },
  { label: 'The Drop',       src: featureStylecheck, aspect: 'aspect-[4/3]' },
];

/* ── Messaging ───────────────────────────────────────── */
const PILLARS = [
  { pillar: 'Precision',      line: '"Know your exact size at any brand, every time."' },
  { pillar: 'Confidence',     line: '"Stop praying it fits. One size. One purchase. Zero returns."' },
  { pillar: 'Culture',        line: '"The verification layer for fashion culture. Body Twins. COP/DROP. Technical infrastructure for how people actually dress."' },
  { pillar: 'Community',      line: '"Real style feedback from real people."' },
];

const VALUE_PROPS = [
  '60-second AI body scan — no tape measure needed',
  'Accurate size matching across 142+ brands',
  'Virtual try-on to visualize fit before purchase',
  '30–40% reduction in size-related returns',
  'Community-powered style feedback via The Drop',
];

const fade = (d: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.4 } });

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const MediaKit = () => {
  usePageMeta({ title: 'Media Kit', description: 'DripFit brand assets, logos, colors, typography, and press materials.', path: '/media-kit' });
  const [stats, setStats] = useState<DbStats>(FALLBACK);

  useEffect(() => {
    (async () => {
      const [products, brands, retailers, charts, categories, users, scans, tryons] = await Promise.all([
        supabase.from('product_catalog').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('product_catalog').select('brand').eq('is_active', true),
        supabase.from('retailers').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('brand_size_charts').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('product_catalog').select('category').eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('body_scans').select('id', { count: 'exact', head: true }),
        supabase.from('tryon_posts').select('id', { count: 'exact', head: true }).eq('is_public', true),
      ]);
      setStats({
        active_products: products.count ?? FALLBACK.active_products,
        unique_brands: brands.data ? new Set(brands.data.map((r: any) => r.brand)).size : FALLBACK.unique_brands,
        unique_retailers: retailers.count ?? FALLBACK.unique_retailers,
        size_charts: charts.count ?? FALLBACK.size_charts,
        categories: categories.data ? new Set(categories.data.map((r: any) => r.category)).size : FALLBACK.categories,
        total_users: users.count ?? 0,
        total_scans: scans.count ?? 0,
        public_tryons: tryons.count ?? 0,
      });
    })();
  }, []);

  const heroStats = [
    { label: 'Products',    value: stats.active_products.toLocaleString(), icon: ShoppingBag },
    { label: 'Brands',      value: `${stats.unique_brands}+`, icon: ShoppingBag },
    { label: 'Size Charts', value: `${stats.size_charts}+`, icon: Ruler },
    { label: 'Categories',  value: `${stats.categories}+`, icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ──────────────────────────────────── */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo size="sm" />
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Media Kit</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-16">

        {/* ── Hero / Intro ─────────────────────────── */}
        <motion.section {...fade(0)}>
          <h1 className="font-display text-3xl font-bold tracking-tight uppercase mb-2">Brand Assets &amp; Media Kit</h1>
          <p className="font-sans text-sm text-muted-foreground leading-relaxed max-w-lg">
            Everything you need to represent DripFit Check across press, social, and partner channels.
            All assets are optimised for digital use.
          </p>
        </motion.section>

        {/* ── Logo & Brand Mark ────────────────────── */}
        <motion.section {...fade(0.08)}>
          <SectionHead icon={() => <Sparkles className="h-4 w-4 text-primary" />} title="Logo &amp; Brand Mark" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <LogoCard bg="bg-card" label="Full Logo — Dark BG"><BrandLogo size="xl" /></LogoCard>
            <LogoCard bg="bg-foreground" label="Full Logo — Light BG" labelClass="text-background/60">
              <BrandLogo size="xl" />
            </LogoCard>
            <LogoCard bg="bg-card" label="Icon Only"><BrandLogo size="md" iconOnly /></LogoCard>
            <LogoCard bg="bg-card" label="Compact"><BrandLogo size="sm" /></LogoCard>
          </div>
        </motion.section>

        {/* ── Color Palette ────────────────────────── */}
        <motion.section {...fade(0.14)}>
          <SectionHead icon={Palette} title="Color Palette" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            {COLORS.map(c => (
              <div key={c.name} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg shrink-0 border border-border" style={{ backgroundColor: `hsl(${c.hsl})` }} />
                <div className="min-w-0">
                  <p className="font-sans text-xs font-semibold truncate">{c.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{c.hex}</p>
                  <p className="font-mono text-[9px] text-muted-foreground/60">{c.token}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Typography — 7-Tier System ───────────── */}
        <motion.section {...fade(0.2)}>
          <SectionHead icon={Type} title="Typography — 7-Tier System" />
          <div className="space-y-2 mt-4">
            {TIERS.map(t => (
              <div key={t.tier} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5 tracking-widest uppercase">Tier {t.tier}</span>
                  <span className="font-sans text-xs font-bold uppercase tracking-wider">{t.name}</span>
                </div>
                <p className={`text-xl mb-1 ${t.tier <= 2 ? 'font-display font-bold tracking-[2px]' : t.tier === 5 || t.tier === 7 ? 'font-mono' : 'font-sans'}`}>
                  {t.sample}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                  <span className="font-mono text-[10px] text-muted-foreground">{t.family}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">W {t.weight}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{t.size}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">Tracking {t.tracking}</span>
                </div>
                <p className="font-sans text-[11px] text-muted-foreground mt-1">{t.use}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Platform Stats ───────────────────────── */}
        <motion.section {...fade(0.26)}>
          <SectionHead icon={BarChart3} title="Platform Statistics" sub="Live from database" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {heroStats.map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <s.icon className="h-4 w-4 text-primary mx-auto mb-2" />
                <p className="font-display text-xl font-bold">{s.value}</p>
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Key Messaging ────────────────────────── */}
        <motion.section {...fade(0.3)}>
          <SectionHead icon={Users} title="Key Messaging" />
          <div className="bg-card border border-border rounded-xl p-5 mt-4 space-y-5">
            {/* Taglines */}
            <div>
              <Label>Taglines</Label>
              <p className="font-display text-lg font-bold">"Stop Praying It Fits."</p>
              <p className="font-display text-base font-semibold text-muted-foreground mt-1">"Your Biometric Scan."</p>
            </div>
            {/* Elevator Pitch */}
            <div>
              <Label>Elevator Pitch</Label>
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                DripFit Check uses AI-powered body scanning to match shoppers with their exact size at {stats.unique_brands}+ brands —
                eliminating the guesswork, cutting return rates by 30–40%, and building confidence in every purchase.
              </p>
            </div>
            {/* Value Props */}
            <div>
              <Label>Value Props</Label>
              <ul className="space-y-1.5">
                {VALUE_PROPS.map(v => (
                  <li key={v} className="font-sans text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>{v}
                  </li>
                ))}
              </ul>
            </div>
            {/* Pillars */}
            <div>
              <Label>Messaging Pillars</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {PILLARS.map(m => (
                  <div key={m.pillar} className="bg-muted/30 rounded-lg p-3">
                    <p className="font-sans text-[11px] font-bold uppercase tracking-wider mb-0.5">{m.pillar}</p>
                    <p className="font-sans text-xs text-muted-foreground italic">{m.line}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Body Scan Preview ────────────────────── */}
        <motion.section {...fade(0.34)}>
          <SectionHead icon={Ruler} title="AI Body Scan Technology" sub="Live interactive preview" />
          <div className="bg-card border border-border rounded-xl p-6 mt-4 flex flex-col items-center gap-4">
            <DecorativeSilhouette height={320} />
            <p className="font-sans text-[11px] text-muted-foreground text-center max-w-xs">
              Proprietary AI body scan generates precise measurements in under 60 seconds — no tape measure required.
            </p>
          </div>
        </motion.section>

        {/* ── App Screenshots ──────────────────────── */}
        <motion.section {...fade(0.38)}>
          <SectionHead icon={Image} title="App Screenshots &amp; Assets" sub="Right-click → Save to download" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {ASSETS.map(a => (
              <div key={a.label} className="group">
                <div className={`${a.aspect} bg-card border border-border rounded-xl overflow-hidden`}>
                  <img src={a.src} alt={a.label} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <p className="font-mono text-[10px] text-muted-foreground mt-1.5 text-center uppercase tracking-wider">{a.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Quick Links ──────────────────────────── */}
        <motion.section {...fade(0.42)}>
          <SectionHead icon={ExternalLink} title="Quick Links" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            {[
              { label: 'Live App',         href: 'https://dripfitcheck.lovable.app', desc: 'Try DripFit Check' },
              { label: 'Partnership Deck',  href: '/partnership', desc: 'Retailer integration overview' },
              { label: 'Founding Members',  href: '/founding-members', desc: 'Join the Founding 100' },
              { label: 'Privacy Policy',    href: '/privacy', desc: 'Data handling & privacy' },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors flex items-center gap-3"
              >
                <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="font-sans text-[13px] font-semibold">{link.label}</p>
                  <p className="font-sans text-[11px] text-muted-foreground">{link.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.section>

        {/* ── Contact CTA ──────────────────────────── */}
        <motion.section {...fade(0.46)} className="text-center pb-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-2">Media Inquiries</p>
            <p className="font-sans text-sm text-muted-foreground mb-3">
              For press, partnerships, or brand collaboration requests:
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:partnerships@dripfitcheck.com" className="inline-flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />partnerships@dripfitcheck.com
              </a>
            </Button>
          </div>
        </motion.section>
      </div>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-border py-5 text-center">
        <p className="font-sans text-[11px] text-muted-foreground">© {new Date().getFullYear()} DripFit Check · All assets for editorial and partnership use only.</p>
      </footer>
    </div>
  );
};

/* ── Shared sub-components ───────────────────────────── */
const SectionHead = ({ icon: Icon, title, sub }: { icon: any; title: string; sub?: string }) => (
  <div className="flex items-center gap-2">
    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div>
      <h2 className="font-display text-lg font-bold uppercase">{title}</h2>
      {sub && <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{sub}</p>}
    </div>
  </div>
);

const Label = ({ children }: { children: string }) => (
  <p className="font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-1.5">{children}</p>
);

const LogoCard = ({ bg, label, labelClass, children }: { bg: string; label: string; labelClass?: string; children: React.ReactNode }) => (
  <div className={`${bg} border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-4`}>
    {children}
    <span className={`font-mono text-[10px] uppercase tracking-wider ${labelClass ?? 'text-muted-foreground'}`}>{label}</span>
  </div>
);

export default MediaKit;
