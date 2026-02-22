import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Check } from 'lucide-react';
import { BodyScanResult, FitPreference, MeasurementRange } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import SizeHero from '@/components/results/SizeHero';
import FitPreferenceToggle from '@/components/results/FitPreferenceToggle';
import AlternativeSizes from '@/components/results/AlternativeSizes';
import MeasurementGrid from '@/components/results/MeasurementGrid';
import BodyDiagram from '@/components/results/BodyDiagram';
import LowConfidenceRescue from '@/components/results/LowConfidenceRescue';
import ResultActions from '@/components/results/ResultActions';
import ShopThisSize from '@/components/monetization/ShopThisSize';
import UpgradePrompt from '@/components/monetization/UpgradePrompt';
import FitFeedbackSheet from '@/components/monetization/FitFeedbackSheet';
import BrandPartnerCards from '@/components/monetization/BrandPartnerCards';

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

  useEffect(() => { if (result) trackEvent('results_viewed'); }, [result]);

  const adjustedSize = useMemo(() => {
    if (!result) return '';
    const base = result.recommendedSize;
    if (fitPref === 'fitted') return shiftSize(base, -1);
    if (fitPref === 'relaxed') return shiftSize(base, 1);
    return base;
  }, [fitPref, result]);

  const alternatives = useMemo(() => ({ sizeDown: shiftSize(adjustedSize, -1), sizeUp: shiftSize(adjustedSize, 1) }), [adjustedSize]);

  if (!result) { navigate('/', { replace: true }); return null; }

  const measurements: Record<string, MeasurementRange> = {
    chest: result.chest, waist: result.waist, hips: result.hips, inseam: result.inseam, shoulder: result.shoulder,
    ...(result.bust ? { bust: result.bust } : {}),
    ...(result.sleeve ? { sleeve: result.sleeve } : {}),
  };

  const handleSave = () => {
    const history = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]');
    history.unshift(result);
    localStorage.setItem('dripcheck_scans', JSON.stringify(history));
    setSaved(true);
    trackEvent('results_saved');
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
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Success confirmation */}
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 mb-4">
          <Check className="h-4 w-4 text-primary shrink-0" />
          <div>
            <p className="text-[12px] font-bold text-primary">Scan complete</p>
            <p className="text-[10px] text-muted-foreground">Your measurements are ready — see your best size below</p>
          </div>
        </div>

        <SizeHero retailer={state?.retailer} category={state?.category} recommendedSize={adjustedSize} confidence={confidence} whyLine={result.whyLine || 'Based on your scan + retailer chart + fit preference'} />
        <FitPreferenceToggle value={fitPref} onChange={setFitPref} />
        <AlternativeSizes sizeDown={alternatives.sizeDown} sizeUp={alternatives.sizeUp} best={adjustedSize} />
        {confidence === 'low' && <LowConfidenceRescue onCalibrate={handleCalibrate} />}

        {/* Affiliate clickout — primary monetization */}
        <ShopThisSize
          recommendedSize={adjustedSize}
          confidence={confidence}
          retailer={state?.retailer}
          category={state?.category}
        />

        <BodyDiagram measurements={measurements} heightCm={result.heightCm} />
        <MeasurementGrid measurements={measurements} heightCm={result.heightCm} />
        <ResultActions saved={saved} scanDate={result.date} onSave={handleSave} onTryOn={() => { trackEvent('results_tryon_click'); navigate('/tryon', { state: { bodyProfile: result } }); }} onNewScan={() => navigate('/capture')} onDelete={handleDelete} />

        {/* Brand partnership placeholders */}
        <BrandPartnerCards />

        {/* Next step suggestion */}
        {saved && (
          <div className="mt-3 bg-card border border-border rounded-lg p-3 text-center">
            <p className="text-[12px] font-bold text-foreground mb-1">What's next?</p>
            <p className="text-[10px] text-muted-foreground mb-2.5">See how a specific item looks on you with your new size profile.</p>
            <Button className="rounded-lg btn-luxury text-primary-foreground text-[11px] h-9 px-4 font-bold" onClick={() => navigate('/tryon', { state: { bodyProfile: result } })}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Try-On an Outfit
            </Button>
          </div>
        )}

        {/* Upgrade prompt — after value delivered */}
        {saved && (
          <UpgradePrompt
            headline="Want higher confidence?"
            description="Unlock advanced calibration, brand fit memory, and return risk alerts."
            className="mt-3"
          />
        )}

        {/* Fit feedback — post-purchase */}
        {saved && (
          <div className="mt-3">
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
      </div>
    </div>
  );
};

export default Results;
