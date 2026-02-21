import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoSet, BodyScanResult, FitPreference, ReferenceObject } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

const MESSAGES = [
  'Detecting body landmarks…',
  'Cross-referencing views…',
  'Estimating measurements…',
  'Matching size charts…',
  'Generating recommendations…',
];

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

  useEffect(() => {
    if (!state?.photos?.front || !state?.photos?.side) { navigate('/capture', { replace: true }); return; }
    const interval = setInterval(() => setMsgIdx(p => (p + 1) % MESSAGES.length), 2200);
    analyzePhotos();
    return () => clearInterval(interval);
  }, []);

  const analyzePhotos = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-body', {
        body: { frontPhoto: state!.photos.front, sidePhoto: state!.photos.side, heightCm: state!.heightCm, referenceObject: state!.referenceObject, fitPreference: state!.fitPreference },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      navigate('/results', { state: { result: { id: crypto.randomUUID(), date: new Date().toISOString(), ...data } }, replace: true });
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || 'Analysis failed.');
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <h2 className="text-lg font-bold text-foreground mb-1.5">Analysis Failed</h2>
        <p className="text-[13px] text-muted-foreground text-center mb-5 max-w-[240px]">{error}</p>
        <Button onClick={() => navigate('/capture', { replace: true })} className="rounded-lg btn-luxury text-primary-foreground h-10 px-5 text-sm">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
        <Loader2 className="h-10 w-10 text-primary" />
      </motion.div>
      <h2 className="text-lg font-bold text-foreground mt-5 mb-2">Analyzing Photos</h2>
      <motion.p key={msgIdx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-[13px] text-muted-foreground text-center">
        {MESSAGES[msgIdx]}
      </motion.p>
    </div>
  );
};

export default Analyze;
