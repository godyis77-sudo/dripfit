import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight } from 'lucide-react';
import scanResultsFull from '@/assets/scan-results-full.jpg';
import type { BodyScanResult, MeasurementRange } from '@/lib/types';

const CM_TO_IN = 0.3937;

const fmtIn = (r: MeasurementRange) =>
  `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;
const fmtCm = (r: MeasurementRange) =>
  `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtHeightFtIn = (cm: number) => {
  const totalIn = Math.round(cm * CM_TO_IN);
  return `${Math.floor(totalIn / 12)}' ${totalIn % 12}"`;
};

interface MeasurementOverlay {
  key: string;
  label: string;
  side: 'left' | 'right';
  valTop: string;  // position for the value overlay (covers old baked-in numbers)
  delay: number;
  getValue: (r: BodyScanResult) => { line1: string; line2: string } | null;
}

const OVERLAYS: MeasurementOverlay[] = [
  {
    key: 'height',
    label: 'HEIGHT',
    side: 'left',
    valTop: '12%',
    delay: 0,
    getValue: (r) => ({ line1: fmtHeightFtIn(r.heightCm), line2: `${r.heightCm} cm` }),
  },
  {
    key: 'shoulder',
    label: 'SHOULDER',
    side: 'right',
    valTop: '21%',
    delay: 0.15,
    getValue: (r) => ({ line1: fmtIn(r.shoulder), line2: fmtCm(r.shoulder) }),
  },
  {
    key: 'chest',
    label: 'CHEST',
    side: 'left',
    valTop: '28%',
    delay: 0.25,
    getValue: (r) => ({ line1: fmtIn(r.chest), line2: fmtCm(r.chest) }),
  },
  {
    key: 'bust',
    label: 'BUST',
    side: 'right',
    valTop: '28.5%',
    delay: 0.35,
    getValue: (r) => r.bust ? ({ line1: fmtIn(r.bust), line2: fmtCm(r.bust) }) : null,
  },
  {
    key: 'sleeve',
    label: 'SLEEVE',
    side: 'left',
    valTop: '39%',
    delay: 0.45,
    getValue: (r) => r.sleeve ? ({ line1: fmtIn(r.sleeve), line2: fmtCm(r.sleeve) }) : null,
  },
  {
    key: 'waist',
    label: 'WAIST',
    side: 'right',
    valTop: '41%',
    delay: 0.55,
    getValue: (r) => ({ line1: fmtIn(r.waist), line2: fmtCm(r.waist) }),
  },
  {
    key: 'hips',
    label: 'HIPS',
    side: 'right',
    valTop: '51.5%',
    delay: 0.65,
    getValue: (r) => ({ line1: fmtIn(r.hips), line2: fmtCm(r.hips) }),
  },
  {
    key: 'inseam',
    label: 'INSEAM',
    side: 'left',
    valTop: '62%',
    delay: 0.75,
    getValue: (r) => ({ line1: fmtIn(r.inseam), line2: fmtCm(r.inseam) }),
  },
];

const ScanSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { result: BodyScanResult } | undefined;
  const result = state?.result;
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!result) {
      navigate('/capture', { replace: true });
    }
  }, [result, navigate]);

  if (!result) return null;

  const handleNavigate = (path: string) => {
    navigate(path, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background relative">
      {/* Skip button */}
      <button
        onClick={() => handleNavigate('/profile/body')}
        className="absolute top-5 right-5 text-[11px] text-muted-foreground font-medium z-20"
      >
        Skip →
      </button>

      {/* Scan results image with measurement overlays */}
      <motion.div
        className="relative w-full max-w-[400px] mx-auto mt-2"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: imageLoaded ? 1 : 0, scale: imageLoaded ? 1 : 0.92 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={scanResultsFull}
          alt="Scan Results"
          className="w-full h-auto"
          onLoad={() => setImageLoaded(true)}
        />

        {/* Cover old baked-in values and show dynamic ones */}
        {imageLoaded && OVERLAYS.map((overlay) => {
          const val = overlay.getValue(result);
          if (!val) return null;

          return (
            <motion.div
              key={overlay.key}
              className="absolute"
              style={{
                top: overlay.valTop,
                ...(overlay.side === 'left'
                  ? { left: '2%' }
                  : { right: '2%' }),
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: overlay.delay + 0.4, duration: 0.35, ease: 'easeOut' }}
            >
              <div
                style={{
                  textAlign: overlay.side === 'left' ? 'left' : 'right',
                }}
              >
                <p
                  className="text-[11px] font-black leading-tight"
                  style={{ color: '#000' }}
                >
                  {val.line1}
                </p>
                <p
                  className="text-[9px] font-bold leading-tight"
                  style={{ color: 'hsl(30 10% 25%)' }}
                >
                  {val.line2}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bottom section */}
      <div className="w-full px-6 pb-8 flex flex-col items-center mt-4">
        {/* Fit Identity Updated badge */}
        <motion.div
          className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 mb-5"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, duration: 0.4 }}
        >
          <Check className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-bold text-primary">Fit Identity Updated</span>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="w-full max-w-[300px] space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.4 }}
        >
          <Button
            className="w-full h-12 rounded-xl text-sm font-bold btn-luxury"
            onClick={() => handleNavigate('/profile/body')}
          >
            See My Sizes <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
          <button
            onClick={() => handleNavigate('/')}
            className="w-full text-center text-[11px] text-muted-foreground py-2"
          >
            Go Home
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default ScanSuccess;
