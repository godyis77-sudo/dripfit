import { useState, useMemo } from 'react';
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

interface MeasurementOverlay {
  key: string;
  label: string;
  side: 'left' | 'right';
  dotTop: string;
  dotLeft: string;
  delay: number;
}

const OVERLAYS: MeasurementOverlay[] = [
  { key: 'height',   label: 'HEIGHT',   side: 'left',  dotTop: '10%',   dotLeft: '30%', delay: 0 },
  { key: 'shoulder', label: 'SHOULDER', side: 'right', dotTop: '18%',   dotLeft: '65%', delay: 0.08 },
  { key: 'chest',    label: 'CHEST',    side: 'left',  dotTop: '27%',   dotLeft: '35%', delay: 0.16 },
  { key: 'bust',     label: 'BUST',     side: 'right', dotTop: '30%',   dotLeft: '60%', delay: 0.24 },
  { key: 'sleeve',   label: 'SLEEVE',   side: 'left',  dotTop: '36%',   dotLeft: '22%', delay: 0.32 },
  { key: 'waist',    label: 'WAIST',    side: 'right', dotTop: '42%',   dotLeft: '58%', delay: 0.40 },
  { key: 'hips',     label: 'HIPS',     side: 'right', dotTop: '50%',   dotLeft: '60%', delay: 0.48 },
  { key: 'inseam',   label: 'INSEAM',   side: 'left',  dotTop: '68%',   dotLeft: '42%', delay: 0.56 },
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

  const silhouetteUrl = useMemo(() => bodySilhouette, []);

  return (
    <div className="mb-4">
      <div className="flex justify-center">
        <div
          className="relative w-full max-w-[320px]"
          style={{
            filter: 'drop-shadow(0 0 20px hsl(45 90% 60% / 0.4)) drop-shadow(0 0 50px hsl(45 88% 50% / 0.15))',
          }}
        >
          <span className="sr-only">
            {`Body measurements diagram: ${[
              `Height ${heightCm} cm`,
              ...OVERLAYS
                .filter(l => l.key !== 'height' && measurements[l.key])
                .map(l => `${l.label} ${measurements[l.key].min.toFixed(0)}–${measurements[l.key].max.toFixed(0)} cm`),
            ].join(', ')}.`}
          </span>

          {/* Invisible base image — only for layout sizing */}
          <img
            src={silhouetteUrl}
            alt="Body silhouette"
            className="w-full h-auto relative z-[0] invisible"
            onLoad={() => setImageLoaded(true)}
          />

          {/* Body fill — dark tinted silhouette, masked to shape */}
          {imageLoaded && (
            <div
              className="absolute inset-0 z-[1] pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, hsl(45 30% 18% / 0.9) 0%, hsl(220 15% 8% / 0.95) 100%)',
                WebkitMaskImage: `url(${silhouetteUrl})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: `url(${silhouetteUrl})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
              }}
            />
          )}

          {/* Holographic grid overlay — masked to body shape */}
          {imageLoaded && (
            <motion.div
              className="absolute inset-0 z-[2] pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{
                backgroundImage:
                  'linear-gradient(hsl(45 88% 50% / 0.18) 1px, transparent 1px), linear-gradient(90deg, hsl(45 88% 50% / 0.18) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
                WebkitMaskImage: `url(${silhouetteUrl})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: `url(${silhouetteUrl})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
              }}
            />
          )}

          {/* Inner volumetric glow — also masked */}
          {imageLoaded && (
            <div
              className="absolute inset-0 z-[3] pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 50% 70% at 50% 40%, hsl(45 88% 50% / 0.18), transparent 70%)',
                boxShadow: 'inset 0 0 20px hsl(45 88% 50% / 0.3)',
                WebkitMaskImage: `url(${silhouetteUrl})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskImage: `url(${silhouetteUrl})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
              }}
            />
          )}

          {/* Measurement callouts: dots + lines + labels */}
          {imageLoaded && OVERLAYS.map((overlay) => {
            const val = getValue(overlay.key);
            if (!val) return null;
            const isLeft = overlay.side === 'left';

            return (
              <motion.div
                key={overlay.key}
                className="absolute z-[5]"
                style={{ top: overlay.dotTop, left: overlay.dotLeft }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: overlay.delay + 0.5, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Sonar pulse rings */}
                <span className="absolute -inset-[6px] rounded-full border border-primary/40 animate-[sonar-ping_2s_ease-out_infinite]" />
                <span className="absolute -inset-[3px] rounded-full border border-primary/60 animate-[sonar-ping_2s_ease-out_0.3s_infinite]" />
                {/* Gold dot */}
                <span
                  className="block w-[6px] h-[6px] rounded-full"
                  style={{
                    background: 'radial-gradient(circle, hsl(45 95% 70%), hsl(45 88% 50%))',
                    boxShadow: '0 0 6px 2px hsl(45 88% 50% / 0.7)',
                  }}
                />

                {/* Connecting line + label */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 whitespace-nowrap"
                  style={isLeft ? { right: '100%', marginRight: 6, flexDirection: 'row-reverse' } : { left: '100%', marginLeft: 6 }}
                >
                  {/* Thin gradient connector */}
                  <span
                    className="block h-[0.5px] w-6"
                    style={{
                      background: isLeft
                        ? 'linear-gradient(to left, hsl(45 88% 50% / 0.8), transparent)'
                        : 'linear-gradient(to right, hsl(45 88% 50% / 0.8), transparent)',
                    }}
                  />
                  {/* Label card */}
                  <div
                    className="rounded-md px-2 py-1"
                    style={{
                      background: 'hsl(0 0% 0% / 0.6)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '0.5px solid hsl(45 88% 50% / 0.2)',
                      textAlign: isLeft ? 'right' : 'left',
                    }}
                  >
                    <p className="text-[9px] font-bold tracking-widest text-primary/70 leading-none mb-0.5">
                      {overlay.label}
                    </p>
                    <p className="text-[11px] font-black text-foreground leading-tight">
                      {val.line1}
                    </p>
                    <p className="text-[9px] font-medium text-muted-foreground leading-tight">
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
  );
};

export default BodyDiagram;
