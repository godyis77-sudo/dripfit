import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, Ruler, Sparkles, LayoutGrid, Check, RotateCcw, Shield, Trash2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';
import { getFitPreference, getUseCm } from '@/lib/session';
import type { BodyScanResult, FitPreference, MeasurementRange, Confidence } from '@/lib/types';

import BottomTabBar from '@/components/BottomTabBar';
import BodyDiagram from '@/components/results/BodyDiagram';
import MeasurementGrid from '@/components/results/MeasurementGrid';
import FitPreferenceToggle from '@/components/results/FitPreferenceToggle';
import AlternativeSizes from '@/components/results/AlternativeSizes';
import TrustPanel from '@/components/results/TrustPanel';
import ResultActions from '@/components/results/ResultActions';
import ShopThisSize from '@/components/monetization/ShopThisSize';
import ShareResultsButton from '@/components/results/ShareResultsButton';
import LowConfidenceRescue from '@/components/results/LowConfidenceRescue';

const SIZE_LADDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
function shiftSize(size: string, delta: number): string {
  const idx = SIZE_LADDER.indexOf(size);
  if (idx === -1) return size;
  return SIZE_LADDER[Math.max(0, Math.min(SIZE_LADDER.length - 1, idx + delta))];
}

const ProfileBody = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  usePageMeta({ title: 'Body & Fit' });

  const [scan, setScan] = useState<BodyScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [fitPref, setFitPref] = useState<FitPreference>(getFitPreference());
  const [saved, setSaved] = useState(false);
  const [confidence, setConfidence] = useState<Confidence>('medium');
  const [adjustedMeasurements, setAdjustedMeasurements] = useState<Record<string, MeasurementRange>>({});

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('body_scans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const s: BodyScanResult = {
          id: data.id,
          date: data.created_at,
          shoulder: { min: data.shoulder_min, max: data.shoulder_max },
          chest: { min: data.chest_min, max: data.chest_max },
          bust: data.bust_min != null && data.bust_max != null && (data.bust_min > 0 || data.bust_max > 0)
            ? { min: data.bust_min, max: data.bust_max } : undefined,
          waist: { min: data.waist_min, max: data.waist_max },
          hips: { min: data.hip_min, max: data.hip_max },
          inseam: { min: data.inseam_min, max: data.inseam_max },
          sleeve: data.sleeve_min != null && data.sleeve_max != null && (data.sleeve_min > 0 || data.sleeve_max > 0)
            ? { min: data.sleeve_min, max: data.sleeve_max } : undefined,
          heightCm: data.height_cm,
          confidence: (data.confidence as any) || 'medium',
          recommendedSize: data.recommended_size || 'M',
          fitPreference: 'regular',
          alternatives: { sizeDown: '', sizeUp: '' },
          whyLine: '',
        };
        setScan(s);
        setConfidence(s.confidence);
      }
      setLoading(false);
    })();
  }, [user]);

  const adjustedSize = useMemo(() => {
    if (!scan) return '';
    const base = scan.recommendedSize;
    if (fitPref === 'fitted' || fitPref === 'slim') return shiftSize(base, -1);
    if (fitPref === 'relaxed') return shiftSize(base, 1);
    return base;
  }, [fitPref, scan]);

  const alternatives = useMemo(() => ({
    sizeDown: shiftSize(adjustedSize, -1),
    sizeUp: shiftSize(adjustedSize, 1),
  }), [adjustedSize]);

  const measurements: Record<string, MeasurementRange> = useMemo(() => {
    if (!scan) return {};
    const base: Record<string, MeasurementRange> = {
      shoulder: scan.shoulder, chest: scan.chest, waist: scan.waist,
      hips: scan.hips, inseam: scan.inseam,
      ...(scan.bust ? { bust: scan.bust } : {}),
      ...(scan.sleeve ? { sleeve: scan.sleeve } : {}),
    };
    return { ...base, ...adjustedMeasurements };
  }, [scan, adjustedMeasurements]);

  const handleMeasurementAdjust = useCallback((key: string, newRange: MeasurementRange) => {
    setAdjustedMeasurements(prev => ({ ...prev, [key]: newRange }));
    trackEvent('measurement_adjusted', { key });
  }, []);

  // Auto-save on load
  useEffect(() => {
    if (!scan || saved) return;
    const history = JSON.parse(localStorage.getItem('dripcheck_scans') || '[]');
    history.unshift(scan);
    localStorage.setItem('dripcheck_scans', JSON.stringify(history));
    setSaved(true);
    trackEvent('results_saved');
  }, [scan, saved]);

  return (
    <div className="min-h-screen bg-background px-4 pt-4 pb-safe-tab">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="h-10 w-10 rounded-lg min-h-[44px] min-w-[44px]" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-foreground">Body & Fit Identity</h1>
            <p className="text-[10px] text-muted-foreground">Your measurements and fit preferences</p>
          </div>
          {scan && (
            <ShareResultsButton
              measurements={measurements}
              heightCm={scan.heightCm}
              recommendedSize={adjustedSize}
              fitPreference={fitPref}
              variant="icon"
            />
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}
          </div>
        ) : !scan ? (
          <div className="text-center py-14">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Ruler className="h-6 w-6 text-primary/50" />
            </div>
            <p className="text-[14px] font-bold text-foreground mb-1">No body profile yet</p>
            <p className="text-[12px] text-muted-foreground max-w-[220px] mx-auto mb-4">
              Complete a quick scan to get your measurements and fit identity.
            </p>
            <Button className="rounded-lg btn-luxury text-primary-foreground text-sm h-10 px-5 font-bold" onClick={() => navigate('/capture')}>
              <Camera className="mr-1.5 h-4 w-4" /> Start Scan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Size Guide Tool */}
            <button
              onClick={() => navigate('/size-guide')}
              className="w-full flex items-center gap-4 rounded-xl border-2 border-primary/40 p-4 active:scale-[0.98] transition-transform btn-luxury"
            >
              <div className="h-12 w-12 rounded-xl badge-gold-3d flex items-center justify-center shrink-0">
                <Ruler className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="text-left flex-1">
                <p className="text-[14px] font-extrabold text-primary-foreground">Size Guide Tool</p>
                <p className="text-[11px] text-primary-foreground/70">Check your size for any brand instantly</p>
              </div>
            </button>

            {/* Fit Preference Toggle & Alternatives */}
            <FitPreferenceToggle value={fitPref} onChange={setFitPref} />
            <AlternativeSizes sizeDown={alternatives.sizeDown} sizeUp={alternatives.sizeUp} best={adjustedSize} fitPreference={fitPref} />

            {/* Share My Fit Identity (button only) */}
            <ResultActions
              saved={saved}
              scanDate={scan.date}
              onSave={() => {}}
              onTryOn={() => {}}
              onNewScan={() => navigate('/capture')}
              onDelete={() => { toast({ title: 'Deleted' }); navigate('/profile'); }}
              recommendedSize={adjustedSize}
              measurements={measurements}
              heightCm={scan.heightCm}
              shareOnly
            />

            {/* My Size Every Brand + Shop My Size */}
            <Button
              className="w-full h-11 rounded-xl btn-luxury text-primary-foreground text-sm font-extrabold"
              onClick={() => navigate('/my-sizes')}
            >
              <LayoutGrid className="mr-1.5 h-4 w-4" /> My Size Every Brand
            </Button>
            <ShopThisSize
              recommendedSize={adjustedSize}
              confidence={confidence}
            />

            {/* Meta info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-1">
                <Check className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-bold text-primary">Auto-saved to Profile</span>
              </div>
              <Button variant="ghost" className="w-full text-[12px] text-muted-foreground h-8" onClick={() => navigate('/capture')}>
                <RotateCcw className="mr-1 h-3 w-3" /> Scan Again
              </Button>
              <div className="flex items-center justify-between pt-1.5 border-t border-border">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Private by default · delete anytime</p>
                <button onClick={() => { toast({ title: 'Deleted' }); navigate('/profile'); }} className="text-[10px] text-destructive/60 hover:text-destructive flex items-center gap-1 transition-colors"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Scanned: {new Date(scan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Body Map + Measurements */}
            <BodyDiagram measurements={measurements} heightCm={scan.heightCm} />
            <MeasurementGrid measurements={measurements} heightCm={scan.heightCm} />

            {/* New Scan button */}
            <Button
              variant="outline"
              className="w-full h-9 rounded-lg text-[12px] font-bold"
              onClick={() => navigate('/capture')}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5" /> New Scan
            </Button>
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
};

export default ProfileBody;
