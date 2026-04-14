import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Ruler, Share2, Loader2, AlertTriangle, Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { recommendInlineChartSize, type UserMeasurements } from '@/lib/sizeEngine';
import type { FitPreference, MeasurementRange } from '@/lib/types';
import { getFitPreference } from '@/lib/session';
import BottomTabBar from '@/components/BottomTabBar';
import { getBrandGenre, type BrandGenre, BRAND_GENRES } from '@/lib/brandGenres';
import { cn } from '@/lib/utils';

interface BrandSize {
  brandName: string;
  brandSlug: string;
  category: string;
  gender: string;
  size: string;
  confidence: number;
  genre: BrandGenre;
}

const GENRE_PILLS: { label: string; value: BrandGenre | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Luxury', value: 'Luxury' },
  { label: 'Streetwear', value: 'Streetwear' },
  { label: 'Athletic', value: 'Athletic' },
  { label: 'Casual', value: 'Casual' },
  { label: 'Minimalist', value: 'Minimalist' },
  { label: 'Outdoor', value: 'Outdoor & Active' },
];

const CATEGORY_PILLS = [
  { label: 'Tops', value: 'tops' },
  { label: 'Bottoms', value: 'bottoms' },
  { label: 'Dresses', value: 'dresses' },
  { label: 'Outerwear', value: 'outerwear' },
  { label: 'Activewear', value: 'activewear' },
  { label: 'Swimwear', value: 'swimwear' },
];

const CATEGORY_MAPPING: Record<string, string[]> = {
  tops: ['tops', 'hoodies', 'fleece', 'knitwear'],
  bottoms: ['bottoms', 'jeans', 'shorts'],
  dresses: ['dresses', 'jumpsuits'],
  outerwear: ['outerwear', 'blazers', 'suits'],
  activewear: ['activewear', 'sports-bras'],
  swimwear: ['swimwear'],
};

function ScrollFadeRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setShowFade(el.scrollWidth - el.scrollLeft - el.clientWidth > 2);
  }, []);

  useEffect(() => { check(); }, [check, children]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div ref={ref} onScroll={check} className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {children}
      </div>
      {showFade && (
        <div className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, #0A0A0A)' }} />
      )}
    </div>
  );
}

const SizeComparison = () => {
  usePageMeta({
    title: 'Your Verified Sizes',
    description: 'See your exact size across 100+ brands at a glance. Never guess your size again.',
    path: '/my-sizes',
  });

  const navigate = useNavigate();
  const { user, isSubscribed } = useAuth();
  const [loading, setLoading] = useState(true);
  const [brandSizes, setBrandSizes] = useState<BrandSize[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<BrandGenre | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState('tops');
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'brand' | 'size'>('brand');

  useEffect(() => {
    if (!user) return;
    loadSizes();
  }, [user, selectedCategory]);

  const loadSizes = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: scans } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!scans || scans.length === 0) {
        setError('no_scan');
        setLoading(false);
        return;
      }

      const scan = scans[0];
      const measurements: UserMeasurements = {
        shoulder: { min: Number(scan.shoulder_min), max: Number(scan.shoulder_max) },
        chest: { min: Number(scan.chest_min), max: Number(scan.chest_max) },
        waist: { min: Number(scan.waist_min), max: Number(scan.waist_max) },
        hips: { min: Number(scan.hip_min), max: Number(scan.hip_max) },
        inseam: { min: Number(scan.inseam_min), max: Number(scan.inseam_max) },
        sleeve: scan.sleeve_min ? { min: Number(scan.sleeve_min), max: Number(scan.sleeve_max) } : undefined,
        heightCm: Number(scan.height_cm),
      };

      const categoryGroup = CATEGORY_MAPPING[selectedCategory] || [selectedCategory];
      const { data: charts } = await supabase
        .from('brand_size_charts')
        .select('id, brand_name, brand_slug, gender, category, size_data, size_system')
        .in('category', categoryGroup)
        .eq('is_active', true);

      if (!charts || charts.length === 0) {
        setBrandSizes([]);
        setLoading(false);
        return;
      }

      const fit = getFitPreference() as FitPreference || 'regular';
      const results: BrandSize[] = [];

      for (const chart of charts) {
        const sizeData = chart.size_data as any[];
        if (!sizeData || sizeData.length === 0) continue;

        const recommendation = recommendInlineChartSize(sizeData, measurements, fit, chart.category);
        if (recommendation && recommendation.confidence > 0.2) {
          let displaySize = recommendation.size;
          // Prefix bare numeric sizes with their sizing system
          const system = (chart.size_system || '').toUpperCase();
          if (/^\d+$/.test(displaySize) && system && !['US', 'ALPHA', 'NUMERIC'].includes(system)) {
            displaySize = `${system} ${displaySize}`;
          }
          results.push({
            brandName: chart.brand_name,
            brandSlug: chart.brand_slug,
            category: chart.category,
            gender: chart.gender,
            size: displaySize,
            confidence: recommendation.confidence,
            genre: getBrandGenre(chart.brand_name) || 'Casual',
          });
        }
      }

      const deduped = new Map<string, BrandSize>();
      for (const r of results) {
        const key = r.brandName.toLowerCase();
        if (!deduped.has(key) || deduped.get(key)!.confidence < r.confidence) {
          deduped.set(key, r);
        }
      }

      setBrandSizes(
        Array.from(deduped.values()).sort((a, b) => a.brandName.localeCompare(b.brandName))
      );
    } catch (err) {
      console.error('Size comparison error:', err);
      setError('Failed to load size data');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = brandSizes;
    if (selectedGenre !== 'all') result = result.filter(b => b.genre === selectedGenre);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(b => b.brandName.toLowerCase().includes(q));
    }
    return result;
  }, [brandSizes, selectedGenre, searchQuery]);

  const confidenceDot = (c: number) => {
    if (c >= 0.72) return 'bg-primary';
    if (c >= 0.55) return 'bg-amber-400';
    return 'bg-muted-foreground/40';
  };

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/5 px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full min-h-[44px] min-w-[44px] bg-white/[0.06] border border-white/10 backdrop-blur-sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <div className="flex-1">
            <h1 className="text-white uppercase" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>Your Verified Sizes</h1>
            <p className="text-[11px] text-white/30">Every brand. Locked.</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full min-h-[44px] min-w-[44px] bg-white/[0.06] border border-white/10 backdrop-blur-sm"
            aria-label="Share my size chart"
            onClick={async () => {
              const shareData = {
                title: 'My Verified Sizes — DripFit',
                text: 'Your body. Mapped. Every brand. Locked. — dripfitcheck.com',
                url: window.location.href,
              };
              if (navigator.share) {
                try { await navigator.share(shareData); } catch {}
              } else {
                await navigator.clipboard.writeText(window.location.href);
                const { toast } = await import('sonner');
                toast('Link copied');
              }
            }}
          >
            <Share2 className="h-5 w-5" style={{ color: '#D4AE2A' }} />
          </Button>
        </div>

        {/* Category pills */}
        <ScrollFadeRow className="mb-1.5">
          {CATEGORY_PILLS.map(c => (
            <button
              key={c.value}
              onClick={() => setSelectedCategory(c.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all min-h-[32px] backdrop-blur-sm border',
                selectedCategory === c.value
                  ? 'bg-primary/10 border-primary/25 text-primary'
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8'
              )}
            >
              {c.label}
            </button>
          ))}
        </ScrollFadeRow>

        {/* Genre style chips */}
        <ScrollFadeRow>
          {GENRE_PILLS.map(g => (
            <button
              key={g.value}
              onClick={() => setSelectedGenre(g.value)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all border min-h-[28px] backdrop-blur-sm',
                selectedGenre === g.value
                  ? 'bg-primary/10 border-primary/25 text-primary'
                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/8'
              )}
            >
              {g.label}
            </button>
          ))}
        </ScrollFadeRow>
      </div>

      {/* Content */}
      <div className="px-4 pt-3">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-white/40">Calculating your sizes…</p>
          </div>
        )}

        {error === 'no_scan' && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-14 w-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Ruler className="h-7 w-7 text-white/30" />
            </div>
            <div>
              <p className="text-base font-bold text-white mb-1">No body scan yet</p>
              <p className="text-[12px] text-white/40 mb-4">
                Complete a body scan first to see your size across every brand.
              </p>
            </div>
            <Button
              className="rounded-xl btn-luxury text-primary-foreground font-bold"
              onClick={() => navigate('/capture')}
            >
              Start Body Scan
            </Button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-white/20" />
            <p className="text-sm text-white/40">
              No brands with size charts for this category yet.
            </p>
          </div>
        )}

        {!loading && !error && brandSizes.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px]">
                {searchQuery.trim() ? (
                  <>
                    <span className="text-white">{filtered.length}</span>
                    <span style={{ color: '#666666' }}> of {brandSizes.length} brands</span>
                  </>
                ) : (
                  <>
                    <span className="text-white">{filtered.length}</span>
                    <span style={{ color: '#666666' }}> of 186 brands verified</span>
                  </>
                )}
                <span style={{ color: '#666666' }}> • {selectedCategory}</span>
              </p>

              {/* View toggle */}
              <div className="flex gap-1">
                {(['brand', 'size'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className="rounded-full px-3 py-1 text-[12px] font-bold capitalize transition-all"
                    style={viewMode === mode
                      ? { backgroundColor: '#C49A00', color: '#000' }
                      : { backgroundColor: 'transparent', color: '#888888', border: '1px solid #2D2D2D' }
                    }
                  >
                    {mode === 'brand' ? 'Brand' : 'Size'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 items-center pb-2" style={{ fontSize: 11, fontFamily: 'DM Sans', color: '#888888', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> High Match</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#666666' }} /> Good Match</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#333333', border: '1px solid #555555' }} /> Near Match</span>
            </div>

            {/* Search bar */}
            <div className="relative mb-3">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#666666' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search brands..."
                className="w-full h-[44px] rounded-full pl-10 pr-10 text-[14px] text-white outline-none transition-colors"
                style={{
                  background: '#1A1A1A',
                  border: '1px solid #2D2D2D',
                  fontFamily: 'DM Sans',
                }}
                onFocus={e => (e.target.style.borderColor = '#D4AE2A')}
                onBlur={e => (e.target.style.borderColor = '#2D2D2D')}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-white/10"
                >
                  <X className="h-3 w-3 text-white/60" />
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-[14px]" style={{ color: '#666666', fontFamily: 'DM Sans' }}>
                  No verified sizes found for &lsquo;{searchQuery}&rsquo;
                </p>
              </div>
            ) : viewMode === 'brand' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <AnimatePresence mode="popLayout">
                {filtered.map((brand, i) => (
                  <motion.div
                    key={`${brand.brandName}-${brand.category}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    className="relative bg-black/30 backdrop-blur-sm rounded-xl border border-white/6 p-3 flex flex-col items-center gap-1.5"
                  >
                    <div className={cn('absolute top-2 right-2 h-1.5 w-1.5 rounded-full', confidenceDot(brand.confidence))} />
                    <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-primary/60 mb-0.5">Your Size</span>
                    {(() => {
                      const parenMatch = brand.size.match(/^([^(]+)\((.+)\)$/);
                      const slashMatch = !parenMatch && brand.size.match(/^(\d+)\/(.+)$/);
                      if (parenMatch) {
                        return (
                          <div className="flex flex-col items-center">
                            <span className="font-display text-2xl text-primary tracking-tight leading-none">{parenMatch[1].trim()}</span>
                            <span className="text-[12px] uppercase tracking-[0.06em]" style={{ fontFamily: 'DM Sans', color: '#888888' }}>{parenMatch[2].trim()}</span>
                          </div>
                        );
                      }
                      if (slashMatch) {
                        return (
                          <div className="flex flex-col items-center">
                            <span className="font-display text-2xl text-primary tracking-tight leading-none">{slashMatch[1]}</span>
                            <span className="text-[12px] uppercase tracking-[0.06em]" style={{ fontFamily: 'DM Sans', color: '#888888' }}>/{slashMatch[2]}</span>
                          </div>
                        );
                      }
                      return <span className="font-display text-2xl text-primary tracking-tight leading-none">{brand.size}</span>;
                    })()}
                    <span className="text-[11px] font-medium text-white/70 text-center leading-tight line-clamp-1">{brand.brandName}</span>
                    <span className="text-[9px] text-white/30 font-medium uppercase tracking-[0.15em]">{brand.genre}</span>
                    <span className={cn('text-[10px]', 
                      brand.confidence >= 0.72 ? 'text-primary/70' : 
                      brand.confidence >= 0.55 ? 'text-amber-400/70' : 'text-muted-foreground/50'
                    )}>
                      {brand.confidence >= 0.72 ? 'High match' : brand.confidence >= 0.55 ? 'Good match' : 'Near Match'}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            ) : (
              /* Size View — grouped by size value */
              <div className="space-y-5">
                {(() => {
                  const groups = new Map<string, BrandSize[]>();
                  for (const b of filtered) {
                    const list = groups.get(b.size) || [];
                    list.push(b);
                    groups.set(b.size, list);
                  }
                  return Array.from(groups.entries())
                    .sort((a, b) => b[1].length - a[1].length)
                    .map(([size, brands]) => (
                      <div key={size}>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-primary" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: '2rem', lineHeight: 1 }}>{size}</span>
                          <span className="text-[12px]" style={{ color: '#888888', fontFamily: 'DM Sans' }}>({brands.length} {brands.length === 1 ? 'brand' : 'brands'})</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {brands.map(b => (
                            <span
                              key={b.brandName}
                              className="rounded-full px-3 py-1 text-[12px]"
                              style={{ fontFamily: 'DM Sans', backgroundColor: '#1A1A1A', border: '1px solid #2D2D2D', color: '#CCCCCC' }}
                            >
                              {b.brandName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ));
                })()}
              </div>
            )}

            {!isSubscribed && (
              <div
                className="mt-4 rounded-2xl p-6 border"
                style={{
                  background: 'linear-gradient(135deg, #1A1A1A 0%, #111008 100%)',
                  borderColor: '#D4AF37',
                }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#D4AE2A', fontFamily: 'DM Sans' }}>
                  Unlock More Brands
                </span>
                <h2 className="mt-1.5 text-white" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: '1.75rem' }}>
                  {filtered.length} of 186 brands.
                </h2>
                <p className="mt-1 text-[13px]" style={{ color: '#888888', fontFamily: 'DM Sans' }}>
                  Premium maps your size across all 186 brands and 389 size charts.
                </p>
                <Button
                  className="w-full mt-4 rounded-full py-3 px-6 font-bold text-black"
                  style={{ backgroundColor: '#C49A00' }}
                  onClick={() => navigate('/premium')}
                >
                  Go Premium →
                </Button>
              </div>
            )}

          </>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
};

export default SizeComparison;
