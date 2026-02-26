import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import bodySilhouetteScan from '@/assets/body-silhouette-scan.jpg';
import { PhotoSet, BodyScanResult, FitPreference, ReferenceObject } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getSessionId } from '@/lib/session';

const MESSAGES = [
  'Detecting body landmarks…',
  'Cross-referencing views…',
  'Estimating measurements…',
  'Matching size charts…',
  'Generating recommendations…',
];

const MEASUREMENT_LABELS = ['HEIGHT', 'SHOULDER', 'CHEST', 'WAIST', 'HIPS', 'INSEAM'];

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
  const [scanPos, setScanPos] = useState(0);
  const [filledMeasurements, setFilledMeasurements] = useState<string[]>([]);
  const minTimeElapsed = useRef(false);
  const resultReady = useRef<any>(null);

  useEffect(() => {
    if (!state?.photos?.front || !state?.photos?.side) {
      navigate('/capture', { replace: true });
      return;
    }

    // Message cycling
    const msgInterval = setInterval(() => setMsgIdx(p => (p + 1) % MESSAGES.length), 2000);

    // Progress bar animation — minimum 5s visual
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 1.5, 90));
    }, 100);

    // Looping scan line — sweeps top to bottom over 3s, then resets
    const SCAN_DURATION = 3000;
    const SCAN_TICK = 30;
    const scanInterval = setInterval(() => {
      setScanPos(p => {
        const next = p + (SCAN_TICK / SCAN_DURATION) * 100;
        return next >= 100 ? 0 : next;
      });
    }, SCAN_TICK);

    // Fill in measurement labels one by one
    MEASUREMENT_LABELS.forEach((label, i) => {
      setTimeout(() => {
        setFilledMeasurements(prev => [...prev, label]);
      }, 1200 + i * 800);
    });

    // Minimum visual time
    setTimeout(() => {
      minTimeElapsed.current = true;
      if (resultReady.current) navigateToResults(resultReady.current);
    }, 5500);

    analyzePhotos();

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
      clearInterval(scanInterval);
    };
  }, []);

  const saveToDatabase = async (data: any) => {
    try {
      const sessionId = getSessionId();
      const { error: dbError } = await supabase.from('body_scans').insert({
        user_id: user?.id || null,
        session_id: user ? null : sessionId,
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
    setProgress(100);
    // Auto-save scan to user's profile
    saveToDatabase(data);
    setTimeout(() => {
      navigate('/results', {
        state: { result: { id: crypto.randomUUID(), date: new Date().toISOString(), ...data } },
        replace: true,
      });
    }, 400);
  };

  const analyzePhotos = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-body', {
        body: {
          frontPhoto: state!.photos.front,
          sidePhoto: state!.photos.side,
          heightCm: state!.heightCm,
          referenceObject: state!.referenceObject,
          fitPreference: state!.fitPreference,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      if (minTimeElapsed.current) {
        navigateToResults(data);
      } else {
        resultReady.current = data;
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      {/* Animated body silhouette reveal */}
      <div className="relative mb-6 w-[220px] h-[280px] rounded-xl overflow-hidden">
        {/* Base dimmed image */}
        <img
          src={bodySilhouetteScan}
          alt="Body scan analysis"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />

        {/* Revealed portion — grows with progress, stays revealed */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: `inset(0 0 ${Math.max(0, 100 - (progress / 90) * 100)}% 0)`,
            transition: 'clip-path 0.4s ease-out',
          }}
        >
          <img
            src={bodySilhouetteScan}
            alt="Body scan analysis"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Looping scan line */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] bg-primary shadow-[0_0_16px_hsl(var(--primary)),0_0_4px_hsl(var(--primary))]"
          style={{ top: `${scanPos}%` }}
          animate={{ opacity: progress >= 90 ? 0 : [0.5, 1, 0.5] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />

        {/* Subtle glow trailing the scan line */}
        <div
          className="absolute left-0 right-0 h-8 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none"
          style={{
            top: `${scanPos}%`,
            transition: 'top 30ms linear',
          }}
        />

        {/* Pulsing glow behind */}
        <motion.div
          className="absolute inset-0 rounded-xl blur-[40px] bg-primary/10 -z-10"
          animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      <h2 className="text-lg font-bold text-foreground mb-2">Analyzing Your Scan</h2>

      <motion.p
        key={msgIdx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-[13px] text-muted-foreground text-center mb-6"
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
      <p className="text-[10px] text-muted-foreground mt-3">
        {filledMeasurements.length} of {MEASUREMENT_LABELS.length} measurements found
      </p>
    </div>
  );
};

export default Analyze;
