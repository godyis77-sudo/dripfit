import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoSet, BodyScanResult, FitPreference, ReferenceObject, MeasurementRange } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { compressPhoto } from '@/lib/imageUtils';
import PremiumScanAnimation from '@/components/analyze/PremiumScanAnimation';

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
  const [scanLineY, setScanLineY] = useState(0);
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

    const scanLineInterval = setInterval(() => {
      setScanLineY(p => Math.min(p + (100 / (TOTAL_SCAN_TIME / 50)), 100));
    }, 50);

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
      clearInterval(scanLineInterval);
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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 overflow-hidden">

      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 z-50 text-muted-foreground font-mono text-xs"
        onClick={() => navigate('/capture', { replace: true })}
      >
        ✕ ABORT
      </Button>

      {/* Premium scan animation */}
      <div className="relative w-full max-w-[380px] mx-auto rounded-xl overflow-hidden mb-6"
        style={{ boxShadow: '0 0 40px 8px hsl(45 88% 50% / 0.3), 0 0 80px 20px hsl(45 88% 50% / 0.15)' }}>

        {/* Base image */}
        <img src={scanResultsFull} className="w-full h-auto block" alt="body scan" />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-background/40" />

        {/* Scan line */}
        <div className="absolute inset-x-0 pointer-events-none"
          style={{
            top: `${scanLineY}%`,
            height: '2px',
            background: 'linear-gradient(to right, transparent 0%, hsl(45 88% 50%) 20%, hsl(45 88% 60%) 50%, hsl(45 88% 50%) 80%, transparent 100%)',
            boxShadow: '0 0 8px 3px hsl(45 88% 50% / 0.9), 0 0 20px 6px hsl(45 88% 50% / 0.5)',
          }} />

        {/* Scanned area — gold tint above scan line */}
        <div className="absolute inset-x-0 top-0 pointer-events-none transition-all duration-100"
          style={{
            height: `${scanLineY}%`,
            background: 'linear-gradient(to bottom, hsl(45 88% 50% / 0.08), hsl(45 88% 50% / 0.04))',
          }} />

        {/* Corner targeting brackets */}
        {[['top-3 left-3', 'border-t-2 border-l-2'], ['top-3 right-3', 'border-t-2 border-r-2'],
          ['bottom-3 left-3', 'border-b-2 border-l-2'], ['bottom-3 right-3', 'border-b-2 border-r-2']
        ].map(([pos, border], i) => (
          <div key={i} className={`absolute ${pos} ${border} border-primary w-5 h-5 opacity-80`} />
        ))}

        {/* Measurement labels revealed as scan passes */}
        {revealedKeys.map((key) => {
          const positions: Record<string, { top: string; side: string; align: string }> = {
            height:   { top: '8%',  side: 'left: 4%',  align: 'left' },
            shoulder: { top: '20%', side: 'right: 4%', align: 'right' },
            chest:    { top: '26%', side: 'left: 4%',  align: 'left' },
            bust:     { top: '30%', side: 'right: 4%', align: 'right' },
            sleeve:   { top: '36%', side: 'left: 4%',  align: 'left' },
            waist:    { top: '42%', side: 'right: 4%', align: 'right' },
            hips:     { top: '49%', side: 'right: 4%', align: 'right' },
            inseam:   { top: '65%', side: 'left: 4%',  align: 'left' },
          };
          const pos = positions[key];
          if (!pos) return null;
          const val = realData?.[key];
          const sideKey = pos.side.split(':')[0].trim();
          const sideVal = pos.side.split(': ')[1]?.trim();
          return (
            <motion.div key={key} className="absolute pointer-events-none"
              style={{ top: pos.top, [sideKey]: sideVal }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}>
              <div style={{ textAlign: pos.align as 'left' | 'right' }}>
                <p className="text-[9px] font-bold tracking-widest uppercase"
                  style={{ color: 'hsl(45 88% 60%)' }}>{key}</p>
                {val && <p className="text-[10px] font-black text-foreground leading-tight">
                  {val.min?.toFixed(0)}–{val.max?.toFixed(0)} cm
                </p>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Status text */}
      <motion.p
        key={msgIdx}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-xs font-mono tracking-widest text-primary/70 text-center mb-5 uppercase"
      >
        {MESSAGES[msgIdx]}
      </motion.p>

      {/* Progress bar — gold */}
      <div className="w-full max-w-[260px] h-[3px] bg-primary/10 rounded-full overflow-hidden border border-primary/20">
        <motion.div
          className="h-full rounded-full bg-primary"
          style={{
            boxShadow: '0 0 10px 2px hsl(45 88% 50% / 0.5)',
          }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Measurement count */}
      <p className="text-[10px] font-mono text-primary/50 mt-3 tracking-wider">
        {revealedKeys.length} of {REVEAL_ORDER.length} measurements found
      </p>
    </div>
  );
};

export default Analyze;
