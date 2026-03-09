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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-black px-4 overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, hsl(180 80% 15% / 0.15) 0%, transparent 60%),
            radial-gradient(ellipse at 30% 70%, hsl(var(--primary) / 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 80%, hsl(200 70% 15% / 0.1) 0%, transparent 40%)
          `,
        }}
      />

      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 z-50 text-muted-foreground font-mono text-xs"
        onClick={() => navigate('/capture', { replace: true })}
      >
        ✕ ABORT
      </Button>

      {/* Scan frame container */}
      <div className="relative mb-6 w-full max-w-[380px] aspect-[2/3]">
        {/* Animated rotating border — dual-colour conic */}
        <motion.div
          className="absolute -inset-[2px] rounded-xl pointer-events-none z-0"
          style={{
            background: `conic-gradient(from 0deg, hsl(180 80% 50%), hsl(var(--primary) / 0.4), hsl(180 80% 50% / 0.2), hsl(var(--primary)), hsl(180 80% 50%))`,
            filter: 'blur(0.5px)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />

        {/* Outer glow pulse — cyan + gold */}
        <motion.div
          className="absolute -inset-[8px] rounded-xl pointer-events-none z-0"
          animate={{
            boxShadow: [
              '0 0 20px 4px hsl(180 80% 50% / 0.25), 0 0 50px 10px hsl(180 80% 50% / 0.08), 0 0 15px 2px hsl(var(--primary) / 0.15)',
              '0 0 35px 8px hsl(180 80% 50% / 0.4), 0 0 80px 20px hsl(180 80% 50% / 0.15), 0 0 25px 6px hsl(var(--primary) / 0.25)',
              '0 0 20px 4px hsl(180 80% 50% / 0.25), 0 0 50px 10px hsl(180 80% 50% / 0.08), 0 0 15px 2px hsl(var(--primary) / 0.15)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Inner container */}
        <div className="relative w-full h-full rounded-lg overflow-hidden z-[1]">
          <ScanAnimation revealedCount={revealedKeys.length} />
        </div>
      </div>

      {/* Status text — monospaced, tech feel */}
      <motion.p
        key={msgIdx}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-xs font-mono tracking-widest text-[hsl(180_80%_60%_/_0.8)] text-center mb-5 uppercase"
      >
        {'>'} {MESSAGES[msgIdx]}
      </motion.p>

      {/* Progress bar — glowing cyan */}
      <div className="w-full max-w-[260px] h-[3px] bg-[hsl(180_80%_50%_/_0.1)] rounded-full overflow-hidden border border-[hsl(180_80%_50%_/_0.15)]">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, hsl(180 80% 50%), hsl(var(--primary)))',
            boxShadow: '0 0 10px 2px hsl(180 80% 50% / 0.5)',
          }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Measurement count */}
      <p className="text-[10px] font-mono text-[hsl(180_80%_60%_/_0.5)] mt-3 tracking-wider">
        DATAPOINTS: {revealedKeys.length}/{REVEAL_ORDER.length} CAPTURED
      </p>
    </div>
  );
};

export default Analyze;
