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
  'Initializing body scan…',
  'Detecting body landmarks…',
  'Mapping skeletal structure…',
  'Cross-referencing front view…',
  'Cross-referencing side view…',
  'Calibrating reference points…',
  'Estimating upper body…',
  'Estimating lower body…',
  'Refining proportions…',
  'Matching size charts…',
  'Analyzing fit preferences…',
  'Generating recommendations…',
];

const TOTAL_SCAN_TIME = 15000;
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
  const [scanComplete, setScanComplete] = useState(false);
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

    const msgInterval = setInterval(() => setMsgIdx(p => (p + 1) % MESSAGES.length), 1250);

    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + (90 / (TOTAL_SCAN_TIME / 100)), 90));
    }, 100);

    // Oscillating scan line: bounces top→bottom→top continuously
    const scanStart = Date.now();
    const scanLineInterval = setInterval(() => {
      const elapsed = Date.now() - scanStart;
      const cycleMs = 4500; // one full sweep cycle — slower for 30s
      const phase = (elapsed % cycleMs) / cycleMs; // 0→1
      // Triangle wave: 0→1→0
      const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      // Ease in-out for smoothness
      const eased = tri < 0.5 ? 2 * tri * tri : 1 - Math.pow(-2 * tri + 2, 2) / 2;
      setScanLineY(eased * 100);
    }, 16);

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
    // Build the scan payload once
    const scanPayload = {
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
    };

    if (!user) {
      // Guest: cache scan payload so it can be saved after sign-up
      try { sessionStorage.setItem('dripcheck_pending_scan', JSON.stringify(scanPayload)); } catch {}
      return;
    }

    try {
      const { error: dbError } = await supabase.from('body_scans').insert({
        user_id: user.id,
        session_id: null,
        ...scanPayload,
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
    setScanComplete(true);
    saveToDatabase(data);
    const scanResult = { id: crypto.randomUUID(), date: new Date().toISOString(), ...data };
    setTimeout(() => {
      navigate('/scan-success', {
        state: { result: scanResult },
        replace: true,
      });
    }, 2800);
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
        onClick={() => {
          if (window.confirm('Are you sure you want to cancel this scan? Your photos will not be saved.')) {
            navigate('/capture', { replace: true });
          }
        }}
      >
        ✕ ABORT
      </Button>

      <PremiumScanAnimation
        scanLineY={scanLineY}
        revealedKeys={revealedKeys}
        realData={realData}
        revealedCount={revealedKeys.length}
        totalCount={REVEAL_ORDER.length}
        scanComplete={scanComplete}
      />

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
