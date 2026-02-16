import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, Camera, Image, Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Ruler } from 'lucide-react';
import { getMeasurements } from '@/lib/storage';
import { MeasurementResult, MEASUREMENT_LABELS } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import BottomTabBar from '@/components/BottomTabBar';
import { useToast } from '@/hooks/use-toast';

interface SizeBreakdown {
  measurement: string;
  userValue: string;
  chartRange: string;
  fitsSize: string;
  fit: 'tight' | 'good' | 'loose';
}

interface SizeRecommendation {
  recommendedSize: string;
  confidence: string;
  breakdown: SizeBreakdown[];
  notes: string;
  alternativeSize?: string;
  alternativeReason?: string;
}

const fitColors: Record<string, string> = {
  tight: 'text-orange-500',
  good: 'text-green-500',
  loose: 'text-blue-500',
};

const fitLabels: Record<string, string> = {
  tight: 'Tight',
  good: 'Good Fit',
  loose: 'Loose',
};

const SizeGuide = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [brandName, setBrandName] = useState('');
  const [sizeGuideImage, setSizeGuideImage] = useState<string | null>(null);
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementResult | null>(null);
  const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showMeasurementPicker, setShowMeasurementPicker] = useState(false);

  const measurements = getMeasurements();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload an image under 10MB.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSizeGuideImage(reader.result as string);
      setRecommendation(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!sizeGuideImage) {
      toast({ title: 'No image', description: 'Please upload a size guide first.', variant: 'destructive' });
      return;
    }
    if (!selectedMeasurement) {
      toast({ title: 'No measurements', description: 'Please select a measurement result first.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-size-guide', {
        body: {
          sizeGuideImage,
          measurements: {
            chest: selectedMeasurement.chest,
            waist: selectedMeasurement.waist,
            hips: selectedMeasurement.hips,
            inseam: selectedMeasurement.inseam,
            armLength: selectedMeasurement.armLength,
            shoulderWidth: selectedMeasurement.shoulderWidth,
            neck: selectedMeasurement.neck,
            torsoLength: selectedMeasurement.torsoLength,
          },
          brandName: brandName || undefined,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setRecommendation(data as SizeRecommendation);
    } catch (err: any) {
      console.error('Size guide analysis failed:', err);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-select latest measurement if only one
  if (measurements.length > 0 && !selectedMeasurement) {
    setSelectedMeasurement(measurements[0]);
  }

  return (
    <div className="min-h-screen bg-background px-6 py-6 pb-24">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Size Guide Match</h1>
          <div className="w-10" />
        </div>

        {/* Step 1: Upload size guide */}
        <div className="mb-5">
          <p className="text-sm font-bold text-foreground mb-2">1. Upload a brand's size chart</p>
          <Input
            placeholder="Brand name (optional)"
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            className="mb-3 rounded-2xl"
          />

          {sizeGuideImage ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
              <img src={sizeGuideImage} alt="Size guide" className="w-full rounded-2xl border border-border" />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 rounded-xl"
                onClick={() => { setSizeGuideImage(null); setRecommendation(null); }}
              >
                Change
              </Button>
            </motion.div>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-24 rounded-2xl flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Gallery</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-24 rounded-2xl flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Camera</span>
              </Button>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
        </div>

        {/* Step 2: Select measurements */}
        <div className="mb-5">
          <p className="text-sm font-bold text-foreground mb-2">2. Select your measurements</p>

          {measurements.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-4 text-center">
                <Ruler className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground/70 mb-3">No measurements yet</p>
                <Button size="sm" className="rounded-2xl" onClick={() => navigate('/capture')}>
                  Take Measurements
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card
                className="rounded-2xl cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setShowMeasurementPicker(!showMeasurementPicker)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {selectedMeasurement
                        ? new Date(selectedMeasurement.date).toLocaleDateString()
                        : 'Select measurement'}
                    </p>
                    {selectedMeasurement && (
                      <p className="text-xs text-muted-foreground">
                        Size {selectedMeasurement.sizeRecommendation} · Chest {selectedMeasurement.chest}" · Waist {selectedMeasurement.waist}"
                      </p>
                    )}
                  </div>
                  {showMeasurementPicker ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </CardContent>
              </Card>

              <AnimatePresence>
                {showMeasurementPicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                      {measurements.map(m => (
                        <Card
                          key={m.id}
                          className={`rounded-xl cursor-pointer transition-colors ${selectedMeasurement?.id === m.id ? 'border-primary' : 'hover:border-primary/30'}`}
                          onClick={() => { setSelectedMeasurement(m); setShowMeasurementPicker(false); setRecommendation(null); }}
                        >
                          <CardContent className="p-3">
                            <p className="text-xs font-medium text-foreground">{new Date(m.date).toLocaleDateString()}</p>
                            <p className="text-xs text-muted-foreground">
                              Size {m.sizeRecommendation} · Chest {m.chest}" · Waist {m.waist}"
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Analyze button */}
        <Button
          className="w-full h-14 rounded-2xl btn-3d-drip font-bold text-base mb-6"
          disabled={!sizeGuideImage || !selectedMeasurement || loading}
          onClick={handleAnalyze}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" /> Get My Size
            </>
          )}
        </Button>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="rounded-2xl border-destructive/30 mb-4">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Result */}
        <AnimatePresence>
          {recommendation && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Main recommendation */}
              <Card className="rounded-2xl mb-4 bg-primary/5 border-primary/20">
                <CardContent className="p-5 text-center">
                  <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                   <p className="text-xs font-semibold text-foreground/70 mb-1">
                    {brandName ? `${brandName} — ` : ''}Recommended Size
                  </p>
                  <p className="text-4xl font-bold text-primary mb-1">{recommendation.recommendedSize}</p>
                   <p className="text-xs font-semibold text-foreground/70 capitalize">
                    Confidence: {recommendation.confidence}
                  </p>
                </CardContent>
              </Card>

              {/* Notes */}
              {recommendation.notes && (
                <Card className="rounded-2xl mb-4">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-foreground/80">{recommendation.notes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Alternative */}
              {recommendation.alternativeSize && (
                <Card className="rounded-2xl mb-4">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Alternative</p>
                    <p className="text-sm text-foreground">
                      <span className="font-bold">{recommendation.alternativeSize}</span>
                      {recommendation.alternativeReason && ` — ${recommendation.alternativeReason}`}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Breakdown toggle */}
              {recommendation.breakdown?.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full mb-2 text-muted-foreground"
                    onClick={() => setShowBreakdown(!showBreakdown)}
                  >
                    {showBreakdown ? 'Hide' : 'Show'} Measurement Breakdown
                    {showBreakdown ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                  </Button>

                  <AnimatePresence>
                    {showBreakdown && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-2">
                          {recommendation.breakdown.map((b, i) => (
                            <Card key={i} className="rounded-xl">
                              <CardContent className="p-3 flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-medium text-foreground">{b.measurement}</p>
                                  <p className="text-xs text-muted-foreground">
                                    You: {b.userValue} · Chart: {b.chartRange}
                                  </p>
                                </div>
                                <span className={`text-xs font-medium ${fitColors[b.fit] || 'text-muted-foreground'}`}>
                                  {fitLabels[b.fit] || b.fit}
                                </span>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default SizeGuide;
