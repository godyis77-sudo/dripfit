import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoSet, BodyScanResult, FitPreference, ReferenceObject } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import bodySilhouette from '@/assets/body-silhouette.jpg';

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
  const state = location.state as AnalyzeState | undefined;
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
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
    };
  }, []);

  const navigateToResults = (data: any) => {
    setProgress(100);
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
      {/* Body silhouette with measurement lines filling in */}
      <div className="relative mb-6">
        <div className="relative h-[260px] w-auto rounded-xl overflow-hidden">
          {/* Fully opaque background to hide baked-in text */}
          <div className="absolute inset-0 bg-background rounded-xl" />
          <img
            src={bodySilhouette}
            alt="Body scan analysis"
            className="absolute inset-0 h-full w-full rounded-xl object-cover opacity-40"
            style={{ filter: 'brightness(0.3) contrast(2)' }}
          />
        </div>

        {/* Measurement lines overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 120 240" fill="none">
          {[
            { label: 'SHOULDER', y: 48, show: filledMeasurements.includes('SHOULDER') },
            { label: 'CHEST', y: 72, show: filledMeasurements.includes('CHEST') },
            { label: 'WAIST', y: 100, show: filledMeasurements.includes('WAIST') },
            { label: 'HIPS', y: 130, show: filledMeasurements.includes('HIPS') },
            { label: 'INSEAM', y: 170, show: filledMeasurements.includes('INSEAM') },
          ].map((m) => m.show && (
            <motion.g key={m.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <line x1="28" y1={m.y} x2="92" y2={m.y} stroke="hsl(45 88% 40%)" strokeWidth="0.8" strokeDasharray="2 1.5" />
              <circle cx="28" cy={m.y} r="1.5" fill="hsl(45 88% 40%)" />
              <circle cx="92" cy={m.y} r="1.5" fill="hsl(45 88% 40%)" />
            </motion.g>
          ))}

          {filledMeasurements.includes('HEIGHT') && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <line x1="10" y1="12" x2="10" y2="215" stroke="hsl(45 88% 40%)" strokeWidth="0.8" />
              <line x1="6" y1="12" x2="14" y2="12" stroke="hsl(45 88% 40%)" strokeWidth="0.8" />
              <line x1="6" y1="215" x2="14" y2="215" stroke="hsl(45 88% 40%)" strokeWidth="0.8" />
            </motion.g>
          )}
        </svg>

        {/* Pulsing glow behind */}
        <motion.div
          className="absolute inset-0 rounded-full blur-[60px] bg-primary/10"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
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
