import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import bodySilhouetteScan from '@/assets/body-silhouette-clean.png';
import { PhotoSet, BodyScanResult, FitPreference, ReferenceObject, MeasurementRange } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const MESSAGES = [
  'Detecting body landmarks…',
  'Cross-referencing views…',
  'Estimating measurements…',
  'Matching size charts…',
  'Generating recommendations…',
];

const CM_TO_IN = 0.3937;
const fmtHeightFtIn = (cm: number) => {
  const totalIn = Math.round(cm * CM_TO_IN);
  return `${Math.floor(totalIn / 12)}' ${totalIn % 12}"`;
};
const fmtRange = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;

interface MeasurementOverlay {
  key: string;
  label: string;
  side: 'left' | 'right';
  topPct: string;
  /** Leader line: start X% on body, end X% at label edge */
  bodyX: number;
  labelX: number;
  lineY: number;
}

const OVERLAYS: MeasurementOverlay[] = [
  { key: 'height', label: 'Height', side: 'left', topPct: '8%', bodyX: 38, labelX: 6, lineY: 15 },
  { key: 'shoulder', label: 'Shoulder', side: 'right', topPct: '18.5%', bodyX: 62, labelX: 94, lineY: 25.2 },
  { key: 'chest', label: 'Chest', side: 'left', topPct: '24.5%', bodyX: 41, labelX: 6, lineY: 31 },
  { key: 'bust', label: 'Bust', side: 'right', topPct: '27.5%', bodyX: 57, labelX: 94, lineY: 34 },
  { key: 'waist', label: 'Waist', side: 'right', topPct: '38%', bodyX: 57, labelX: 94, lineY: 44.5 },
  { key: 'hips', label: 'Hips', side: 'right', topPct: '46%', bodyX: 60, labelX: 94, lineY: 52.4 },
  { key: 'inseam', label: 'Inseam', side: 'left', topPct: '63%', bodyX: 46, labelX: 6, lineY: 70 },
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
  const [scanPos, setScanPos] = useState(0);
  const [revealedKeys, setRevealedKeys] = useState<string[]>([]);
  const [realData, setRealData] = useState<any>(null);
  const minTimeElapsed = useRef(false);
  const resultReady = useRef<any>(null);

  // Generate placeholder shimmer values for each measurement
  const getDisplayValue = useCallback((key: string) => {
    if (realData) {
      if (key === 'height') return fmtHeightFtIn(realData.heightCm || state?.heightCm || 170);
      const range = realData[key] as MeasurementRange | undefined;
      if (range) return fmtRange(range);
    }
    // Placeholder while waiting
    if (key === 'height') return fmtHeightFtIn(state?.heightCm || 170);
    return '';
  }, [realData, state]);

  useEffect(() => {
    if (!state?.photos?.front || !state?.photos?.side) {
      navigate('/capture', { replace: true });
      return;
    }

    const msgInterval = setInterval(() => setMsgIdx(p => (p + 1) % MESSAGES.length), 2000);

    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + (90 / (TOTAL_SCAN_TIME / 100)), 90));
    }, 100);

    const SCAN_DURATION = 3000;
    const SCAN_TICK = 30;
    const scanInterval = setInterval(() => {
      setScanPos(p => {
        const next = p + (SCAN_TICK / SCAN_DURATION) * 100;
        return next >= 100 ? 0 : next;
      });
    }, SCAN_TICK);

    // Progressively reveal measurements spread across total scan time
    const revealInterval = TOTAL_SCAN_TIME / REVEAL_ORDER.length;
    REVEAL_ORDER.forEach((key, i) => {
      setTimeout(() => {
        setRevealedKeys(prev => [...prev, key]);
      }, revealInterval * (i + 0.5));
    });

    setTimeout(() => {
      minTimeElapsed.current = true;
      if (resultReady.current) navigateToResults(resultReady.current);
    }, TOTAL_SCAN_TIME);

    analyzePhotos();

    return () => {
      clearInterval(msgInterval);
      clearInterval(progressInterval);
      clearInterval(scanInterval);
    };
  }, []);

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

      // Store real data so labels update with actual values
      setRealData(data);

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Animated body silhouette with live measurement overlays */}
      <div className="relative mb-5 w-full max-w-[380px] aspect-[2/3] rounded-xl overflow-hidden bg-background">
        {/* Base dimmed image */}
        <img
          src={bodySilhouetteScan}
          alt="Body scan analysis"
          className="absolute inset-0 w-full h-full object-contain opacity-30 mix-blend-luminosity"
        />

        {/* Revealed portion */}
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
            className="w-full h-full object-contain mix-blend-luminosity"
          />
        </div>

        {/* SVG leader lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {OVERLAYS.map(({ key, bodyX, labelX, lineY }) => {
            if (!revealedKeys.includes(key)) return null;
            return (
              <motion.line
                key={`leader-${key}`}
                x1={labelX} y1={lineY}
                x2={bodyX} y2={lineY}
                stroke="hsl(42 45% 55%)"
                strokeWidth="0.3"
                strokeDasharray="1.2 0.8"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              />
            );
          })}
          {OVERLAYS.map(({ key, bodyX, lineY }) => {
            if (!revealedKeys.includes(key)) return null;
            return (
              <motion.circle
                key={`dot-${key}`}
                cx={bodyX} cy={lineY} r="0.7"
                fill="hsl(42 45% 50%)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            );
          })}
        </svg>

        {/* Live measurement labels appearing on the silhouette */}
        <AnimatePresence>
          {OVERLAYS.map(({ key, label, side, topPct }) => {
            if (!revealedKeys.includes(key)) return null;
            const isLeft = side === 'left';
            const value = getDisplayValue(key);
            const hasRealValue = realData != null && value !== '';

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: isLeft ? -12 : 12, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                className="absolute"
                style={{
                  top: topPct,
                  ...(isLeft ? { left: '2%' } : { right: '2%' }),
                }}
              >
                <div className={`${isLeft ? 'text-left' : 'text-right'} px-1.5 py-0.5`}>
                  <p className="text-[22px] font-bold uppercase tracking-wider leading-none" style={{ color: 'hsl(42 45% 50%)' }}>
                    {label}
                  </p>
                  {value ? (
                    <motion.p
                      key={value}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[24px] font-bold leading-none mt-0.5"
                      style={{ color: hasRealValue ? 'hsl(0 0% 95%)' : 'hsl(0 0% 50%)' }}
                    >
                      {value}
                    </motion.p>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

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
          style={{ top: `${scanPos}%`, transition: 'top 30ms linear' }}
        />

        {/* Pulsing glow behind */}
        <motion.div
          className="absolute inset-0 rounded-xl blur-[40px] bg-primary/10 -z-10"
          animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
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
