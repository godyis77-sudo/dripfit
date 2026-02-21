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
  };

  const handleSave = () => {
    const history = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]');
    history.unshift(result);
    localStorage.setItem('dripcheck_scans', JSON.stringify(history));
    setSaved(true);
    toast({ title: 'Saved!', description: 'Body profile saved.' });
  };

  const handleDelete = () => { toast({ title: 'Deleted', description: 'Photos removed.' }); navigate('/'); };

  const handleCalibrate = (data: { type: 'waist'; value: number } | { type: 'brand'; brand: string; size: string }) => {
    setConfidence('medium');
    toast({ title: 'Updated!', description: 'Confidence improved.' });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-4 pb-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8 rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <SizeHero retailer={state?.retailer} category={state?.category} recommendedSize={adjustedSize} confidence={confidence} whyLine={result.whyLine || 'Based on scan + retailer chart + fit preference'} />
        <FitPreferenceToggle value={fitPref} onChange={setFitPref} />
        <AlternativeSizes sizeDown={alternatives.sizeDown} sizeUp={alternatives.sizeUp} best={adjustedSize} />
        {confidence === 'low' && <LowConfidenceRescue onCalibrate={handleCalibrate} />}
        <MeasurementGrid measurements={measurements} heightCm={result.heightCm} />
        <ResultActions saved={saved} scanDate={result.date} onSave={handleSave} onTryOn={() => navigate('/tryon', { state: { bodyProfile: result } })} onNewScan={() => navigate('/capture')} onDelete={handleDelete} />
      </div>
    </div>
  );
};

export default Results;
