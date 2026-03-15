import { useEffect, useState } from 'react';
import { Download, Palette, Type, Image, BarChart3, Users, ShoppingBag, Ruler, Eye, ExternalLink } from 'lucide-react';
import InlineCrown from '@/components/ui/InlineCrown';
import { usePageTitle } from '@/hooks/usePageTitle';
import BrandLogo from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

import heroPreview from '@/assets/hero-preview.png';
import heroPreview2 from '@/assets/hero-preview-2.png';
import heroPreview3 from '@/assets/hero-preview-3.png';
import featureScan from '@/assets/feature-scan.jpg';
import featureTryon from '@/assets/feature-tryon.jpg';
import featureStylecheck from '@/assets/feature-stylecheck.jpg';
import scanResults from '@/assets/scan-results-full.jpg';
import onboardingScan from '@/assets/onboarding-scan-results.jpg';

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

const FALLBACK_STATS: DbStats = {
  active_products: 7000,
  unique_brands: 130,
  unique_retailers: 130,
  size_charts: 280,
  categories: 35,
  total_users: 0,
  total_scans: 0,
  public_tryons: 0,
};

/* ── Brand Colors ────────────────────────────────────── */
const BRAND_COLORS = [
  { name: 'Charcoal Black', hsl: '220 15% 3%', hex: '#070809', token: '--background' },
  { name: 'DripFit Gold', hsl: '42 76% 42%', hex: '#BC9325', token: '--primary' },
  { name: 'Warm Ivory', hsl: '40 20% 95%', hex: '#F5F2ED', token: '--foreground' },
  { name: 'Surface', hsl: '220 12% 7%', hex: '#101215', token: '--card' },
  { name: 'Muted Gold', hsl: '42 60% 38%', hex: '#9B7B26', token: '--accent' },
  { name: 'Soft Gray', hsl: '40 8% 58%', hex: '#999490', token: '--muted-foreground' },
];

/* ── Typography ──────────────────────────────────────── */
const TYPOGRAPHY = [
  { name: 'Display', family: 'Playfair Display', weight: '700', sample: 'DRIPFIT CHECK', use: 'Headlines, hero text, brand name' },
  { name: 'Body', family: 'DM Sans', weight: '400–700', sample: 'The future of online sizing', use: 'Body copy, UI elements, descriptions' },
];

/* ── Key Assets ──────────────────────────────────────── */
const KEY_ASSETS = [
  { label: 'App Preview — Home', src: heroPreview, aspect: 'aspect-[9/16]' },
  { label: 'App Preview — Results', src: heroPreview2, aspect: 'aspect-[9/16]' },
  { label: 'App Preview — Try-On', src: heroPreview3, aspect: 'aspect-[9/16]' },
  { label: 'Body Scan Flow', src: featureScan, aspect: 'aspect-[4/3]' },
  { label: 'Virtual Try-On', src: featureTryon, aspect: 'aspect-[4/3]' },
  { label: 'Style Check', src: featureStylecheck, aspect: 'aspect-[4/3]' },
  { label: 'Scan Results', src: scanResults, aspect: 'aspect-[9/16]' },
  { label: 'Onboarding Scan', src: onboardingScan, aspect: 'aspect-[9/16]' },
];

/* ── Value Props ─────────────────────────────────────── */
const VALUE_PROPS = [
  '60-second AI body scan — no tape measure needed',
  'Accurate size matching across 130+ brands',
  'Virtual try-on to visualize fit before purchase',
  '30–40% reduction in size-related returns',
  'Community-powered style feedback',
];

/* ── Messaging Pillars ───────────────────────────────── */
const MESSAGING = [
  { pillar: 'Precision', line: '"Know your exact size at any brand, every time."' },
  { pillar: 'Confidence', line: '"Shop without the guesswork — buy once, keep it."' },
  { pillar: 'Sustainability', line: '"Fewer returns, less waste, better fashion."' },
  { pillar: 'Community', line: '"Real style feedback from real people."' },
];

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4 },
});

/* ── Component ───────────────────────────────────────── */
const MediaKit = () => {
  usePageTitle('Media Kit');
  const [stats, setStats] = useState<DbStats>(FALLBACK_STATS);

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase.rpc('get_media_kit_stats' as any);
      if (data && Array.isArray(data) && data.length > 0) {
        setStats(data[0] as unknown as DbStats);
      }
    };
    // Use direct queries since we don't have an RPC
    const fetchDirectStats = async () => {
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

      const uniqueBrands = brands.data ? new Set(brands.data.map((r: any) => r.brand)).size : FALLBACK_STATS.unique_brands;
      const uniqueCategories = categories.data ? new Set(categories.data.map((r: any) => r.category)).size : FALLBACK_STATS.categories;

      setStats({
        active_products: products.count ?? FALLBACK_STATS.active_products,
        unique_brands: uniqueBrands,
        unique_retailers: retailers.count ?? FALLBACK_STATS.unique_retailers,
        size_charts: charts.count ?? FALLBACK_STATS.size_charts,
        categories: uniqueCategories,
        total_users: users.count ?? 0,
        total_scans: scans.count ?? 0,
        public_tryons: tryons.count ?? 0,
      });
    };
    fetchDirectStats();
  }, []);

  const heroStats = [
    { label: 'Products', value: stats.active_products.toLocaleString(), icon: ShoppingBag },
    { label: 'Brands', value: `${stats.unique_brands}+`, icon: ShoppingBag },
    { label: 'Size Charts', value: `${stats.size_charts}+`, icon: Ruler },
    { label: 'Categories', value: `${stats.categories}+`, icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ─────────────────────────────────── */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo size="sm" />
          <span className="text-[10px] font-bold uppercase tracking-[3px] text-muted-foreground">Media Kit</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-16">

        {/* ── Brand Identity ──────────────────────── */}
        <motion.section {...fade(0)}>
          <h1 className="font-display text-3xl font-bold tracking-tight mb-2">Brand Assets & Media Kit</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
            Everything you need to represent DripFit Check across advertising, social media, and partner outreach. 
            All assets are optimized for digital use.
          </p>
        </motion.section>

        {/* ── Logo & Usage ────────────────────────── */}
        <motion.section {...fade(0.1)}>
          <SectionHeader icon={() => <InlineCrown size={16} />} title="Logo & Brand Mark" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-4">
              <BrandLogo size="lg" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Full Logo — Dark BG</span>
            </div>
            <div className="bg-foreground border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 rounded-2xl bg-primary/90 flex items-center justify-center">
                  <InlineCrown size={40} />
                </div>
                <span className="font-display font-bold text-2xl tracking-[3px] text-background">
                  DRIPFIT <span className="text-primary">✔</span>
                </span>
              </div>
              <span className="text-[10px] text-background/60 uppercase tracking-wider">Full Logo — Light BG</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-3">
              <BrandLogo size="md" iconOnly />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Icon Only</span>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center gap-3">
              <BrandLogo size="sm" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Compact</span>
            </div>
          </div>
        </motion.section>

        {/* ── Color Palette ───────────────────────── */}
        <motion.section {...fade(0.15)}>
          <SectionHeader icon={Palette} title="Color Palette" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
            {BRAND_COLORS.map((c) => (
              <div key={c.name} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg shrink-0 border border-border"
                  style={{ backgroundColor: `hsl(${c.hsl})` }}
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{c.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Typography ──────────────────────────── */}
        <motion.section {...fade(0.2)}>
          <SectionHeader icon={Type} title="Typography" />
          <div className="grid grid-cols-1 gap-3 mt-4">
            {TYPOGRAPHY.map((t) => (
              <div key={t.name} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{t.name}</span>
                  <span className="text-[10px] text-muted-foreground">{t.family} · {t.weight}</span>
                </div>
                <p className={`text-2xl ${t.name === 'Display' ? 'font-display font-bold tracking-[2px]' : 'font-sans'} mb-1`}>
                  {t.sample}
                </p>
                <p className="text-[11px] text-muted-foreground">{t.use}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Live Platform Stats ─────────────────── */}
        <motion.section {...fade(0.25)}>
          <SectionHeader icon={BarChart3} title="Platform Statistics" subtitle="Live from database" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {heroStats.map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <s.icon className="h-4 w-4 text-primary mx-auto mb-2" />
                <p className="font-display text-xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Key Value Props ─────────────────────── */}
        <motion.section {...fade(0.3)}>
          <SectionHeader icon={Users} title="Key Messaging" />
          <div className="bg-card border border-border rounded-xl p-5 mt-4 space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">Tagline</p>
              <p className="font-display text-lg font-bold">"Your size. Every brand. Every time."</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">Elevator Pitch</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                DripFit Check uses AI-powered body scanning to match shoppers with their exact size at 130+ brands — 
                eliminating the guesswork, cutting return rates by 30–40%, and building confidence in every purchase.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">Value Props</p>
              <ul className="space-y-1.5">
                {VALUE_PROPS.map((v) => (
                  <li key={v} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span> {v}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-3">Messaging Pillars</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MESSAGING.map((m) => (
                  <div key={m.pillar} className="bg-muted/30 rounded-lg p-3">
                    <p className="text-[11px] font-bold mb-1">{m.pillar}</p>
                    <p className="text-[12px] text-muted-foreground italic">{m.line}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── App Screenshots & Assets ────────────── */}
        <motion.section {...fade(0.35)}>
          <SectionHeader icon={Image} title="App Screenshots & Assets" subtitle="Right-click → Save to download" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {KEY_ASSETS.map((a) => (
              <div key={a.label} className="group">
                <div className={`${a.aspect} bg-card border border-border rounded-xl overflow-hidden`}>
                  <img
                    src={a.src}
                    alt={a.label}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">{a.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Quick Links ─────────────────────────── */}
        <motion.section {...fade(0.4)}>
          <SectionHeader icon={ExternalLink} title="Quick Links" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            {[
              { label: 'Live App', href: 'https://dripfitcheck.lovable.app', desc: 'Try DripFit Check' },
              { label: 'Partnership Deck', href: '/partnership', desc: 'Retailer integration overview' },
              { label: 'Founding Members', href: '/founding-members', desc: 'Join the Founding 50' },
              { label: 'Privacy Policy', href: '/privacy', desc: 'Data handling & privacy' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors flex items-center gap-3"
              >
                <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold">{link.label}</p>
                  <p className="text-[11px] text-muted-foreground">{link.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </motion.section>

        {/* ── Contact ─────────────────────────────── */}
        <motion.section {...fade(0.45)} className="text-center pb-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">Media Inquiries</p>
            <p className="text-sm text-muted-foreground mb-3">
              For press, partnerships, or brand collaboration requests:
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:partnerships@dripfitcheck.com">partnerships@dripfitcheck.com</a>
            </Button>
          </div>
        </motion.section>
      </div>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-border py-5 text-center">
        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} DripFit Check · All assets for editorial and partnership use only.
        </p>
      </footer>
    </div>
  );
};

/* ── Section Header ──────────────────────────────────── */
const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) => (
  <div className="flex items-center gap-2">
    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  </div>
);

export default MediaKit;
