import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoSet, MeasurementResult, CalibrationObject } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

const ANALYSIS_MESSAGES = [
  'Detecting ruler for scale calibration…',
  'Identifying body landmarks…',
  'Cross-referencing front and side views…',
  'Calculating measurements…',
  'Generating size recommendations…',
];

const Analyze = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { photos: PhotoSet; calibrationObject?: CalibrationObject } | undefined;
  const photos = state?.photos;
  const calibrationObject = state?.calibrationObject || 'ruler';
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!photos?.front || !photos?.side || !photos?.armsOut) {
      navigate('/capture', { replace: true });
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % ANALYSIS_MESSAGES.length);
    }, 2500);

    analyzePhotos();

    return () => clearInterval(interval);
  }, []);

  const analyzePhotos = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-body', {
        body: {
          frontPhoto: photos!.front,
          sidePhoto: photos!.side,
          armsOutPhoto: photos!.armsOut,
          calibrationObject,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const result: MeasurementResult = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        ...data.measurements,
        unit: 'in',
        sizeRecommendation: data.sizeRecommendation,
      };

      navigate('/results', { state: { result }, replace: true });
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Analysis failed. Please try again.');
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-2">Analysis Failed</h2>
        <p className="text-sm font-semibold text-foreground/80 text-center mb-6">{error}</p>
        <Button onClick={() => navigate('/capture', { replace: true })} className="rounded-2xl">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="h-12 w-12 text-primary" />
      </motion.div>
      <h2 className="text-xl font-bold text-foreground mt-6 mb-3">Analyzing Your Photos</h2>
      <motion.p
        key={messageIndex}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-semibold text-foreground/70 text-center"
      >
        {ANALYSIS_MESSAGES[messageIndex]}
      </motion.p>
    </div>
  );
};

export default Analyze;
