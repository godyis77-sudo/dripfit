import { useState, useRef, useEffect } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Image, Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Ruler, LogIn, Search, Store, Users, ArrowUpDown, LayoutGrid } from 'lucide-react';
import { getMeasurements } from '@/lib/storage';
import { MeasurementResult, MEASUREMENT_LABELS } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import BottomTabBar from '@/components/BottomTabBar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { isNativePlatform, takeNativePhoto } from '@/lib/nativeCamera';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface SizeBreakdown { measurement: string; userValue: string; chartRange: string; fitsSize: string; fit: 'tight' | 'good' | 'loose'; }
interface SizeRecommendation { recommendedSize: string; confidence: string; breakdown: SizeBreakdown[]; notes: string; alternativeSize?: string; alternativeReason?: string; }
interface BrandOption { brand_name: string; brand_slug: string; category: string; gender?: string; size_type?: string; }
interface DbSizeResult { recommended_size: string; confidence: number; fit_status: string; fit_notes: string; second_option: string | null; all_sizes: { label: string; score: number; fit_status: string }[]; }

const fitColors: Record<string, string> = { tight: 'text-destructive', good: 'text-primary', loose: 'text-accent-foreground' };
const fitLabels: Record<string, string> = { tight: 'Tight', good: 'Good', loose: 'Loose' };
const fitStatusColors: Record<string, string> = { true_to_size: 'text-primary', good_fit: 'text-primary', between_sizes: 'text-white/50', out_of_range: 'text-destructive' };
const fitStatusLabels: Record<string, string> = { true_to_size: 'True to Size', good_fit: 'Good Fit', between_sizes: 'Between Sizes', out_of_range: 'Out of Range' };
const CATEGORY_OPTIONS = ['tops', 'bottoms', 'dresses', 'outerwear', 'activewear', 'footwear'] as const;

function bodyScansToMeasurement(scan: any): MeasurementResult {
  return {
    id: scan.id,
    date: scan.created_at,
    shoulder: Math.round(((scan.shoulder_min + scan.shoulder_max) / 2) * 10) / 10,
    chest: Math.round(((scan.chest_min + scan.chest_max) / 2) * 10) / 10,
    waist: Math.round(((scan.waist_min + scan.waist_max) / 2) * 10) / 10,
    hips: Math.round(((scan.hip_min + scan.hip_max) / 2) * 10) / 10,
    inseam: Math.round(((scan.inseam_min + scan.inseam_max) / 2) * 10) / 10,
    height: scan.height_cm,
    unit: 'cm' as const,
    sizeRecommendation: scan.recommended_size || 'M',
  };
}

const SizeGuide = () => {
  const navigate = useNavigate();
  usePageMeta({ title: 'Size Guide Match', description: 'Find your perfect size across 130+ brands. Upload a size chart or search by brand to get your exact fit.', path: '/size-guide' });
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Shared state
  const [measurements, setMeasurements] = useState<MeasurementResult[]>([]);
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementResult | null>(null);
  const [measurementsLoading, setMeasurementsLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // Upload tab state
  const [brandName, setBrandName] = useState('');
  const [sizeGuideImage, setSizeGuideImage] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Brand picker tab state
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<BrandOption | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('tops');
  const [fitPreference, setFitPreference] = useState<'slim' | 'regular' | 'relaxed'>('regular');
  const [genderFilter, setGenderFilter] = useState<'all' | 'men' | 'women'>('all');
  const [sizeTypeFilter, setSizeTypeFilter] = useState<'all' | 'regular' | 'tall' | 'petite' | 'plus'>('all');
  const [dbResult, setDbResult] = useState<DbSizeResult | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Load measurements
  useEffect(() => {
    const loadMeasurements = async () => {
      setMeasurementsLoading(true);
      try {
        if (user) {
          const { data: scans } = await supabase
            .from('body_scans')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
          if (scans && scans.length > 0) {
            const mapped = scans.map(bodyScansToMeasurement);
            setMeasurements(mapped);
            setSelectedMeasurement(mapped[0]);
            setMeasurementsLoading(false);
            return;
          }
        }
        const local = getMeasurements();
        setMeasurements(local);
        if (local.length > 0) setSelectedMeasurement(local[0]);
      } catch {
        const local = getMeasurements();
        setMeasurements(local);
        if (local.length > 0) setSelectedMeasurement(local[0]);
      } finally {
        setMeasurementsLoading(false);
      }
    };
    if (!authLoading) loadMeasurements();
  }, [user, authLoading]);

  // User's preferred / favorite brands for prioritisation
  const [userBrandNames, setUserBrandNames] = useState<Set<string>>(new Set());

  // Load available brands + user preferences in parallel
  useEffect(() => {
    const loadBrands = async () => {
      setBrandsLoading(true);
      const chartsPromise = supabase
        .from('brand_size_charts')
        .select('brand_name, brand_slug, category, gender, size_type')
        .eq('is_active', true)
        .order('brand_name');

      let prefNames: string[] = [];
      if (user) {
        const [prefRes, favRes] = await Promise.all([
          supabase.from('user_preferred_brands').select('brand_name').eq('user_id', user.id),
          supabase.from('user_favorite_retailers').select('retailer_name').eq('user_id', user.id),
        ]);
        prefNames = [
          ...(prefRes.data?.map(r => r.brand_name) ?? []),
          ...(favRes.data?.map(r => r.retailer_name) ?? []),
        ];
      }
      setUserBrandNames(new Set(prefNames.map(n => n.toLowerCase())));

      const { data } = await chartsPromise;
      if (data) setBrands(data);
      setBrandsLoading(false);
    };
    loadBrands();
  }, [user]);

  // Filter brands by gender and size type before grouping
  const filteredByMeta = brands.filter(b => {
    if (genderFilter !== 'all' && b.gender !== genderFilter && b.gender !== 'unisex') return false;
    if (sizeTypeFilter !== 'all' && b.size_type !== sizeTypeFilter) return false;
    return true;
  });

  // Unique brand names for the picker
  const uniqueBrands = filteredByMeta.reduce<{ name: string; slug: string; categories: string[] }[]>((acc, b) => {
    const existing = acc.find(x => x.slug === b.brand_slug);
    if (existing) {
      if (!existing.categories.includes(b.category)) existing.categories.push(b.category);
    } else {
      acc.push({ name: b.brand_name, slug: b.brand_slug, categories: [b.category] });
    }
    return acc;
  }, []);

  // Sort: user's preferred/favorite brands first
  const sortedUniqueBrands = [...uniqueBrands].sort((a, b) => {
    const aFav = userBrandNames.has(a.name.toLowerCase()) ? 0 : 1;
    const bFav = userBrandNames.has(b.name.toLowerCase()) ? 0 : 1;
    if (aFav !== bFav) return aFav - bFav;
    return a.name.localeCompare(b.name);
  });

  const filteredBrands = brandSearch
    ? sortedUniqueBrands.filter(b => b.name.toLowerCase().includes(brandSearch.toLowerCase()))
    : sortedUniqueBrands;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: 'File too large', description: 'Max 10MB.', variant: 'destructive' }); return; }
    const reader = new FileReader();
    reader.onload = () => { setSizeGuideImage(reader.result as string); setRecommendation(null); setError(null); };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!sizeGuideImage) { toast({ title: 'No image', variant: 'destructive' }); return; }
    if (!selectedMeasurement) { toast({ title: 'No measurements', variant: 'destructive' }); return; }
    setLoading(true); setError(null); setRecommendation(null);
    try {
      const { data: resp, error: fnError } = await supabase.functions.invoke('analyze-size-guide', {
        body: { sizeGuideImage, measurements: { shoulder: selectedMeasurement.shoulder, chest: selectedMeasurement.chest, waist: selectedMeasurement.waist, hips: selectedMeasurement.hips, inseam: selectedMeasurement.inseam, height: selectedMeasurement.height }, brandName: brandName || undefined },
      });
      if (fnError) throw new Error(fnError.message);
      if (resp?.error) throw new Error(resp.error.message || resp.error);
      const payload = resp?.data ?? resp;
      setRecommendation(payload as SizeRecommendation);
    } catch (err: any) { setError(err.message || 'Analysis failed.'); }
    finally { setLoading(false); }
  };

  const handleBrandAnalyze = async () => {
    if (!selectedBrand || !user) return;
    setDbLoading(true); setDbError(null); setDbResult(null);
    try {
      const { data: resp, error: fnError } = await supabase.functions.invoke('get-size-recommendation', {
        body: { user_id: user.id, brand_slug: selectedBrand.brand_slug, category: selectedCategory, fit_preference: fitPreference },
      });
      if (fnError) throw new Error(fnError.message);
      const payload = resp?.data ?? resp;
      if (payload?.fallback || payload?.code === 'NOT_FOUND') {
        throw new Error(`We don't have ${selectedBrand.brand_name} ${selectedCategory} sizing data yet. Try a different category or upload a size chart instead.`);
      }
      if (payload?.error) {
        const msg = payload.error.message || payload.error;
        if (msg.includes('No body scan')) {
          throw new Error('Complete a body scan first to get size recommendations.');
        }
        throw new Error(msg);
      }
      setDbResult(payload as DbSizeResult);
    } catch (err: any) { setDbError(err.message || 'Something went wrong. Please try again.'); }
    finally { setDbLoading(false); }
  };

  const MeasurementSelector = () => (
    <div className="mb-4">
      {measurementsLoading ? (
        <div className="bg-black/30 backdrop-blur-sm border border-white/8 rounded-xl p-3 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-white/40" />
          <p className="text-[13px] text-white/40">Loading measurements…</p>
        </div>
      ) : measurements.length === 0 ? (
        <div className="bg-black/30 backdrop-blur-sm border border-white/8 rounded-xl p-3 text-center">
          <Ruler className="h-6 w-6 text-white/20 mx-auto mb-1.5" />
          <p className="text-[13px] text-white/40 mb-2">No scan data yet</p>
          {!user ? (
            <Button size="sm" className="rounded-lg text-[12px] h-8 bg-white/5 border border-white/10 text-white/70 hover:bg-white/10" onClick={() => navigate('/auth')}>
              <LogIn className="h-3 w-3 mr-1" /> Sign in to see your measurements
            </Button>
          ) : (
            <Button size="sm" className="rounded-lg text-[12px] h-8 btn-luxury" onClick={() => navigate('/capture')}>Start a Scan</Button>
          )}
        </div>
      ) : (
        <>
          <div
            className="rounded-xl cursor-pointer bg-primary/8 backdrop-blur-md border border-primary/20 px-3 py-2.5 flex items-center justify-between"
            onClick={() => setShowPicker(!showPicker)}
          >
            <div>
              <p className="text-sm text-white">{selectedMeasurement ? new Date(selectedMeasurement.date).toLocaleDateString() : 'Select'}</p>
              {selectedMeasurement && <p className="text-[11px] text-white/50">Size {selectedMeasurement.sizeRecommendation} · Chest {selectedMeasurement.chest}"</p>}
            </div>
            {showPicker ? <ChevronUp className="h-3.5 w-3.5 text-primary/60" /> : <ChevronDown className="h-3.5 w-3.5 text-primary/60" />}
          </div>
          <AnimatePresence>{showPicker && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-1.5 mt-1.5 max-h-40 overflow-y-auto">
                {measurements.map(m => (
                  <div
                    key={m.id}
                    className={`rounded-lg cursor-pointer transition-colors p-2 ${selectedMeasurement?.id === m.id ? 'bg-primary/10 border border-primary/25' : 'bg-black/30 border border-white/5 hover:bg-white/5'}`}
                    onClick={() => { setSelectedMeasurement(m); setShowPicker(false); setRecommendation(null); setDbResult(null); }}
                  >
                    <p className="text-[11px] font-medium text-white">{new Date(m.date).toLocaleDateString()}</p>
                    <p className="text-[10px] text-white/40">Size {m.sizeRecommendation}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}</AnimatePresence>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px] bg-white/5 border border-white/10 backdrop-blur-sm" aria-label="Go back"><ArrowLeft className="h-5 w-5 text-white/70" /></Button>
          <h1 className="font-display text-lg text-white uppercase">Your Verified Size</h1>
          <div className="w-10" />
        </div>

        {/* PASTE A LINK section */}
        <div className="mb-4">
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/30 font-medium mb-1.5">Paste a Link</p>
          <div className="flex items-center gap-1.5 mb-1">
            <Store className="h-3 w-3 text-white/30" />
            <p className="text-[11px] text-white/30 font-medium">Paste product link</p>
          </div>
          <input
            placeholder="https://zara.com/product/..."
            className="w-full bg-transparent border-b border-white/15 py-2 text-[12px] text-white placeholder:text-white/20 outline-none focus:border-primary/30 transition-colors"
          />
        </div>

        {/* OR separator */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-[11px] text-white/30 tracking-[0.15em] uppercase px-1">Or</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {/* BROWSE BY BRAND section */}
        <p className="text-[10px] tracking-[0.15em] uppercase text-white/30 font-medium mb-2">Browse by Brand</p>
        <Tabs defaultValue="brand" className="mb-4">
          <TabsList className="w-full grid grid-cols-2 mb-3 bg-white/5 border border-white/10 backdrop-blur-sm p-0.5 rounded-lg">
            <TabsTrigger value="brand" className="text-[12px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-white/40 rounded-md border border-transparent transition-all"><Store className="h-3.5 w-3.5 mr-1" />Pick a Brand</TabsTrigger>
            <TabsTrigger value="upload" className="text-[12px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-white/40 rounded-md border border-transparent transition-all opacity-50 data-[state=inactive]:opacity-40"><Camera className="h-3.5 w-3.5 mr-1" />Upload Chart</TabsTrigger>
          </TabsList>

          {/* ─── BRAND PICKER TAB ─── */}
          <TabsContent value="brand">
            {!user ? (
              <div className="bg-black/30 backdrop-blur-sm border border-white/8 rounded-xl p-4 text-center">
                <Store className="h-6 w-6 text-white/20 mx-auto mb-1.5" />
                <p className="text-[13px] text-white/40 mb-2">Sign in to get instant size recommendations</p>
                <Button size="sm" className="rounded-lg text-[12px] h-8 bg-white/5 border border-white/10 text-white/70 hover:bg-white/10" onClick={() => navigate('/auth')}>
                  <LogIn className="h-3 w-3 mr-1" /> Sign In
                </Button>
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="mb-3 space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1 flex items-center gap-1"><Users className="h-3 w-3" /> Gender</p>
                    <div className="flex gap-1.5">
                      {(['all', 'men', 'women'] as const).map(g => (
                        <button
                          key={g}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold capitalize transition-all min-h-[32px] backdrop-blur-sm border ${
                            genderFilter === g
                              ? 'bg-primary/10 border-primary/25 text-primary'
                              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8'
                          }`}
                          onClick={() => { setGenderFilter(g); setSelectedBrand(null); setDbResult(null); }}
                        >{g === 'all' ? 'All' : g}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1 flex items-center gap-1"><ArrowUpDown className="h-3 w-3" /> Size Range</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {(['all', 'regular', 'tall', 'petite', 'plus'] as const).map(t => (
                        <button
                          key={t}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold capitalize transition-all min-h-[32px] backdrop-blur-sm border ${
                            sizeTypeFilter === t
                              ? 'bg-primary/10 border-primary/25 text-primary'
                              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8'
                          }`}
                          onClick={() => { setSizeTypeFilter(t); setSelectedBrand(null); setDbResult(null); }}
                        >{t === 'all' ? 'All' : t}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Brand search */}
                <div className="mb-3">
                  {/* Progress indicator */}
                  <div className="flex items-center gap-2 mb-3">
                    {[
                      { n: 1, label: 'Brand', active: true },
                      { n: 2, label: 'Category', active: !!selectedBrand },
                      { n: 3, label: 'Your Size', active: !!dbResult },
                    ].map((step, i) => (
                      <div key={step.n} className="flex items-center gap-1.5">
                        {i > 0 && <div className={cn('w-4 h-px', step.active ? 'bg-primary/40' : 'bg-white/10')} />}
                        <div className={cn(
                          'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                          step.active ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-white/30'
                        )}>{step.n}</div>
                        <span className={cn('text-[10px] font-medium', step.active ? 'text-primary' : 'text-white/30')}>{step.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="relative mb-2">
                    <Search className="absolute left-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                    <input
                      placeholder="Search brands…"
                      value={brandSearch}
                      onChange={e => { setBrandSearch(e.target.value); setSelectedBrand(null); setDbResult(null); }}
                      className="w-full bg-transparent border-b border-white/15 pl-6 py-2 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-primary/30 transition-colors"
                    />
                  </div>
                  {brandsLoading ? (
                    <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-white/40" /></div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-0">
                      {filteredBrands.length === 0 ? (
                        <p className="text-[12px] text-white/30 text-center py-2">No brands found. Try uploading a chart instead.</p>
                      ) : filteredBrands.map(b => (
                        <button
                          key={b.slug}
                          className={`w-full text-left px-3 py-2.5 flex items-center justify-between transition-colors border-b border-white/5 ${
                            selectedBrand?.brand_slug === b.slug
                              ? 'bg-primary/10 backdrop-blur-sm'
                              : 'bg-black/30 backdrop-blur-sm hover:bg-white/5'
                          }`}
                          onClick={() => { setSelectedBrand({ brand_name: b.name, brand_slug: b.slug, category: b.categories[0] }); setDbResult(null); setDbError(null); setSelectedCategory(b.categories[0]); }}
                        >
                          <div className="flex items-center gap-1.5">
                            {userBrandNames.has(b.name.toLowerCase()) && <span className="text-[10px]">⭐</span>}
                            <p className="text-sm font-medium text-white">{b.name}</p>
                          </div>
                          <p className="text-[11px] text-white/30">{b.categories.length} {b.categories.length === 1 ? 'category' : 'categories'}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category selector */}
                {selectedBrand && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-1.5">2. Category</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_OPTIONS.filter(c => {
                        const b = uniqueBrands.find(x => x.slug === selectedBrand.brand_slug);
                        return b?.categories.includes(c);
                      }).map(c => (
                        <button
                          key={c}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold capitalize transition-all min-h-[32px] backdrop-blur-sm border ${
                            selectedCategory === c
                              ? 'bg-primary/10 border-primary/25 text-primary'
                              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/8'
                          }`}
                          onClick={() => { setSelectedCategory(c); setDbResult(null); }}
                        >{c}</button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Measurement selector */}
                {selectedBrand && (
                  <div className="mb-3">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-1.5">3. Your measurements</p>
                    <MeasurementSelector />
                  </div>
                )}

                {/* Fit preference */}
                {selectedBrand && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-1.5">4. Fit preference</p>
                    <div className="flex rounded-lg bg-black/30 backdrop-blur-sm border border-white/8 overflow-hidden p-0.5 gap-0.5" role="radiogroup" aria-label="Fit preference">
                      {(['slim', 'regular', 'relaxed'] as const).map(fit => (
                        <button
                          key={fit}
                          role="radio"
                          aria-checked={fitPreference === fit}
                          className={`flex-1 py-2 text-[12px] font-medium capitalize transition-all min-h-[44px] rounded-md ${
                            fitPreference === fit
                              ? 'bg-primary/10 border border-primary/25 text-primary'
                              : 'text-white/50 hover:bg-white/5 border border-transparent'
                          }`}
                          onClick={() => { setFitPreference(fit); setDbResult(null); }}
                        >{fit}</button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Analyze button — ONLY solid gold element */}
                {selectedBrand && (
                  <Button
                    className="w-full h-11 rounded-lg btn-luxury font-bold text-[14px] mb-4"
                    disabled={!selectedMeasurement || dbLoading}
                    onClick={handleBrandAnalyze}
                  >
                    {dbLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…</> : `Get My ${selectedBrand.brand_name} Size`}
                  </Button>
                )}

                {/* DB Error */}
                {dbError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="rounded-xl bg-black/30 backdrop-blur-sm border border-destructive/20 mb-3 p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-[13px] text-destructive">{dbError}</p>
                    </div>
                  </motion.div>
                )}

                {/* DB Result */}
                <AnimatePresence>{dbResult && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {/* Size result card — glass-gold */}
                    <div className="rounded-xl mb-3 bg-primary/8 backdrop-blur-md border border-primary/20 p-4 text-center">
                      <CheckCircle2 className="h-7 w-7 text-primary mx-auto mb-1.5" />
                      <p className="text-[11px] text-white/60 tracking-wide mb-0.5">{selectedBrand?.brand_name} · {selectedCategory}</p>
                      <p className="font-display text-4xl text-primary mb-0.5">{dbResult.recommended_size}</p>
                      <p className={`text-[11px] font-semibold capitalize ${fitStatusColors[dbResult.fit_status] || 'text-white/50'}`}>
                        {fitStatusLabels[dbResult.fit_status] || dbResult.fit_status} · {Math.round(dbResult.confidence * 100)}% match
                      </p>
                    </div>

                    {/* Fit notes — glass-dark */}
                    {dbResult.fit_notes && (
                      <div className="rounded-xl mb-3 bg-black/30 backdrop-blur-sm border border-white/8 p-3">
                        <p className="text-[13px] text-white/70">{dbResult.fit_notes}</p>
                      </div>
                    )}

                    {/* Alternative */}
                    {dbResult.second_option && (
                      <div className="rounded-xl mb-3 bg-black/30 backdrop-blur-sm border border-white/8 p-3">
                        <p className="text-[10px] text-white/30 mb-0.5">Alternative</p>
                        <p className="text-[13px] text-white"><span className="font-bold">{dbResult.second_option}</span> — also a good option</p>
                      </div>
                    )}

                    {/* All Sizes — glass-dark */}
                    {dbResult.all_sizes?.length > 0 && (
                      <div className="rounded-xl mb-3 bg-black/30 backdrop-blur-sm border border-white/8 p-3">
                        <p className="text-[10px] text-white/30 mb-1.5">All Sizes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {dbResult.all_sizes.map(s => (
                            <span
                              key={s.label}
                              className={`text-[11px] px-2 py-0.5 rounded-md border backdrop-blur-sm ${
                                s.label === dbResult.recommended_size
                                  ? 'bg-primary/10 border-primary/25 text-primary font-bold'
                                  : 'bg-white/5 border-white/10 text-white/50'
                              }`}
                            >
                              {s.label} <span className="font-display">{Math.round(s.score * 100)}%</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}</AnimatePresence>
              </>
            )}
          </TabsContent>

          {/* ─── UPLOAD TAB ─── */}
          <TabsContent value="upload">
            <div className="mb-4">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-1.5">1. Upload size chart</p>
              <input
                placeholder="Brand name (optional)"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                className="w-full bg-transparent border-b border-white/15 py-2 mb-2 text-[13px] text-white placeholder:text-white/20 outline-none focus:border-primary/30 transition-colors"
              />
              {sizeGuideImage ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                  <img src={sizeGuideImage} alt="Size guide" className="w-full rounded-xl border border-white/10" />
                  <Button variant="secondary" size="sm" className="absolute top-1.5 right-1.5 rounded-lg h-7 text-[11px] bg-black/60 backdrop-blur-sm border border-white/10 text-white/70" onClick={() => { setSizeGuideImage(null); setRecommendation(null); }}>Change</Button>
                </motion.div>
              ) : (
                <div className="flex gap-2">
                  <button className="flex-1 h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/8 transition-colors" onClick={async () => {
                    if (isNativePlatform()) { try { const { dataUrl } = await takeNativePhoto('gallery'); setSizeGuideImage(dataUrl); setRecommendation(null); setError(null); } catch {} return; }
                    fileInputRef.current?.click();
                  }}>
                    <Image className="h-4 w-4 text-white/40" /><span className="text-[11px] text-white/40">Gallery</span>
                  </button>
                  <button className="flex-1 h-20 rounded-xl flex flex-col items-center justify-center gap-1.5 bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/8 transition-colors" onClick={async () => {
                    if (isNativePlatform()) { try { const { dataUrl } = await takeNativePhoto('camera'); setSizeGuideImage(dataUrl); setRecommendation(null); setError(null); } catch {} return; }
                    cameraInputRef.current?.click();
                  }}>
                    <Camera className="h-4 w-4 text-white/40" /><span className="text-[11px] text-white/40">Camera</span>
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
            </div>

            <div className="mb-4">
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-1.5">2. Select measurements</p>
              <MeasurementSelector />
            </div>

            <Button className="w-full h-11 rounded-lg btn-luxury font-bold text-[14px] mb-4" disabled={!sizeGuideImage || !selectedMeasurement || loading} onClick={handleAnalyze}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</> : 'Get My Size'}
            </Button>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="rounded-xl bg-black/30 backdrop-blur-sm border border-destructive/20 mb-3 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-[13px] text-destructive">{error}</p>
                </div>
              </motion.div>
            )}

            <AnimatePresence>{recommendation && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="rounded-xl mb-3 bg-primary/8 backdrop-blur-md border border-primary/20 p-4 text-center">
                  <CheckCircle2 className="h-7 w-7 text-primary mx-auto mb-1.5" />
                  <p className="text-[11px] text-white/60 tracking-wide mb-0.5">{brandName ? `${brandName} — ` : ''}Recommended</p>
                  <p className="font-display text-4xl text-primary mb-0.5">{recommendation.recommendedSize}</p>
                  <p className="text-[11px] font-semibold text-white/50 capitalize">Confidence: {recommendation.confidence}</p>
                </div>

                {recommendation.notes && (
                  <div className="rounded-xl mb-3 bg-black/30 backdrop-blur-sm border border-white/8 p-3">
                    <p className="text-[13px] text-white/70">{recommendation.notes}</p>
                  </div>
                )}
                {recommendation.alternativeSize && (
                  <div className="rounded-xl mb-3 bg-black/30 backdrop-blur-sm border border-white/8 p-3">
                    <p className="text-[10px] text-white/30 mb-0.5">Alternative</p>
                    <p className="text-[13px] text-white"><span className="font-bold">{recommendation.alternativeSize}</span>{recommendation.alternativeReason && ` — ${recommendation.alternativeReason}`}</p>
                  </div>
                )}

                {recommendation.breakdown?.length > 0 && (
                  <>
                    <button
                      className="w-full mb-1.5 text-[12px] flex items-center justify-center gap-1 py-2 bg-white/5 border border-white/10 backdrop-blur-sm rounded-lg text-white/60 hover:bg-white/8 transition-colors"
                      onClick={() => setShowBreakdown(!showBreakdown)}
                    >
                      {showBreakdown ? 'Hide' : 'Show'} Breakdown {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    <AnimatePresence>{showBreakdown && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="space-y-1.5">
                          {recommendation.breakdown.map((b, i) => (
                            <div key={i} className="bg-black/30 backdrop-blur-sm border border-white/8 rounded-lg p-2.5 flex items-center justify-between">
                              <div>
                                <p className="text-[12px] font-medium text-white">{b.measurement}</p>
                                <p className="text-[10px] text-white/40">You: {b.userValue} · Chart: {b.chartRange}</p>
                              </div>
                              <span className={`text-[11px] font-medium ${fitColors[b.fit] || 'text-white/50'}`}>{fitLabels[b.fit] || b.fit}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}</AnimatePresence>
                  </>
                )}
              </motion.div>
            )}</AnimatePresence>
          </TabsContent>
        </Tabs>

        {/* My Size Every Brand — glass-gold secondary */}
        <button
          className="w-full h-11 rounded-xl bg-primary/8 backdrop-blur-md border border-primary/20 text-primary text-sm tracking-wide uppercase font-semibold flex items-center justify-center gap-1.5 mt-4 active:scale-[0.98] transition-transform"
          onClick={() => navigate('/my-sizes')}
        >
          <LayoutGrid className="h-4 w-4" /> My Size Every Brand
        </button>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default SizeGuide;
