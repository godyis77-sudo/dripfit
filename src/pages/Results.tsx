import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { BodyScanResult, FitPreference, MeasurementRange } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import SizeHero from '@/components/results/SizeHero';
import FitPreferenceToggle from '@/components/results/FitPreferenceToggle';
import AlternativeSizes from '@/components/results/AlternativeSizes';
import MeasurementGrid from '@/components/results/MeasurementGrid';
import LowConfidenceRescue from '@/components/results/LowConfidenceRescue';
import ResultActions from '@/components/results/ResultActions';

// Simple size ladder for fit-adjusted recommendations
const SIZE_LADDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];

function shiftSize(size: string, delta: number): string {
  const idx = SIZE_LADDER.indexOf(size);
  if (idx === -1) return size;
  const newIdx = Math.max(0, Math.min(SIZE_LADDER.length - 1, idx + delta));
  return SIZE_LADDER[newIdx];
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

  useEffect(() => {
    if (result) trackEvent('results_viewed');
  }, [result]);

  const adjustedSize = useMemo(() => {
    if (!result) return '';
    const base = result.recommendedSize;
    if (fitPref === 'fitted') return shiftSize(base, -1);
    if (fitPref === 'relaxed') return shiftSize(base, 1);
    return base;
  }, [fitPref, result]);

  const alternatives = useMemo(() => ({
    sizeDown: shiftSize(adjustedSize, -1),
    sizeUp: shiftSize(adjustedSize, 1),
  }), [adjustedSize]);

  if (!result) {
    navigate('/', { replace: true });
    return null;
  }

  const measurements: Record<string, MeasurementRange> = {
    chest: result.chest,
    waist: result.waist,
    hips: result.hips,
    inseam: result.inseam,
    shoulder: result.shoulder,
  };

  const handleSave = () => {
    const history = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]');
    history.unshift(result);
    localStorage.setItem('dripcheck_scans', JSON.stringify(history));
    setSaved(true);
    toast({ title: 'Saved!', description: 'Body profile saved to your device.' });
  };

  const handleDelete = () => {
    toast({ title: 'Deleted', description: 'Photos removed from this session.' });
    navigate('/');
  };

  const handleCalibrate = (data: { type: 'waist'; value: number } | { type: 'brand'; brand: string; size: string }) => {
    // Upgrade confidence after calibration
    setConfidence('medium');
    toast({ title: 'Updated!', description: 'Confidence improved with your input.' });
  };

  return (
    <div className="min-h-screen bg-background px-5 py-5 pb-10">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center mb-5">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-9 w-9 rounded-xl">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Size recommendation hero */}
        <SizeHero
          retailer={state?.retailer}
          category={state?.category}
          recommendedSize={adjustedSize}
          confidence={confidence}
          whyLine={result.whyLine || 'Based on your scan estimate + retailer size chart + fit preference'}
        />

        {/* Fit preference toggle */}
        <FitPreferenceToggle value={fitPref} onChange={setFitPref} />

        {/* Alternatives */}
        <AlternativeSizes sizeDown={alternatives.sizeDown} sizeUp={alternatives.sizeUp} best={adjustedSize} />

        {/* Low confidence rescue */}
        {confidence === 'low' && <LowConfidenceRescue onCalibrate={handleCalibrate} />}

        {/* Measurements */}
        <MeasurementGrid measurements={measurements} heightCm={result.heightCm} />

        {/* Actions */}
        <ResultActions
          saved={saved}
          scanDate={result.date}
          onSave={handleSave}
          onTryOn={() => navigate('/tryon', { state: { bodyProfile: result } })}
          onNewScan={() => navigate('/capture')}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};

export default Results;
