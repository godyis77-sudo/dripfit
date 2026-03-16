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
  /** % from top of the aspect-ratio box */
  dotTop: number;
  /** % from left — on the body edge */
  dotLeft: number;
  delay: number;
}

// Calibrated to body-silhouette-clean.webp inside a 3/4 aspect box with object-contain
const OVERLAYS: Overlay[] = [
  { key: 'height',   label: 'HEIGHT',   side: 'left',  dotTop: 8,   dotLeft: 32, delay: 0 },
  { key: 'shoulder', label: 'SHOULDER', side: 'right', dotTop: 19,  dotLeft: 64, delay: 0.08 },
  { key: 'chest',    label: 'CHEST',    side: 'left',  dotTop: 28,  dotLeft: 36, delay: 0.16 },
  { key: 'bust',     label: 'BUST',     side: 'right', dotTop: 31,  dotLeft: 59, delay: 0.24 },
  { key: 'sleeve',   label: 'SLEEVE',   side: 'left',  dotTop: 38,  dotLeft: 23, delay: 0.32 },
  { key: 'waist',    label: 'WAIST',    side: 'right', dotTop: 43,  dotLeft: 57, delay: 0.40 },
  { key: 'hips',     label: 'HIPS',     side: 'right', dotTop: 51,  dotLeft: 60, delay: 0.48 },
  { key: 'inseam',   label: 'INSEAM',   side: 'left',  dotTop: 70,  dotLeft: 44, delay: 0.56 },
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
      {/* SR description */}
      <span className="sr-only">
        {`Body measurements diagram: ${[
          `Height ${heightCm} cm`,
          ...OVERLAYS
            .filter(l => l.key !== 'height' && measurements[l.key])
            .map(l => `${l.label} ${measurements[l.key].min.toFixed(0)}–${measurements[l.key].max.toFixed(0)} cm`),
        ].join(', ')}.`}
      </span>

      <div className="flex justify-center">
        {/* Outer glow wrapper */}
        <div
          className="relative w-full max-w-[300px]"
          style={{
            filter: 'drop-shadow(0 0 24px hsl(45 90% 55% / 0.35)) drop-shadow(0 0 60px hsl(45 88% 50% / 0.12))',
          }}
        >
          {/* ── Aspect-ratio lock: every child shares this coordinate space ── */}
          <div className="relative w-full" style={{ aspectRatio: '3 / 4' }}>

            {/* Layer 1: Gold-tinted silhouette */}
            <img
              src={bodySilhouette}
              alt=""
              className="absolute inset-0 w-full h-full object-contain z-[1]"
              onLoad={() => setImageLoaded(true)}
              style={{
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.5s ease-out',
                filter: 'brightness(0.4) sepia(1) saturate(1.5) hue-rotate(5deg)',
              }}
            />

            {/* Layer 2: Grid projected onto body via mask */}
            {imageLoaded && (
              <motion.div
                className="absolute inset-0 z-[2] pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  backgroundImage: [
                    'linear-gradient(hsl(45 88% 50% / 0.2) 1px, transparent 1px)',
                    'linear-gradient(90deg, hsl(45 88% 50% / 0.2) 1px, transparent 1px)',
                  ].join(', '),
                  backgroundSize: '15px 15px',
                  WebkitMaskImage: `url(${bodySilhouette})`,
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskImage: `url(${bodySilhouette})`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                }}
              />
            )}

            {/* Layer 3: Measurement callouts (top z-index) */}
            {imageLoaded && OVERLAYS.map((o) => {
              const val = getValue(o.key);
              if (!val) return null;
              const isLeft = o.side === 'left';

              return (
                <motion.div
                  key={o.key}
                  className="absolute z-[10]"
                  style={{ top: `${o.dotTop}%`, left: `${o.dotLeft}%` }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: o.delay + 0.6, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Sonar rings */}
                  <span className="absolute -inset-[6px] rounded-full border border-primary/30 animate-[sonar-ping_2s_ease-out_infinite]" />
                  <span className="absolute -inset-[3px] rounded-full border border-primary/50 animate-[sonar-ping_2s_ease-out_0.4s_infinite]" />

                  {/* Dot */}
                  <span
                    className="block w-[6px] h-[6px] rounded-full"
                    style={{
                      background: 'radial-gradient(circle, hsl(45 95% 72%), hsl(45 88% 50%))',
                      boxShadow: '0 0 6px 2px hsl(45 88% 50% / 0.7)',
                    }}
                  />

                  {/* Line + label */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1 whitespace-nowrap"
                    style={
                      isLeft
                        ? { right: '100%', marginRight: 5, flexDirection: 'row-reverse' }
                        : { left: '100%', marginLeft: 5 }
                    }
                  >
                    {/* Gradient connector */}
                    <span
                      className="block h-[0.5px] w-5"
                      style={{
                        background: isLeft
                          ? 'linear-gradient(to left, hsl(45 88% 50% / 0.8), transparent)'
                          : 'linear-gradient(to right, hsl(45 88% 50% / 0.8), transparent)',
                      }}
                    />
                    {/* Glassmorphic label */}
                    <div
                      className="rounded-md px-1.5 py-0.5"
                      style={{
                        background: 'hsl(0 0% 0% / 0.6)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '0.5px solid hsl(45 88% 50% / 0.2)',
                        textAlign: isLeft ? 'right' : 'left',
                      }}
                    >
                      <p className="text-[8px] font-bold tracking-widest text-primary/60 leading-none mb-px">
                        {o.label}
                      </p>
                      <p className="text-[10px] font-black text-foreground leading-tight">
                        {val.line1}
                      </p>
                      <p className="text-[8px] font-medium text-muted-foreground leading-tight">
                        {val.line2}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
