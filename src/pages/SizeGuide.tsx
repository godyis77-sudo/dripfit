import { useState, useRef, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Image, Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Ruler, LogIn, Search, Store } from 'lucide-react';
import { getMeasurements } from '@/lib/storage';
import { MeasurementResult, MEASUREMENT_LABELS } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import BottomTabBar from '@/components/BottomTabBar';
import { useToast } from '@/hooks/use-toast';
import { isNativePlatform, takeNativePhoto } from '@/lib/nativeCamera';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface SizeBreakdown { measurement: string; userValue: string; chartRange: string; fitsSize: string; fit: 'tight' | 'good' | 'loose'; }
interface SizeRecommendation { recommendedSize: string; confidence: string; breakdown: SizeBreakdown[]; notes: string; alternativeSize?: string; alternativeReason?: string; }
interface BrandOption { brand_name: string; brand_slug: string; category: string; }
interface DbSizeResult { recommended_size: string; confidence: number; fit_status: string; fit_notes: string; second_option: string | null; all_sizes: { label: string; score: number; fit_status: string }[]; }

const fitColors: Record<string, string> = { tight: 'text-orange-500', good: 'text-green-500', loose: 'text-blue-500' };
const fitLabels: Record<string, string> = { tight: 'Tight', good: 'Good', loose: 'Loose' };
const fitStatusColors: Record<string, string> = { true_to_size: 'text-green-500', good_fit: 'text-green-400', between_sizes: 'text-amber-500', out_of_range: 'text-red-400' };
const fitStatusLabels: Record<string, string> = { true_to_size: 'True to Size', good_fit: 'Good Fit', between_sizes: 'Between Sizes', out_of_range: 'Out of Range' };
const CATEGORY_OPTIONS = ['tops', 'bottoms', 'dresses', 'outerwear', 'activewear'] as const;

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
  usePageTitle('Size Guide Match');
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
        .select('brand_name, brand_slug, category')
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

  // Unique brand names for the picker
  const uniqueBrands = brands.reduce<{ name: string; slug: string; categories: string[] }[]>((acc, b) => {
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
      if (resp?.error) throw new Error(resp.error.message || resp.error);
      const payload = resp?.data ?? resp;
      setDbResult(payload as DbSizeResult);
    } catch (err: any) { setDbError(err.message || 'Failed to get recommendation.'); }
    finally { setDbLoading(false); }
  };

  const MeasurementSelector = () => (
    <div className="mb-4">
      <p className="section-label mb-1.5">Select measurements</p>
      {measurementsLoading ? (
        <Card className="rounded-xl"><CardContent className="p-3 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground">Loading measurements…</p>
        </CardContent></Card>
      ) : measurements.length === 0 ? (
        <Card className="rounded-xl"><CardContent className="p-3 text-center">
          <Ruler className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1.5" />
          <p className="text-[13px] text-muted-foreground mb-2">No scan data yet</p>
          {!user ? (
            <Button size="sm" className="rounded-lg text-[12px] h-8" onClick={() => navigate('/auth')}>
              <LogIn className="h-3 w-3 mr-1" /> Sign in to see your measurements
            </Button>
          ) : (
            <Button size="sm" className="rounded-lg text-[12px] h-8" onClick={() => navigate('/capture')}>Start a Scan</Button>
          )}
        </CardContent></Card>
      ) : (
        <>
          <Card className="rounded-xl cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setShowPicker(!showPicker)}>
            <CardContent className="p-2.5 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-foreground">{selectedMeasurement ? new Date(selectedMeasurement.date).toLocaleDateString() : 'Select'}</p>
                {selectedMeasurement && <p className="text-[11px] text-muted-foreground">Size {selectedMeasurement.sizeRecommendation} · Chest {selectedMeasurement.chest}"</p>}
              </div>
              {showPicker ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </CardContent>
          </Card>
          <AnimatePresence>{showPicker && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="space-y-1.5 mt-1.5 max-h-40 overflow-y-auto">
                {measurements.map(m => (
                  <Card key={m.id} className={`rounded-lg cursor-pointer transition-colors ${selectedMeasurement?.id === m.id ? 'border-primary' : 'hover:border-primary/30'}`} onClick={() => { setSelectedMeasurement(m); setShowPicker(false); setRecommendation(null); setDbResult(null); }}>
                    <CardContent className="p-2"><p className="text-[11px] font-medium text-foreground">{new Date(m.date).toLocaleDateString()}</p><p className="text-[10px] text-muted-foreground">Size {m.sizeRecommendation}</p></CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}</AnimatePresence>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-bottom">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg" aria-label="Go back"><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-base font-bold text-foreground">Size Guide Match</h1>
          <div className="w-8" />
        </div>

        <Tabs defaultValue="brand" className="mb-4">
          <TabsList className="w-full grid grid-cols-2 mb-3">
            <TabsTrigger value="brand" className="text-[12px]"><Store className="h-3.5 w-3.5 mr-1" />Pick a Brand</TabsTrigger>
            <TabsTrigger value="upload" className="text-[12px]"><Camera className="h-3.5 w-3.5 mr-1" />Upload Chart</TabsTrigger>
          </TabsList>

          {/* ─── BRAND PICKER TAB ─── */}
          <TabsContent value="brand">
            {!user ? (
              <Card className="rounded-xl"><CardContent className="p-4 text-center">
                <Store className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1.5" />
                <p className="text-[13px] text-muted-foreground mb-2">Sign in to get instant size recommendations</p>
                <Button size="sm" className="rounded-lg text-[12px] h-8" onClick={() => navigate('/auth')}>
                  <LogIn className="h-3 w-3 mr-1" /> Sign In
                </Button>
              </CardContent></Card>
            ) : (
              <>
                {/* Brand search */}
                <div className="mb-3">
                  <p className="section-label mb-1.5">1. Choose a brand</p>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search brands…"
                      value={brandSearch}
                      onChange={e => { setBrandSearch(e.target.value); setSelectedBrand(null); setDbResult(null); }}
                      className="pl-8 rounded-lg h-9 text-[13px]"
                    />
                  </div>
                  {brandsLoading ? (
                    <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {filteredBrands.length === 0 ? (
                        <p className="text-[12px] text-muted-foreground text-center py-2">No brands found. Try uploading a chart instead.</p>
                      ) : filteredBrands.map(b => (
                        <Card
                          key={b.slug}
                          className={`rounded-lg cursor-pointer transition-colors ${selectedBrand?.brand_slug === b.slug ? 'border-primary bg-primary/5' : 'hover:border-primary/30'}`}
                          onClick={() => { setSelectedBrand({ brand_name: b.name, brand_slug: b.slug, category: b.categories[0] }); setDbResult(null); setDbError(null); if (b.categories.length === 1) setSelectedCategory(b.categories[0]); }}
                        >
                          <CardContent className="p-2 flex items-center justify-between">
                            <p className="text-[13px] font-medium text-foreground">{b.name}</p>
                            <p className="text-[10px] text-muted-foreground">{b.categories.length} {b.categories.length === 1 ? 'category' : 'categories'}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category selector */}
                {selectedBrand && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
                    <p className="section-label mb-1.5">2. Category</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORY_OPTIONS.filter(c => {
                        const b = uniqueBrands.find(x => x.slug === selectedBrand.brand_slug);
                        return b?.categories.includes(c);
                      }).map(c => (
                        <Button
                          key={c}
                          variant={selectedCategory === c ? 'default' : 'outline'}
                          size="sm"
                          className="rounded-lg text-[11px] h-7 capitalize"
                          onClick={() => { setSelectedCategory(c); setDbResult(null); }}
                        >{c}</Button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Measurement selector */}
                {selectedBrand && (
                  <div className="mb-3">
                    <p className="section-label mb-1.5">3. Your measurements</p>
                    <MeasurementSelector />
                  </div>
                )}

                {/* Fit preference */}
                {selectedBrand && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-3">
                    <p className="section-label mb-1.5">4. Fit preference</p>
                    <div className="flex rounded-lg border border-border overflow-hidden" role="radiogroup" aria-label="Fit preference">
                      {(['slim', 'regular', 'relaxed'] as const).map(fit => (
                        <button
                          key={fit}
                          role="radio"
                          aria-checked={fitPreference === fit}
                          className={`flex-1 py-2 text-[12px] font-medium capitalize transition-colors min-h-[44px] ${fitPreference === fit ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                          onClick={() => { setFitPreference(fit); setDbResult(null); }}
                        >{fit}</button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Analyze button */}
                {selectedBrand && (
                  <Button
                    className="w-full h-11 rounded-lg btn-3d-drip font-bold text-[14px] mb-4"
                    disabled={!selectedMeasurement || dbLoading}
                    onClick={handleBrandAnalyze}
                  >
                    {dbLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…</> : `Get My ${selectedBrand.brand_name} Size`}
                  </Button>
                )}

                {/* DB Error */}
                {dbError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="rounded-xl border-destructive/30 mb-3"><CardContent className="p-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-[13px] text-destructive">{dbError}</p>
                    </CardContent></Card>
                  </motion.div>
                )}

                {/* DB Result */}
                <AnimatePresence>{dbResult && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card className="rounded-xl mb-3 bg-primary/5 border-primary/20">
                      <CardContent className="p-4 text-center">
                        <CheckCircle2 className="h-7 w-7 text-primary mx-auto mb-1.5" />
                        <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">{selectedBrand?.brand_name} · {selectedCategory}</p>
                        <p className="text-4xl font-bold text-primary mb-0.5">{dbResult.recommended_size}</p>
                        <p className={`text-[11px] font-semibold capitalize ${fitStatusColors[dbResult.fit_status] || 'text-muted-foreground'}`}>
                          {fitStatusLabels[dbResult.fit_status] || dbResult.fit_status} · {Math.round(dbResult.confidence * 100)}% match
                        </p>
                      </CardContent>
                    </Card>

                    {dbResult.fit_notes && (
                      <Card className="rounded-xl mb-3"><CardContent className="p-3">
                        <p className="text-[13px] text-foreground/80">{dbResult.fit_notes}</p>
                      </CardContent></Card>
                    )}

                    {dbResult.second_option && (
                      <Card className="rounded-xl mb-3"><CardContent className="p-3">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Alternative</p>
                        <p className="text-[13px] text-foreground"><span className="font-bold">{dbResult.second_option}</span> — also a good option</p>
                      </CardContent></Card>
                    )}

                    {dbResult.all_sizes?.length > 0 && (
                      <Card className="rounded-xl mb-3"><CardContent className="p-3">
                        <p className="text-[10px] text-muted-foreground mb-1.5">All Sizes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {dbResult.all_sizes.map(s => (
                            <span
                              key={s.label}
                              className={`text-[11px] px-2 py-0.5 rounded-md border ${s.label === dbResult.recommended_size ? 'bg-primary/10 border-primary text-primary font-bold' : 'border-border text-muted-foreground'}`}
                            >
                              {s.label} <span className="text-[9px]">{Math.round(s.score * 100)}%</span>
                            </span>
                          ))}
                        </div>
                      </CardContent></Card>
                    )}
                  </motion.div>
                )}</AnimatePresence>
              </>
            )}
          </TabsContent>

          {/* ─── UPLOAD TAB ─── */}
          <TabsContent value="upload">
            <div className="mb-4">
              <p className="section-label mb-1.5">1. Upload size chart</p>
              <Input placeholder="Brand name (optional)" value={brandName} onChange={e => setBrandName(e.target.value)} className="mb-2 rounded-lg h-9 text-[13px]" />
              {sizeGuideImage ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                  <img src={sizeGuideImage} alt="Size guide" className="w-full rounded-xl border border-border" />
                  <Button variant="secondary" size="sm" className="absolute top-1.5 right-1.5 rounded-lg h-7 text-[11px]" onClick={() => { setSizeGuideImage(null); setRecommendation(null); }}>Change</Button>
                </motion.div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-20 rounded-xl flex-col gap-1.5" onClick={async () => {
                    if (isNativePlatform()) { try { const { dataUrl } = await takeNativePhoto('gallery'); setSizeGuideImage(dataUrl); setRecommendation(null); setError(null); } catch {} return; }
                    fileInputRef.current?.click();
                  }}>
                    <Image className="h-4 w-4 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Gallery</span>
                  </Button>
                  <Button variant="outline" className="flex-1 h-20 rounded-xl flex-col gap-1.5" onClick={async () => {
                    if (isNativePlatform()) { try { const { dataUrl } = await takeNativePhoto('camera'); setSizeGuideImage(dataUrl); setRecommendation(null); setError(null); } catch {} return; }
                    cameraInputRef.current?.click();
                  }}>
                    <Camera className="h-4 w-4 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Camera</span>
                  </Button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
            </div>

            <div className="mb-4">
              <p className="section-label mb-1.5">2. Select measurements</p>
              <MeasurementSelector />
            </div>

            <Button className="w-full h-11 rounded-lg btn-3d-drip font-bold text-[14px] mb-4" disabled={!sizeGuideImage || !selectedMeasurement || loading} onClick={handleAnalyze}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</> : 'Get My Size'}
            </Button>

            {error && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Card className="rounded-xl border-destructive/30 mb-3"><CardContent className="p-3 flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" /><p className="text-[13px] text-destructive">{error}</p></CardContent></Card></motion.div>)}

            <AnimatePresence>{recommendation && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className="rounded-xl mb-3 bg-primary/5 border-primary/20">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="h-7 w-7 text-primary mx-auto mb-1.5" />
                    <p className="text-[11px] font-semibold text-muted-foreground mb-0.5">{brandName ? `${brandName} — ` : ''}Recommended</p>
                    <p className="text-4xl font-bold text-primary mb-0.5">{recommendation.recommendedSize}</p>
                    <p className="text-[11px] font-semibold text-muted-foreground capitalize">Confidence: {recommendation.confidence}</p>
                  </CardContent>
                </Card>

                {recommendation.notes && <Card className="rounded-xl mb-3"><CardContent className="p-3"><p className="text-[13px] text-foreground/80">{recommendation.notes}</p></CardContent></Card>}
                {recommendation.alternativeSize && <Card className="rounded-xl mb-3"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground mb-0.5">Alternative</p><p className="text-[13px] text-foreground"><span className="font-bold">{recommendation.alternativeSize}</span>{recommendation.alternativeReason && ` — ${recommendation.alternativeReason}`}</p></CardContent></Card>}

                {recommendation.breakdown?.length > 0 && (
                  <>
                    <Button variant="ghost" className="w-full mb-1.5 text-muted-foreground text-[12px]" onClick={() => setShowBreakdown(!showBreakdown)}>
                      {showBreakdown ? 'Hide' : 'Show'} Breakdown {showBreakdown ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
                    </Button>
                    <AnimatePresence>{showBreakdown && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="space-y-1.5">
                          {recommendation.breakdown.map((b, i) => (
                            <Card key={i} className="rounded-lg"><CardContent className="p-2.5 flex items-center justify-between">
                              <div><p className="text-[12px] font-medium text-foreground">{b.measurement}</p><p className="text-[10px] text-muted-foreground">You: {b.userValue} · Chart: {b.chartRange}</p></div>
                              <span className={`text-[11px] font-medium ${fitColors[b.fit] || 'text-muted-foreground'}`}>{fitLabels[b.fit] || b.fit}</span>
                            </CardContent></Card>
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
      </div>
      <BottomTabBar />
    </div>
  );
};

export default SizeGuide;
