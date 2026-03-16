import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MeasurementRange } from '@/lib/types';
import scanResultsFull from '@/assets/scan-results-full.jpg';
import { getUseCm, setUseCm } from '@/lib/session';

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
  /** Dot position for the sonar pulse (percentage-based) */
  dotTop: string;
  dotLeft: string;
}

const OVERLAYS: MeasurementOverlay[] = [
  { key: 'height',   label: 'HEIGHT',   side: 'left',  valTop: '10%',   delay: 0,    dotTop: '2%',   dotLeft: '12%' },
  { key: 'shoulder', label: 'SHOULDER', side: 'right', valTop: '21%',   delay: 0.05, dotTop: '19%',  dotLeft: '68%' },
  { key: 'chest',    label: 'CHEST',    side: 'left',  valTop: '26.5%', delay: 0.1,  dotTop: '27%',  dotLeft: '32%' },
  { key: 'bust',     label: 'BUST',     side: 'right', valTop: '28.5%', delay: 0.15, dotTop: '29%',  dotLeft: '68%' },
  { key: 'sleeve',   label: 'SLEEVE',   side: 'left',  valTop: '36%',   delay: 0.2,  dotTop: '35%',  dotLeft: '28%' },
  { key: 'waist',    label: 'WAIST',    side: 'right', valTop: '40.5%', delay: 0.25, dotTop: '41%',  dotLeft: '68%' },
  { key: 'hips',     label: 'HIPS',     side: 'right', valTop: '48.5%', delay: 0.3,  dotTop: '49%',  dotLeft: '65%' },
  { key: 'inseam',   label: 'INSEAM',   side: 'left',  valTop: '65%',   delay: 0.35, dotTop: '68%',  dotLeft: '48%' },
];

/** Number scramble effect for unit toggle */
const ScrambleValue = ({ value, scrambling }: { value: string; scrambling: boolean }) => {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!scrambling) {
      setDisplay(value);
      return;
    }
    const chars = '0123456789.–—\' "';
    let count = 0;
    const maxFrames = 8;
    const tick = () => {
      count++;
      if (count >= maxFrames) {
        setDisplay(value);
        return;
      }
      setDisplay(
        value
          .split('')
          .map((c) => (/[0-9.]/.test(c) ? chars[Math.floor(Math.random() * 10)] : c))
          .join('')
      );
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, scrambling]);

  return <>{display}</>;
};

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [useCm, setUseCmLocal] = useState(getUseCm());
  const [scrambling, setScrambling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallaxY, setParallaxY] = useState(0);

  // Parallax on scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollParent = el.closest('[class*="overflow"]') || window;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const viewCenter = window.innerHeight / 2;
      const offset = (center - viewCenter) * 0.03; // subtle parallax
      setParallaxY(offset);
    };

    const target = scrollParent === window ? window : scrollParent;
    target.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => target.removeEventListener('scroll', handleScroll);
  }, []);

  // Unit toggle with scramble
  const toggleUnit = useCallback(() => {
    setScrambling(true);
    const next = !useCm;
    setUseCmLocal(next);
    setUseCm(next);
    setTimeout(() => setScrambling(false), 500);
  }, [useCm]);

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

  const activeOverlays = OVERLAYS.filter((o) => getValue(o.key) !== null);

  return (
    <div className="mb-4" ref={containerRef}>
      <div className="flex justify-center">
        <div
          className="relative rounded-[1rem] border-[3px] border-primary cursor-pointer animate-breathing-glow"
          onClick={toggleUnit}
          role="button"
          aria-label="Toggle measurement units"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleUnit()}
        >
          <span className="sr-only">
            {`Body measurements diagram: ${[
              `Height ${heightCm} cm`,
              ...OVERLAYS
                .filter(l => l.key !== 'height' && measurements[l.key])
                .map(l => `${l.label} ${measurements[l.key].min.toFixed(0)}–${measurements[l.key].max.toFixed(0)} cm`),
            ].join(', ')}.`}
          </span>

          {/* Background layer — parallax offset */}
          <motion.div
            className="overflow-hidden rounded-[calc(1rem-3px)]"
            style={{ transform: `translateY(${parallaxY}px)` }}
          >
            <img
              src={scanResultsFull}
              alt="Body measurement scan results"
              className="w-full max-w-[380px] object-cover"
              onLoad={() => setImageLoaded(true)}
            />
          </motion.div>

          {/* SVG leader lines layer */}
          {imageLoaded && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              fill="none"
            >
              {activeOverlays.map((overlay) => {
                const dotX = parseFloat(overlay.dotLeft);
                const dotY = parseFloat(overlay.dotTop);
                const labelX = overlay.side === 'left' ? 5 : 95;
                const labelY = parseFloat(overlay.valTop) + 2;
                // Curved line from dot to label
                const midX = (dotX + labelX) / 2;

                return (
                  <motion.path
                    key={`line-${overlay.key}`}
                    d={`M ${dotX} ${dotY} Q ${midX} ${dotY} ${labelX} ${labelY}`}
                    stroke="hsl(42 76% 42% / 0.35)"
                    strokeWidth="0.3"
                    strokeLinecap="round"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      pathLength: { delay: overlay.delay + 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                      opacity: { delay: overlay.delay + 0.5, duration: 0.2 },
                    }}
                  />
                );
              })}
            </svg>
          )}

          {/* Pulsing hotspot dots */}
          {imageLoaded && activeOverlays.map((overlay) => (
            <motion.div
              key={`dot-${overlay.key}`}
              className="absolute z-[2]"
              style={{
                top: overlay.dotTop,
                left: overlay.dotLeft,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: overlay.delay + 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Sonar rings */}
              <span className="absolute inset-0 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 animate-[sonar-ping_2s_ease-out_infinite]" />
              <span
                className="absolute inset-0 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 animate-[sonar-ping_2s_ease-out_infinite]"
                style={{ animationDelay: '0.6s' }}
              />
              {/* Core dot */}
              <span className="block w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_2px_hsl(42_76%_42%/0.6)]" />
            </motion.div>
          ))}

          {/* Glassmorphic measurement labels */}
          {imageLoaded && activeOverlays.map((overlay) => {
            const val = getValue(overlay.key)!;

            return (
              <motion.div
                key={overlay.key}
                className="absolute z-[3]"
                style={{
                  top: overlay.valTop,
                  ...(overlay.side === 'left' ? { left: '2%' } : { right: '2%' }),
                }}
                initial={{ opacity: 0, x: overlay.side === 'left' ? -8 : 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: overlay.delay + 0.6, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="rounded-md px-1.5 py-0.5 backdrop-blur-md border"
                  style={{
                    background: 'hsla(220, 15%, 3%, 0.55)',
                    borderColor: 'hsl(42 76% 42% / 0.25)',
                    textAlign: overlay.side === 'left' ? 'left' : 'right',
                  }}
                >
                  <p className="text-[8px] font-bold uppercase tracking-wider text-primary/70 leading-none mb-0.5">
                    {overlay.label}
                  </p>
                  <p className="text-[11px] font-black leading-tight text-foreground">
                    <ScrambleValue value={val.line1} scrambling={scrambling} />
                  </p>
                  <p className="text-[9px] font-medium leading-tight text-muted-foreground">
                    <ScrambleValue value={val.line2} scrambling={scrambling} />
                  </p>
                </div>
              </motion.div>
            );
          })}

          {/* Unit toggle hint */}
          <AnimatePresence>
            {imageLoaded && (
              <motion.div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[4]"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.4 }}
              >
                <span className="text-[9px] font-medium text-primary/50 bg-background/60 backdrop-blur-sm rounded-full px-2 py-0.5 border border-primary/10">
                  tap to toggle {useCm ? 'in' : 'cm'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Outer black frame */}
          <div
            className="absolute -inset-[7px] rounded-[calc(1rem+4px)] border-[4px] border-black pointer-events-none"
            style={{
              boxShadow:
                'inset 0 0 8px 2px hsl(45 88% 50% / 0.7), 0 0 10px 2px hsl(45 88% 50% / 0.6), 0 0 20px 4px hsl(45 88% 50% / 0.25)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
