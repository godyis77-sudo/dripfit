import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MeasurementRange } from '@/lib/types';
import scanResultsFull from '@/assets/scan-results-full.jpg';

const CM_TO_IN = 0.3937;
const fmtCm = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;
const fmtHeightFtIn = (cm: number) => {
  const totalIn = Math.round(cm * CM_TO_IN);
  return `${Math.floor(totalIn / 12)}' ${totalIn % 12}"`;
};

interface BodyDiagramProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
}

interface MeasurementOverlay {
  key: string;
  label: string;
  side: 'left' | 'right';
  valTop: string;
  delay: number;
}

const OVERLAYS: MeasurementOverlay[] = [
  { key: 'height', label: 'HEIGHT', side: 'left', valTop: '14.5%', delay: 0 },
  { key: 'shoulder', label: 'SHOULDER', side: 'right', valTop: '21.5%', delay: 0.05 },
  { key: 'chest', label: 'CHEST', side: 'left', valTop: '27%', delay: 0.1 },
  { key: 'bust', label: 'BUST', side: 'right', valTop: '30%', delay: 0.15 },
  { key: 'sleeve', label: 'SLEEVE', side: 'left', valTop: '36.5%', delay: 0.2 },
  { key: 'waist', label: 'WAIST', side: 'right', valTop: '41%', delay: 0.25 },
  { key: 'hips', label: 'HIPS', side: 'right', valTop: '49%', delay: 0.3 },
  { key: 'inseam', label: 'INSEAM', side: 'left', valTop: '65.5%', delay: 0.35 },
];

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const getValue = (key: string): { line1: string; line2: string } | null => {
    if (key === 'height') {
      return { line1: fmtHeightFtIn(heightCm), line2: `${heightCm} cm` };
    }
    const range = measurements[key];
    if (!range) return null;
    return { line1: fmtIn(range), line2: fmtCm(range) };
  };

  return (
    <div className="mb-4">
      <p className="section-label mb-2">Body Measurement Map</p>
      <div className="flex justify-center">
        <div className="relative rounded-[1rem] border-[3px] border-primary" style={{ boxShadow: '0 0 16px 6px hsl(45 88% 50% / 0.7), 0 0 50px 18px hsl(45 88% 45% / 0.35), 0 0 90px 30px hsl(45 88% 40% / 0.15), inset 0 0 14px 3px hsl(45 88% 50% / 0.2)' }}>
          <span className="sr-only">
            {`Body measurements diagram: ${[
              `Height ${heightCm} cm`,
              ...OVERLAYS
                .filter(l => l.key !== 'height' && measurements[l.key])
                .map(l => `${l.label} ${measurements[l.key].min.toFixed(0)}–${measurements[l.key].max.toFixed(0)} cm`),
            ].join(', ')}.`}
          </span>
          <div className="overflow-hidden rounded-[calc(1rem-3px)]">
            <img
              src={scanResultsFull}
              alt="Body measurement scan results"
              className="w-full max-w-[380px] object-cover"
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Dynamic measurement value overlays */}
          {imageLoaded && OVERLAYS.map((overlay) => {
            const val = getValue(overlay.key);
            if (!val) return null;

            return (
              <motion.div
                key={overlay.key}
                className="absolute"
                style={{
                  top: `calc(${overlay.valTop} + 3px)`,
                  ...(overlay.side === 'left'
                    ? { left: '2%' }
                    : { right: '2%' }),
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: overlay.delay + 0.3, duration: 0.3, ease: 'easeOut' }}
              >
                <div style={{ textAlign: overlay.side === 'left' ? 'left' : 'right' }}>
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

          <div className="absolute -inset-[7px] rounded-[calc(1rem+4px)] border-[4px] border-black pointer-events-none" style={{ boxShadow: 'inset 0 0 8px 2px hsl(45 88% 50% / 0.7), 0 0 10px 2px hsl(45 88% 50% / 0.6), 0 0 20px 4px hsl(45 88% 50% / 0.25)' }} />
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
