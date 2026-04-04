import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Ruler, Share2, Loader2, AlertTriangle, Filter } from 'lucide-react';
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

/** Map a pill value to all matching brand_size_charts categories */
const CATEGORY_MAPPING: Record<string, string[]> = {
  tops: ['tops', 'hoodies', 'fleece', 'knitwear'],
  bottoms: ['bottoms', 'jeans', 'shorts'],
  dresses: ['dresses', 'jumpsuits'],
  outerwear: ['outerwear', 'blazers', 'suits'],
  activewear: ['activewear', 'sports-bras'],
  swimwear: ['swimwear'],
};

const SizeComparison = () => {
  usePageMeta({
    title: 'My Size Everywhere',
    description: 'See your exact size across 100+ brands at a glance. Never guess your size again.',
    path: '/my-sizes',
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [brandSizes, setBrandSizes] = useState<BrandSize[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<BrandGenre | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState('tops');

  useEffect(() => {
    if (!user) return;
    loadSizes();
  }, [user, selectedCategory]);

  const loadSizes = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get latest scan
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

      // 2. Get all brand size charts for selected category group
      const categoryGroup = CATEGORY_MAPPING[selectedCategory] || [selectedCategory];
      const { data: charts } = await supabase
        .from('brand_size_charts')
        .select('id, brand_name, brand_slug, gender, category, size_data')
        .in('category', categoryGroup)
        .eq('is_active', true);

      if (!charts || charts.length === 0) {
        setBrandSizes([]);
        setLoading(false);
        return;
      }

      const fit = getFitPreference() as FitPreference || 'regular';

      // 4. Score each brand using the same chart-aware logic as the main recommendation engine
      const results: BrandSize[] = [];

      for (const chart of charts) {
        const sizeData = chart.size_data as any[];
        if (!sizeData || sizeData.length === 0) continue;

        const recommendation = recommendInlineChartSize(sizeData, measurements, fit, chart.category);
        if (recommendation && recommendation.confidence > 0.2) {
          results.push({
            brandName: chart.brand_name,
            brandSlug: chart.brand_slug,
            category: chart.category,
            gender: chart.gender,
            size: recommendation.size,
            confidence: recommendation.confidence,
            genre: getBrandGenre(chart.brand_name) || 'Casual',
          });
        }
      }

      // Deduplicate by brand (keep highest confidence)
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
    if (selectedGenre === 'all') return brandSizes;
    return brandSizes.filter(b => b.genre === selectedGenre);
  }, [brandSizes, selectedGenre]);

  const confidenceColor = (c: number) => {
    if (c >= 0.72) return 'text-green-400';
    if (c >= 0.55) return 'text-amber-400';
    return 'text-red-400';
  };

  const confidenceDot = (c: number) => {
    if (c >= 0.72) return 'bg-green-400';
    if (c >= 0.55) return 'bg-amber-400';
    return 'bg-red-400';
  };

  return (
    <div className="min-h-screen bg-background pb-safe-tab">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-black tracking-tight text-foreground">MY SIZE EVERYWHERE</h1>
            <p className="text-[11px] text-muted-foreground">Your size across every brand</p>
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-2">
          {CATEGORY_PILLS.map(c => (
            <button
              key={c.value}
              onClick={() => setSelectedCategory(c.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all min-h-[32px]',
                selectedCategory === c.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Genre filter */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {GENRE_PILLS.map(g => (
            <button
              key={g.value}
              onClick={() => setSelectedGenre(g.value)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all border min-h-[28px]',
                selectedGenre === g.value
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border/50 text-muted-foreground'
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Calculating your sizes…</p>
          </div>
        )}

        {error === 'no_scan' && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Ruler className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <p className="text-base font-bold text-foreground mb-1">No body scan yet</p>
              <p className="text-[12px] text-muted-foreground mb-4">
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
            <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No brands with size charts for this category yet.
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <p className="text-[11px] text-muted-foreground mb-3">
              {filtered.length} brand{filtered.length !== 1 ? 's' : ''} • {selectedCategory}
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <AnimatePresence mode="popLayout">
                {filtered.map((brand, i) => (
                  <motion.div
                    key={`${brand.brandName}-${brand.category}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.02, duration: 0.2 }}
                    className="relative bg-card rounded-xl border border-border/50 p-3 flex flex-col items-center gap-1.5"
                  >
                    {/* Confidence dot */}
                    <div className={cn('absolute top-2 right-2 h-1.5 w-1.5 rounded-full', confidenceDot(brand.confidence))} />

                    {/* Size */}
                    <span className="text-2xl font-black text-foreground tracking-tight leading-none">
                      {brand.size}
                    </span>

                    {/* Brand name */}
                    <span className="text-[11px] font-bold text-foreground/80 text-center leading-tight line-clamp-1">
                      {brand.brandName}
                    </span>

                    {/* Genre tag */}
                    <span className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-wider">
                      {brand.genre}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-6 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-[10px] text-muted-foreground">High match</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-[10px] text-muted-foreground">Good match</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-[10px] text-muted-foreground">Approximate</span>
              </div>
            </div>
          </>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
};

export default SizeComparison;
