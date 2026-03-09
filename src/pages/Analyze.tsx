import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoSet, BodyScanResult, FitPreference, ReferenceObject, MeasurementRange } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { compressPhoto } from '@/lib/imageUtils';
import ScanAnimation from '@/components/analyze/ScanAnimation';

const MESSAGES = [
  'Detecting body landmarks…',
  'Cross-referencing views…',
  'Estimating measurements…',
  'Matching size charts…',
  'Generating recommendations…',
];

const TOTAL_SCAN_TIME = 8000;
const REVEAL_ORDER = ['height', 'shoulder', 'chest', 'bust', 'waist', 'hips', 'inseam'];

interface AnalyzeState {
  photos: PhotoSet;
  heightCm: number;
  referenceObject: ReferenceObject;
  fitPreference: FitPreference;
}

const Analyze = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state as AnalyzeState | undefined;
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [revealedKeys, setRevealedKeys] = useState<string[]>([]);
  const [realData, setRealData] = useState<any>(null);
  const minTimeElapsed = useRef(false);
  const resultReady = useRef<any>(null);
  const effectRan = useRef(false);
  const revealTimers = useRef<number[]>([]);

  useEffect(() => {
    if (!state?.photos?.front || !state?.photos?.side) {
      navigate('/capture', { replace: true });
      return;
    }

    if (effectRan.current) return;
    effectRan.current = true;

    const msgInterval = setInterval(() => setMsgIdx(p => (p + 1) % MESSAGES.length), 2000);

    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + (90 / (TOTAL_SCAN_TIME / 100)), 90));
    }, 100);

    const revealInterval = TOTAL_SCAN_TIME / REVEAL_ORDER.length;
    revealTimers.current = REVEAL_ORDER.map((key, i) =>
      window.setTimeout(() => {
        setRevealedKeys(prev => [...prev, key]);
      }, revealInterval * (i + 0.5))
    );

    setTimeout(() => {
      minTimeElapsed.current = true;
      if (resultReady.current) navigateToResults(resultReady.current);
    }, TOTAL_SCAN_TIME);

    analyzePhotos();

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
      revealTimers.current.forEach(id => window.clearTimeout(id));
      revealTimers.current = [];
    };
  }, [state, navigate, user]);

  const saveToDatabase = async (data: any) => {
    if (!user) return;
    try {
      const { error: dbError } = await supabase.from('body_scans').insert({
        user_id: user.id,
        session_id: null,
        height_cm: data.heightCm || state?.heightCm || 0,
        chest_min: data.chest?.min ?? 0,
        chest_max: data.chest?.max ?? 0,
        waist_min: data.waist?.min ?? 0,
        waist_max: data.waist?.max ?? 0,
        hip_min: data.hips?.min ?? 0,
        hip_max: data.hips?.max ?? 0,
        inseam_min: data.inseam?.min ?? 0,
        inseam_max: data.inseam?.max ?? 0,
        shoulder_min: data.shoulder?.min ?? 0,
        shoulder_max: data.shoulder?.max ?? 0,
        bust_min: data.bust?.min ?? 0,
        bust_max: data.bust?.max ?? 0,
        sleeve_min: data.sleeve?.min ?? 0,
        sleeve_max: data.sleeve?.max ?? 0,
        confidence: data.confidence || 'medium',
        recommended_size: data.recommendedSize || null,
        reference_object: state?.referenceObject || null,
        front_photo_used: !!state?.photos?.front,
        side_photo_used: !!state?.photos?.side,
      });
      if (dbError) console.error('Failed to save scan:', dbError);
    } catch (e) {
      console.error('Error saving scan to profile:', e);
    }
  };

  const navigateToResults = (data: any) => {
    setRealData(data);
    setProgress(100);
    setRevealedKeys(REVEAL_ORDER);
    saveToDatabase(data);
    const scanResult = { id: crypto.randomUUID(), date: new Date().toISOString(), ...data };
    setTimeout(() => {
      navigate('/scan-success', {
        state: { result: scanResult },
        replace: true,
      });
    }, 800);
  };

  const analyzePhotos = async () => {
    try {
      const [compressedFront, compressedSide] = await Promise.all([
        compressPhoto(state!.photos.front!),
        compressPhoto(state!.photos.side!),
      ]);

      const { data: resp, error: fnError } = await supabase.functions.invoke('analyze-body', {
        body: {
          frontPhoto: compressedFront,
          sidePhoto: compressedSide,
          heightCm: state!.heightCm,
          referenceObject: state!.referenceObject,
          fitPreference: state!.fitPreference,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (resp?.error) throw new Error(resp.error.message || resp.error);
      const payload = resp?.data ?? resp;

      setRealData(payload);

      if (minTimeElapsed.current) {
        navigateToResults(payload);
      } else {
        resultReady.current = payload;
      }
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Analysis failed.');
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <div className="h-12 w-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1.5">Scan Failed</h2>
        <p className="text-[13px] text-muted-foreground text-center mb-5 max-w-[240px]">{error}</p>
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button onClick={() => navigate('/capture', { replace: true })} className="rounded-xl h-12 px-6 text-sm font-semibold">
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 z-50 text-muted-foreground"
        onClick={() => navigate('/capture', { replace: true })}
      >
        Cancel scan
      </Button>

      {/* Animated body silhouette with CSS scan effect */}
      <div className="relative mb-5 w-full max-w-[380px] aspect-[2/3] rounded-xl overflow-hidden bg-background">
        <ScanAnimation />

        {/* Vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none rounded-xl z-20"
          style={{ boxShadow: 'inset 0 0 60px 20px hsl(var(--background) / 0.7), inset 0 0 120px 40px hsl(var(--background) / 0.4)' }}
        />
        {/* Outer gold border glow */}
        <div
          className="absolute inset-0 pointer-events-none rounded-xl z-20"
          style={{ boxShadow: '0 0 20px 2px hsl(var(--primary) / 0.25), 0 0 50px 8px hsl(var(--primary) / 0.1)' }}
        />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2">Analyzing Your Scan</h2>

      <motion.p
        key={msgIdx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm text-muted-foreground text-center mb-6"
      >
        {MESSAGES[msgIdx]}
      </motion.p>

      {/* Progress bar */}
      <div className="w-full max-w-[240px] h-1.5 bg-border rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Measurement count */}
      <p className="text-xs text-muted-foreground mt-3">
        {revealedKeys.length} of {REVEAL_ORDER.length} measurements found
      </p>
    </div>
  );
};

export default Analyze;
