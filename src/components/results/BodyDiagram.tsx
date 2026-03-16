import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MeasurementRange } from '@/lib/types';
import bodySilhouette from '@/assets/body-silhouette-clean.webp';
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
  dotTop: string;
  dotLeft: string;
}

const OVERLAYS: MeasurementOverlay[] = [
  { key: 'height',   label: 'HEIGHT',   side: 'left',  valTop: '6%',    delay: 0,    dotTop: '2%',   dotLeft: '50%' },
  { key: 'shoulder', label: 'SHOULDER', side: 'right', valTop: '18%',   delay: 0.12, dotTop: '20%',  dotLeft: '66%' },
  { key: 'chest',    label: 'CHEST',    side: 'left',  valTop: '25%',   delay: 0.22, dotTop: '28%',  dotLeft: '38%' },
  { key: 'bust',     label: 'BUST',     side: 'right', valTop: '27%',   delay: 0.30, dotTop: '30%',  dotLeft: '62%' },
  { key: 'sleeve',   label: 'SLEEVE',   side: 'left',  valTop: '35%',   delay: 0.38, dotTop: '36%',  dotLeft: '30%' },
  { key: 'waist',    label: 'WAIST',    side: 'right', valTop: '38%',   delay: 0.46, dotTop: '42%',  dotLeft: '60%' },
  { key: 'hips',     label: 'HIPS',     side: 'right', valTop: '49%',   delay: 0.54, dotTop: '50%',  dotLeft: '62%' },
  { key: 'inseam',   label: 'INSEAM',   side: 'left',  valTop: '65%',   delay: 0.62, dotTop: '67%',  dotLeft: '48%' },
];

/* ── Number scramble on unit toggle ── */
const ScrambleValue = ({ value, scrambling }: { value: string; scrambling: boolean }) => {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!scrambling) { setDisplay(value); return; }
    let count = 0;
    const maxFrames = 10;
    const tick = () => {
      count++;
      if (count >= maxFrames) { setDisplay(value); return; }
      setDisplay(
        value.split('').map(c => /[0-9.]/.test(c) ? '0123456789'[Math.floor(Math.random() * 10)] : c).join('')
      );
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, scrambling]);

  return <>{display}</>;
};

/* ── Holographic technical grid (SVG) ── */
const HoloGrid = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1] opacity-[0.07]" preserveAspectRatio="none" viewBox="0 0 100 100">
    <defs>
      <pattern id="holo-grid" width="5" height="5" patternUnits="userSpaceOnUse">
        <path d="M 5 0 L 0 0 0 5" fill="none" stroke="hsl(42 76% 50%)" strokeWidth="0.15" />
      </pattern>
    </defs>
    <rect width="100" height="100" fill="url(#holo-grid)" />
  </svg>
);

/* ── Scan line sweep ── */
const ScanLine = () => (
  <motion.div
    className="absolute left-0 right-0 h-[2px] z-[2] pointer-events-none"
    style={{
      background: 'linear-gradient(90deg, transparent 0%, hsl(42 76% 50% / 0.0) 10%, hsl(42 76% 50% / 0.8) 50%, hsl(42 76% 50% / 0.0) 90%, transparent 100%)',
      boxShadow: '0 0 20px 6px hsl(42 76% 50% / 0.4), 0 0 60px 15px hsl(42 76% 50% / 0.15)',
    }}
    initial={{ top: '0%' }}
    animate={{ top: ['0%', '100%', '0%'] }}
    transition={{ duration: 6, ease: 'linear', repeat: Infinity, repeatDelay: 2 }}
  />
);

/* ── Floating data particles ── */
const DataParticles = () => {
  const particles = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
    }))
  ).current;

  return (
    <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: 'hsl(42 76% 55%)',
            boxShadow: `0 0 ${p.size * 3}px ${p.size}px hsl(42 76% 50% / 0.4)`,
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0, 0.7, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

/* ── Corner bracket decorations ── */
const CornerBrackets = () => {
  const bracketStyle = 'absolute w-4 h-4 pointer-events-none z-[5]';
  const stroke = 'hsl(42 76% 50% / 0.5)';
  return (
    <>
      {/* Top-left */}
      <svg className={`${bracketStyle} top-2 left-2`} viewBox="0 0 16 16" fill="none">
        <path d="M0 8 L0 0 L8 0" stroke={stroke} strokeWidth="1.5" />
      </svg>
      {/* Top-right */}
      <svg className={`${bracketStyle} top-2 right-2`} viewBox="0 0 16 16" fill="none">
        <path d="M8 0 L16 0 L16 8" stroke={stroke} strokeWidth="1.5" />
      </svg>
      {/* Bottom-left */}
      <svg className={`${bracketStyle} bottom-2 left-2`} viewBox="0 0 16 16" fill="none">
        <path d="M0 8 L0 16 L8 16" stroke={stroke} strokeWidth="1.5" />
      </svg>
      {/* Bottom-right */}
      <svg className={`${bracketStyle} bottom-2 right-2`} viewBox="0 0 16 16" fill="none">
        <path d="M8 16 L16 16 L16 8" stroke={stroke} strokeWidth="1.5" />
      </svg>
    </>
  );
};

/* ── HUD status bar ── */
const HudStatusBar = ({ useCm }: { useCm: boolean }) => (
  <motion.div
    className="absolute top-1.5 left-1/2 -translate-x-1/2 z-[6] flex items-center gap-2"
    initial={{ opacity: 0, y: -8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.8, duration: 0.5 }}
  >
    <span className="text-[7px] font-mono uppercase tracking-[0.2em] text-primary/50">
      NEURAL MAP
    </span>
    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_4px_1px_hsl(142_71%_45%/0.6)]" />
    <span className="text-[7px] font-mono uppercase tracking-[0.2em] text-primary/50">
      {useCm ? 'METRIC' : 'IMPERIAL'}
    </span>
  </motion.div>
);

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
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
    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const offset = (center - window.innerHeight / 2) * 0.025;
      setParallaxY(offset);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const activeOverlays = OVERLAYS.filter(o => getValue(o.key) !== null);

  return (
    <div className="mb-4" ref={containerRef}>
      <div className="flex justify-center">
        <div
          className="relative rounded-[1rem] border-[2px] border-primary/60 cursor-pointer animate-breathing-glow overflow-hidden"
          onClick={toggleUnit}
          role="button"
          aria-label="Toggle measurement units"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && toggleUnit()}
        >
          <span className="sr-only">
            {`Body measurements diagram: ${[
              `Height ${heightCm} cm`,
              ...OVERLAYS
                .filter(l => l.key !== 'height' && measurements[l.key])
                .map(l => `${l.label} ${measurements[l.key].min.toFixed(0)}–${measurements[l.key].max.toFixed(0)} cm`),
            ].join(', ')}.`}
          </span>

          {/* Layer 0: Background image with parallax */}
          <motion.div
            className="relative"
            style={{ transform: `translateY(${parallaxY}px)` }}
          >
            <img
              src={bodySilhouette}
              alt="Body measurement scan"
              className="w-full max-w-[380px] object-contain"
              onLoad={() => setImageLoaded(true)}
              style={{
                filter: 'sepia(0.3) saturate(1.4) brightness(1.05) contrast(1.1)',
              }}
            />
            {/* Dark vignette overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 30%, hsl(220 15% 3% / 0.6) 100%)',
              }}
            />
          </motion.div>

          {/* Layer 1: Holographic grid */}
          {imageLoaded && <HoloGrid />}

          {/* Layer 2: Scan line sweep */}
          {imageLoaded && <ScanLine />}

          {/* Layer 3: Data particles */}
          {imageLoaded && <DataParticles />}

          {/* Layer 4: Corner brackets */}
          {imageLoaded && <CornerBrackets />}

          {/* Layer 5: HUD status */}
          {imageLoaded && <HudStatusBar useCm={useCm} />}

          {/* Layer 6: SVG leader lines */}
          {imageLoaded && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-[3]"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              fill="none"
            >
              <defs>
                <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(42 76% 50% / 0)" />
                  <stop offset="50%" stopColor="hsl(42 76% 50% / 0.5)" />
                  <stop offset="100%" stopColor="hsl(42 76% 50% / 0)" />
                </linearGradient>
              </defs>
              {activeOverlays.map(overlay => {
                const dotX = parseFloat(overlay.dotLeft);
                const dotY = parseFloat(overlay.dotTop);
                const labelX = overlay.side === 'left' ? 4 : 96;
                const labelY = parseFloat(overlay.valTop) + 2.5;

                return (
                  <motion.path
                    key={`line-${overlay.key}`}
                    d={`M ${dotX} ${dotY} L ${labelX} ${labelY}`}
                    stroke="url(#line-grad)"
                    strokeWidth="0.2"
                    strokeDasharray="1 0.8"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      pathLength: { delay: overlay.delay + 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                      opacity: { delay: overlay.delay + 0.6, duration: 0.15 },
                    }}
                  />
                );
              })}
            </svg>
          )}

          {/* Layer 7: Pulsing hotspot dots */}
          {imageLoaded && activeOverlays.map(overlay => (
            <motion.div
              key={`dot-${overlay.key}`}
              className="absolute z-[4]"
              style={{
                top: overlay.dotTop,
                left: overlay.dotLeft,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: overlay.delay + 0.4, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Outer sonar ring */}
              <span
                className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30 animate-[sonar-ping_2.5s_ease-out_infinite]"
              />
              <span
                className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20 animate-[sonar-ping_2.5s_ease-out_infinite]"
                style={{ animationDelay: '0.8s' }}
              />
              {/* Core dot with intense glow */}
              <span
                className="block w-[5px] h-[5px] rounded-full bg-primary"
                style={{
                  boxShadow: '0 0 4px 1px hsl(42 76% 50% / 0.8), 0 0 12px 3px hsl(42 76% 50% / 0.3)',
                }}
              />
            </motion.div>
          ))}

          {/* Layer 8: Glassmorphic measurement labels */}
          {imageLoaded && activeOverlays.map(overlay => {
            const val = getValue(overlay.key)!;
            return (
              <motion.div
                key={overlay.key}
                className="absolute z-[5]"
                style={{
                  top: overlay.valTop,
                  ...(overlay.side === 'left' ? { left: '1.5%' } : { right: '1.5%' }),
                }}
                initial={{ opacity: 0, x: overlay.side === 'left' ? -10 : 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: overlay.delay + 0.7, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="rounded-lg px-2 py-1 backdrop-blur-xl border hud-label-glass"
                  style={{
                    textAlign: overlay.side === 'left' ? 'left' : 'right',
                  }}
                >
                  <p className="text-[7px] font-mono font-bold uppercase tracking-[0.15em] text-primary/60 leading-none mb-[2px]">
                    {overlay.label}
                  </p>
                  <p className="text-[11px] font-black leading-tight text-foreground hud-data-glow">
                    <ScrambleValue value={val.line1} scrambling={scrambling} />
                  </p>
                  <p className="text-[8.5px] font-medium leading-tight text-muted-foreground">
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
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[6]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2, duration: 0.5 }}
              >
                <span
                  className="text-[8px] font-mono uppercase tracking-[0.15em] text-primary/40 backdrop-blur-md rounded-full px-2.5 py-1 border border-primary/10"
                  style={{ background: 'hsl(220 15% 3% / 0.5)' }}
                >
                  ◈ tap to toggle {useCm ? 'imperial' : 'metric'} ◈
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Outer frame with enhanced glow */}
          <div
            className="absolute -inset-[5px] rounded-[calc(1rem+2px)] border-[3px] border-black/80 pointer-events-none"
            style={{
              boxShadow:
                'inset 0 0 8px 2px hsl(42 76% 50% / 0.5), 0 0 12px 3px hsl(42 76% 50% / 0.4), 0 0 30px 6px hsl(42 76% 50% / 0.15)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
