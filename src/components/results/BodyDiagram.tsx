import { useState } from 'react';
import { motion } from 'framer-motion';
import type { MeasurementRange } from '@/lib/types';
import bodySilhouette from '@/assets/body-silhouette-clean.webp';
import { getUseCm } from '@/lib/session';

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

interface Overlay {
  key: string;
  label: string;
  side: 'left' | 'right';
  dotTop: number;
  dotLeft: number;
  delay: number;
}

const OVERLAYS: Overlay[] = [
  { key: 'height',   label: 'HEIGHT',   side: 'left',  dotTop: 2,   dotLeft: 50, delay: 0 },
  { key: 'shoulder', label: 'SHOULDER', side: 'right', dotTop: 18,  dotLeft: 68, delay: 0.06 },
  { key: 'chest',    label: 'CHEST',    side: 'left',  dotTop: 28,  dotLeft: 36, delay: 0.12 },
  { key: 'bust',     label: 'BUST',     side: 'right', dotTop: 31,  dotLeft: 59, delay: 0.18 },
  { key: 'sleeve',   label: 'SLEEVE',   side: 'left',  dotTop: 35,  dotLeft: 28, delay: 0.24 },
  { key: 'waist',    label: 'WAIST',    side: 'right', dotTop: 43,  dotLeft: 57, delay: 0.30 },
  { key: 'hips',     label: 'HIPS',     side: 'right', dotTop: 51,  dotLeft: 60, delay: 0.36 },
  { key: 'inseam',   label: 'INSEAM',   side: 'left',  dotTop: 68,  dotLeft: 48, delay: 0.42 },
];

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const useCm = getUseCm();

  const getValue = (key: string): { line1: string; line2: string } | null => {
    if (key === 'height') {
      return useCm
        ? { line1: `${heightCm} cm`, line2: fmtHeightFtIn(heightCm) }
        : { line1: fmtHeightFtIn(heightCm), line2: `${heightCm} cm` };
    }
    const range = measurements[key];
    if (!range) return null;
    return useCm
      ? { line1: fmtCm(range), line2: fmtIn(range) }
      : { line1: fmtIn(range), line2: fmtCm(range) };
  };

  return (
    <div className="mb-4">
      <span className="sr-only">
        {`Body measurements diagram: ${[
          `Height ${heightCm} cm`,
          ...OVERLAYS
            .filter(l => l.key !== 'height' && measurements[l.key])
            .map(l => `${l.label} ${measurements[l.key].min.toFixed(0)}–${measurements[l.key].max.toFixed(0)} cm`),
        ].join(', ')}.`}
      </span>

      {/* Luxury Card */}
      <div
        className="relative rounded-2xl overflow-hidden mx-auto max-w-[340px]"
        style={{
          background: '#F2F2F2',
          border: '2px solid hsl(45 70% 52%)',
          boxShadow: '0 0 40px rgba(212, 175, 55, 0.35), 0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div className="pt-5 pb-2 text-center">
          <p
            className="text-[10px] tracking-[0.3em] text-neutral-400 uppercase mb-1"
            style={{ fontFamily: 'var(--font-display, ui-serif, Georgia, serif)' }}
          >
            Body Analysis
          </p>
          <h2
            className="text-[22px] font-black tracking-[0.15em] text-neutral-900 uppercase"
            style={{ fontFamily: 'var(--font-display, ui-serif, Georgia, serif)' }}
          >
            Scan Results
          </h2>
          <div className="mx-auto mt-2 w-12 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, hsl(45 70% 52%), transparent)' }} />
        </div>

        {/* Body + Markers */}
        <div className="flex justify-center px-4 pb-5">
          <div className="relative w-full max-w-[280px]" style={{ aspectRatio: '3 / 4' }}>
            {/* Silhouette — clean, dark, no filters */}
            <img
              src={bodySilhouette}
              alt=""
              className="absolute inset-0 w-full h-full object-contain z-[1]"
              onLoad={() => setImageLoaded(true)}
              style={{
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.4s ease-out',
                filter: 'brightness(0.25) contrast(1.2)',
              }}
            />

            {/* Measurement callouts */}
            {imageLoaded && OVERLAYS.map((o) => {
              const val = getValue(o.key);
              if (!val) return null;
              const isLeft = o.side === 'left';

              return (
                <motion.div
                  key={o.key}
                  className="absolute z-[10]"
                  style={{ top: `${o.dotTop}%`, left: `${o.dotLeft}%` }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: o.delay + 0.3, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Gold dot */}
                  <span
                    className="block w-[7px] h-[7px] rounded-full relative z-[2]"
                    style={{
                      background: 'hsl(45 70% 52%)',
                      boxShadow: '0 0 0 2px #F2F2F2, 0 0 0 3.5px hsl(45 70% 52% / 0.5)',
                    }}
                  />

                  {/* Connector + Label */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 flex items-center gap-0"
                    style={
                      isLeft
                        ? { right: '100%', marginRight: 4, flexDirection: 'row-reverse' as const }
                        : { left: '100%', marginLeft: 4 }
                    }
                  >
                    {/* Thin dark connector line */}
                    <span className="block h-[1px] w-5 bg-neutral-400" />

                    {/* Label card */}
                    <div
                      className="rounded px-1.5 py-[3px]"
                      style={{
                        background: 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(4px)',
                        textAlign: isLeft ? 'right' : 'left',
                      }}
                    >
                      <p className="text-[7px] font-bold tracking-[0.15em] text-neutral-400 uppercase leading-none mb-[2px]">
                        {o.label}
                      </p>
                      <p className="text-[11px] font-black text-neutral-900 leading-tight">
                        {val.line1}
                      </p>
                      <p className="text-[8px] font-medium text-neutral-500 leading-tight">
                        {val.line2}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom accent */}
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, transparent 10%, hsl(45 70% 52%) 50%, transparent 90%)' }} />
      </div>
    </div>
  );
};

export default BodyDiagram;
