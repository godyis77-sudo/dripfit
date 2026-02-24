import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Check } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BodyScanResult, FitPreference, MeasurementRange } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import SizeHero from '@/components/results/SizeHero';
import FitPreferenceToggle from '@/components/results/FitPreferenceToggle';
import AlternativeSizes from '@/components/results/AlternativeSizes';
import MeasurementGrid from '@/components/results/MeasurementGrid';
import MeasurementAdjuster from '@/components/results/MeasurementAdjuster';
import BodyDiagram from '@/components/results/BodyDiagram';
import LowConfidenceRescue from '@/components/results/LowConfidenceRescue';
import ResultActions from '@/components/results/ResultActions';
import ShopThisSize from '@/components/monetization/ShopThisSize';
import UpgradePrompt from '@/components/monetization/UpgradePrompt';
import FitFeedbackSheet from '@/components/monetization/FitFeedbackSheet';
import BrandPartnerCards from '@/components/monetization/BrandPartnerCards';
import PostScanGuide from '@/components/results/PostScanGuide';

const SIZE_LADDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];

function shiftSize(size: string, delta: number): string {
  const idx = SIZE_LADDER.indexOf(size);
  if (idx === -1) return size;
  return SIZE_LADDER[Math.max(0, Math.min(SIZE_LADDER.length - 1, idx + delta))];
}

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const state = location.state as { result: BodyScanResult; retailer?: string; category?: string } | undefined;
  const result = state?.result;
  const [fitPref, setFitPref] = useState<FitPreference>(result?.fitPreference || 'regular');
  const [saved, setSaved] = useState(false);
  const [confidence, setConfidence] = useState(result?.confidence || 'medium');
  const [showFeedback, setShowFeedback] = useState(false);
  const [adjustedMeasurements, setAdjustedMeasurements] = useState<Record<string, MeasurementRange>>({});
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    if (result) {
      trackEvent('results_viewed');
      trackEvent('result_viewed');
    }
  }, [result]);

  const adjustedSize = useMemo(() => {
    if (!result) return '';
    const base = result.recommendedSize;
    if (fitPref === 'fitted') return shiftSize(base, -1);
    if (fitPref === 'relaxed') return shiftSize(base, 1);
    return base;
  }, [fitPref, result]);

  const alternatives = useMemo(() => ({ sizeDown: shiftSize(adjustedSize, -1), sizeUp: shiftSize(adjustedSize, 1) }), [adjustedSize]);

  const measurements: Record<string, MeasurementRange> = useMemo(() => {
    if (!result) return {};
    const base: Record<string, MeasurementRange> = {
      chest: result.chest, waist: result.waist, hips: result.hips, inseam: result.inseam, shoulder: result.shoulder,
      ...(result.bust ? { bust: result.bust } : {}),
      ...(result.sleeve ? { sleeve: result.sleeve } : {}),
    };
    return { ...base, ...adjustedMeasurements };
  }, [result, adjustedMeasurements]);

  const handleMeasurementAdjust = useCallback((key: string, newRange: MeasurementRange) => {
    setAdjustedMeasurements(prev => ({ ...prev, [key]: newRange }));
    trackEvent('measurement_adjusted', { key });
  }, []);

  if (!result) {
    return (
      <div className="min-h-screen bg-background px-4 py-4 flex items-center justify-center">
        <div className="max-w-sm mx-auto text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">No fit profile yet</h2>
          <p className="text-sm text-muted-foreground mb-5">Complete a quick body scan to get your personalized size recommendations.</p>
          <Button className="w-full h-11 rounded-lg btn-luxury text-primary-foreground text-sm font-bold" onClick={() => navigate('/capture')}>
            Start Scan
          </Button>
          <Button variant="ghost" className="w-full mt-2 text-xs text-muted-foreground" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    const history = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]');
    history.unshift(result);
    localStorage.setItem('dripcheck_scans', JSON.stringify(history));
    setSaved(true);
    trackEvent('results_saved');
    trackEvent('save_item', { type: 'scan' });
    toast({ title: 'Saved to Profile', description: 'Your body profile is ready for Try-Ons.' });
  };

  const handleDelete = () => { toast({ title: 'Deleted', description: 'Scan data removed.' }); navigate('/'); };

  const handleCalibrate = (data: { type: 'waist'; value: number } | { type: 'brand'; brand: string; size: string }) => {
    setConfidence('medium');
    toast({ title: 'Confidence improved', description: 'Your size recommendation is now more accurate.' });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2.5 mb-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-7 w-7 rounded-md p-0 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Check className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary">Scan complete</p>
            <p className="text-sm text-muted-foreground">Your measurements are ready — see your best size below</p>
          </div>
        </div>

        {/* Post-scan guided flow */}
        <AnimatePresence>
          {showGuide && (
            <PostScanGuide
              result={result}
              recommendedSize={adjustedSize}
              onDismiss={() => {
                setShowGuide(false);
                trackEvent('postscan_dismissed');
              }}
            />
          )}
        </AnimatePresence>

        <SizeHero retailer={state?.retailer} category={state?.category} recommendedSize={adjustedSize} confidence={confidence} whyLine={result.whyLine || 'Based on your scan + retailer chart + fit preference'} />

        <FitPreferenceToggle value={fitPref} onChange={setFitPref} />
        <AlternativeSizes sizeDown={alternatives.sizeDown} sizeUp={alternatives.sizeUp} best={adjustedSize} />
        {confidence === 'low' && <LowConfidenceRescue onCalibrate={handleCalibrate} />}

        <MeasurementGrid measurements={measurements} heightCm={result.heightCm} />

        {(confidence === 'low' || confidence === 'medium') && (
          <MeasurementAdjuster
            measurements={measurements}
            onAdjust={handleMeasurementAdjust}
          />
        )}

        {/* Tabbed sections */}
        <Tabs defaultValue="shop" className="mt-4">
          <TabsList className="w-full grid grid-cols-3 h-9 rounded-lg bg-muted">
            <TabsTrigger value="shop" className="text-[11px] font-bold rounded-md">Shop</TabsTrigger>
            <TabsTrigger value="body" className="text-[11px] font-bold rounded-md">Body</TabsTrigger>
            <TabsTrigger value="more" className="text-[11px] font-bold rounded-md">More</TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="mt-3 space-y-3">
            <ShopThisSize
              recommendedSize={adjustedSize}
              confidence={confidence}
              retailer={state?.retailer}
              category={state?.category}
            />

            <ResultActions
              saved={saved}
              scanDate={result.date}
              onSave={handleSave}
              onTryOn={() => { trackEvent('results_tryon_click'); navigate('/tryon', { state: { bodyProfile: result } }); }}
              onNewScan={() => navigate('/capture')}
              onDelete={handleDelete}
              recommendedSize={adjustedSize}
            />
          </TabsContent>

          <TabsContent value="body" className="mt-3 space-y-3">
            <BodyDiagram measurements={measurements} heightCm={result.heightCm} />
          </TabsContent>

          <TabsContent value="more" className="mt-3 space-y-3">
            <BrandPartnerCards />

            {(saved || confidence === 'low') && (
              <UpgradePrompt
                headline={confidence === 'low' ? 'Low confidence? Get smarter sizing.' : 'Want higher confidence?'}
                description="Unlock advanced calibration, brand fit memory, and return risk alerts."
              />
            )}

            {saved && (
              <div>
                <button
                  onClick={() => setShowFeedback(!showFeedback)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 mb-2"
                >
                  Already bought something? Report how it fit
                </button>
                {showFeedback && (
                  <FitFeedbackSheet
                    retailer={state?.retailer || 'Unknown'}
                    recommendedSize={adjustedSize}
                  />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Results;
