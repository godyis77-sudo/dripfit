import { useState, useRef, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Camera, Image, Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Ruler, LogIn } from 'lucide-react';
import { getMeasurements } from '@/lib/storage';
import { MeasurementResult, MEASUREMENT_LABELS } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import BottomTabBar from '@/components/BottomTabBar';
import { useToast } from '@/hooks/use-toast';
import { isNativePlatform, takeNativePhoto } from '@/lib/nativeCamera';

interface SizeBreakdown { measurement: string; userValue: string; chartRange: string; fitsSize: string; fit: 'tight' | 'good' | 'loose'; }
interface SizeRecommendation { recommendedSize: string; confidence: string; breakdown: SizeBreakdown[]; notes: string; alternativeSize?: string; alternativeReason?: string; }

const fitColors: Record<string, string> = { tight: 'text-orange-500', good: 'text-green-500', loose: 'text-blue-500' };
const fitLabels: Record<string, string> = { tight: 'Tight', good: 'Good', loose: 'Loose' };

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
  const [brandName, setBrandName] = useState('');
  const [sizeGuideImage, setSizeGuideImage] = useState<string | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementResult | null>(null);
  const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [measurements, setMeasurements] = useState<MeasurementResult[]>([]);
  const [measurementsLoading, setMeasurementsLoading] = useState(true);

  // Load measurements: DB first, localStorage fallback
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
        // Fallback to localStorage
        const local = getMeasurements();
        setMeasurements(local);
        if (local.length > 0) setSelectedMeasurement(local[0]);
      } catch (err) {
        console.error('Failed to load measurements:', err);
        const local = getMeasurements();
        setMeasurements(local);
        if (local.length > 0) setSelectedMeasurement(local[0]);
      } finally {
        setMeasurementsLoading(false);
      }
    };

    if (!authLoading) loadMeasurements();
  }, [user, authLoading]);

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
      const { data, error: fnError } = await supabase.functions.invoke('analyze-size-guide', {
        body: { sizeGuideImage, measurements: { shoulder: selectedMeasurement.shoulder, chest: selectedMeasurement.chest, waist: selectedMeasurement.waist, hips: selectedMeasurement.hips, inseam: selectedMeasurement.inseam, height: selectedMeasurement.height }, brandName: brandName || undefined },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setRecommendation(data as SizeRecommendation);
    } catch (err: any) { setError(err.message || 'Analysis failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-bottom">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 rounded-lg" aria-label="Go back"><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-base font-bold text-foreground">Size Guide Match</h1>
          <div className="w-8" />
        </div>

        {/* Step 1 */}
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
                if (isNativePlatform()) {
                  try {
                    const { dataUrl } = await takeNativePhoto('gallery');
                    setSizeGuideImage(dataUrl); setRecommendation(null); setError(null);
                  } catch {}
                  return;
                }
                fileInputRef.current?.click();
              }}>
                <Image className="h-4 w-4 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Gallery</span>
              </Button>
              <Button variant="outline" className="flex-1 h-20 rounded-xl flex-col gap-1.5" onClick={async () => {
                if (isNativePlatform()) {
                  try {
                    const { dataUrl } = await takeNativePhoto('camera');
                    setSizeGuideImage(dataUrl); setRecommendation(null); setError(null);
                  } catch {}
                  return;
                }
                cameraInputRef.current?.click();
              }}>
                <Camera className="h-4 w-4 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">Camera</span>
              </Button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
        </div>

        {/* Step 2 */}
        <div className="mb-4">
          <p className="section-label mb-1.5">2. Select measurements</p>
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
                      <Card key={m.id} className={`rounded-lg cursor-pointer transition-colors ${selectedMeasurement?.id === m.id ? 'border-primary' : 'hover:border-primary/30'}`} onClick={() => { setSelectedMeasurement(m); setShowPicker(false); setRecommendation(null); }}>
                        <CardContent className="p-2"><p className="text-[11px] font-medium text-foreground">{new Date(m.date).toLocaleDateString()}</p><p className="text-[10px] text-muted-foreground">Size {m.sizeRecommendation}</p></CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}</AnimatePresence>
            </>
          )}
        </div>

        {/* Analyze */}
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
      </div>
      <BottomTabBar />
    </div>
  );
};

export default SizeGuide;
