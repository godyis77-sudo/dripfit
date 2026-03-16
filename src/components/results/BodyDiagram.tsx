import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MeasurementRange } from '@/lib/types';
import bodySilhouetteMask from '@/assets/body-silhouette-mask.png';
import hudScanBg from '@/assets/hud-scan-bg.jpg';
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
  { key: 'height',   label: 'HEIGHT',   side: 'left',  valTop: '5%',    delay: 0,    dotTop: '5%',   dotLeft: '15%' },
  { key: 'shoulder', label: 'SHOULDER', side: 'right', valTop: '17%',   delay: 0.12, dotTop: '20%',  dotLeft: '64%' },
  { key: 'chest',    label: 'CHEST',    side: 'left',  valTop: '25%',   delay: 0.22, dotTop: '28%',  dotLeft: '40%' },
  { key: 'bust',     label: 'BUST',     side: 'right', valTop: '28%',   delay: 0.30, dotTop: '30%',  dotLeft: '58%' },
  { key: 'sleeve',   label: 'SLEEVE',   side: 'left',  valTop: '35%',   delay: 0.38, dotTop: '36%',  dotLeft: '32%' },
  { key: 'waist',    label: 'WAIST',    side: 'right', valTop: '39%',   delay: 0.46, dotTop: '42%',  dotLeft: '58%' },
  { key: 'hips',     label: 'HIPS',     side: 'right', valTop: '50%',   delay: 0.54, dotTop: '50%',  dotLeft: '60%' },
  { key: 'inseam',   label: 'INSEAM',   side: 'left',  valTop: '66%',   delay: 0.62, dotTop: '67%',  dotLeft: '46%' },
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

/* ── Scan line sweep ── */
const ScanLine = () => (
  <motion.div
    className="absolute left-0 right-0 h-[2px] z-[2] pointer-events-none"
    style={{
      background: 'linear-gradient(90deg, transparent 0%, hsl(42 76% 50% / 0) 5%, hsl(42 76% 55% / 0.9) 50%, hsl(42 76% 50% / 0) 95%, transparent 100%)',
      boxShadow: '0 0 24px 8px hsl(42 76% 50% / 0.5), 0 0 80px 20px hsl(42 76% 50% / 0.15)',
    }}
    initial={{ top: '0%' }}
    animate={{ top: ['0%', '100%', '0%'] }}
    transition={{ duration: 5, ease: 'linear', repeat: Infinity, repeatDelay: 1.5 }}
  />
);

/* ── Floating data particles ── */
const DataParticles = () => {
  const particles = useRef(
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: Math.random() * 100,
      size: 1 + Math.random() * 1.5,
      duration: 2.5 + Math.random() * 3.5,
      delay: Math.random() * 4,
    }))
  ).current;

  return (
    <div className="absolute inset-0 pointer-events-none z-[2] overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: 'hsl(42 80% 60%)',
            boxShadow: `0 0 ${p.size * 4}px ${p.size * 1.5}px hsl(42 76% 50% / 0.5)`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, (Math.random() - 0.5) * 8, 0],
            opacity: [0, 0.8, 0],
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

/* ── Corner bracket decorations — larger + brighter ── */
const CornerBrackets = () => {
  const bracketStyle = 'absolute w-5 h-5 pointer-events-none z-[5]';
  const stroke = 'hsl(42 76% 55% / 0.7)';
  return (
    <>
      <svg className={`${bracketStyle} top-2.5 left-2.5`} viewBox="0 0 16 16" fill="none">
        <path d="M0 8 L0 0 L8 0" stroke={stroke} strokeWidth="1.5" />
      </svg>
      <svg className={`${bracketStyle} top-2.5 right-2.5`} viewBox="0 0 16 16" fill="none">
        <path d="M8 0 L16 0 L16 8" stroke={stroke} strokeWidth="1.5" />
      </svg>
      <svg className={`${bracketStyle} bottom-2.5 left-2.5`} viewBox="0 0 16 16" fill="none">
        <path d="M0 8 L0 16 L8 16" stroke={stroke} strokeWidth="1.5" />
      </svg>
      <svg className={`${bracketStyle} bottom-2.5 right-2.5`} viewBox="0 0 16 16" fill="none">
        <path d="M8 16 L16 16 L16 8" stroke={stroke} strokeWidth="1.5" />
      </svg>
    </>
  );
};

/* ── HUD status bar ── */
const HudStatusBar = ({ useCm }: { useCm: boolean }) => (
  <motion.div
    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[7]"
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 1, duration: 0.5 }}
  >
    <div
      className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 backdrop-blur-xl border border-primary/20"
      style={{ background: 'hsl(220 15% 3% / 0.7)' }}
    >
      <span className="text-[7px] font-mono uppercase tracking-[0.12em] text-primary/70 font-bold">
        NEURAL MAP
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_2px_hsl(142_71%_45%/0.6)]" />
      <span className="text-[7px] font-mono uppercase tracking-[0.12em] text-primary/50">
        TAP→{useCm ? 'IN' : 'CM'}
      </span>
    </div>
  </motion.div>
);

/* ── Horizontal measurement tick marks ── */
const TickMarks = () => (
  <div className="absolute inset-0 pointer-events-none z-[1]">
    {/* Left edge ticks */}
    {Array.from({ length: 20 }, (_, i) => (
      <div
        key={`lt-${i}`}
        className="absolute left-0"
        style={{
          top: `${5 + i * 4.5}%`,
          width: i % 5 === 0 ? 10 : 5,
          height: 1,
          background: `hsl(42 76% 50% / ${i % 5 === 0 ? 0.25 : 0.1})`,
        }}
      />
    ))}
    {/* Right edge ticks */}
    {Array.from({ length: 20 }, (_, i) => (
      <div
        key={`rt-${i}`}
        className="absolute right-0"
        style={{
          top: `${5 + i * 4.5}%`,
          width: i % 5 === 0 ? 10 : 5,
          height: 1,
          background: `hsl(42 76% 50% / ${i % 5 === 0 ? 0.25 : 0.1})`,
        }}
      />
    ))}
  </div>
);

/* ── Body rim-light / edge glow ── */
const BodyRimLight = () => (
  <div
    className="absolute inset-0 pointer-events-none z-[1]"
    style={{
      background: 'radial-gradient(ellipse 45% 50% at 50% 45%, hsl(42 76% 50% / 0.08) 0%, transparent 70%)',
    }}
  />
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * 0.02;
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
          className="relative w-full max-w-[380px] aspect-[3/4] rounded-[1rem] border-[2px] border-primary/50 cursor-pointer animate-breathing-glow overflow-hidden"
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

          {/* Layer 0: HUD Background — fills the 3:4 card */}
          <img
            src={hudScanBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-70"
            aria-hidden="true"
          />
          {/* Subtle dark wash — just enough to keep labels readable */}
          <div className="absolute inset-0 bg-background/30" />

          {/* Layer 1: Body silhouette — bright gold tint, strong glow */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `translateY(${parallaxY}px)` }}
          >
            <img
              src={bodySilhouette}
              alt="Body measurement scan"
              className="h-[88%] w-auto object-contain drop-shadow-[0_0_40px_hsl(42_76%_50%/0.4)]"
              onLoad={() => setImageLoaded(true)}
              style={{
                filter: 'sepia(0.35) saturate(1.6) brightness(1.6) contrast(1.05)',
              }}
            />
          </motion.div>

          {/* Layer 2: Body rim-light glow */}
          {imageLoaded && <BodyRimLight />}

          {/* Layer 3: Edge tick marks */}
          {imageLoaded && <TickMarks />}

          {/* Layer 4: Scan line sweep */}
          {imageLoaded && <ScanLine />}

          {/* Layer 5: Data particles */}
          {imageLoaded && <DataParticles />}

          {/* Layer 6: Corner brackets */}
          {imageLoaded && <CornerBrackets />}

          {/* Layer 7: SVG leader lines */}
          {imageLoaded && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-[3]"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              fill="none"
            >
              <defs>
                <linearGradient id="line-grad-l" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor="hsl(42 76% 55% / 0.6)" />
                  <stop offset="100%" stopColor="hsl(42 76% 55% / 0.05)" />
                </linearGradient>
                <linearGradient id="line-grad-r" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(42 76% 55% / 0.6)" />
                  <stop offset="100%" stopColor="hsl(42 76% 55% / 0.05)" />
                </linearGradient>
              </defs>
              {activeOverlays.map(overlay => {
                const dotX = parseFloat(overlay.dotLeft);
                const dotY = parseFloat(overlay.dotTop);
                const labelX = overlay.side === 'left' ? 3 : 97;
                const labelY = parseFloat(overlay.valTop) + 2;
                const gradId = overlay.side === 'left' ? 'line-grad-l' : 'line-grad-r';

                return (
                  <motion.path
                    key={`line-${overlay.key}`}
                    d={`M ${dotX} ${dotY} L ${labelX} ${labelY}`}
                    stroke={`url(#${gradId})`}
                    strokeWidth="0.3"
                    strokeDasharray="1.2 0.5"
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

          {/* Layer 8: Pulsing hotspot dots — smaller, precise */}
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
              {/* Sonar rings — smaller */}
              <span className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25 animate-[sonar-ping_3s_ease-out_infinite]" />
              <span
                className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15 animate-[sonar-ping_3s_ease-out_infinite]"
                style={{ animationDelay: '1s' }}
              />
              {/* Core dot */}
              <span
                className="block w-[4px] h-[4px] rounded-full bg-primary"
                style={{
                  boxShadow: '0 0 3px 1px hsl(42 76% 55% / 0.8), 0 0 8px 2px hsl(42 76% 50% / 0.3)',
                }}
              />
            </motion.div>
          ))}

          {/* Layer 9: Glassmorphic measurement labels — premium */}
          {imageLoaded && activeOverlays.map(overlay => {
            const val = getValue(overlay.key)!;
            return (
              <motion.div
                key={overlay.key}
                className="absolute z-[5]"
                style={{
                  top: overlay.valTop,
                  ...(overlay.side === 'left' ? { left: '2%' } : { right: '2%' }),
                }}
                initial={{ opacity: 0, x: overlay.side === 'left' ? -12 : 12, scale: 0.85 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: overlay.delay + 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="rounded-lg px-2 py-1 backdrop-blur-xl border hud-label-premium"
                  style={{ textAlign: overlay.side === 'left' ? 'left' : 'right' }}
                >
                  <p className="text-[7px] font-mono font-bold uppercase tracking-[0.15em] text-primary leading-none mb-[2px]">
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

          {/* Layer 10: HUD status bar */}
          {imageLoaded && <HudStatusBar useCm={useCm} />}

          {/* Outer frame */}
          <div
            className="absolute -inset-[5px] rounded-[calc(1rem+2px)] border-[3px] border-black/80 pointer-events-none z-[8]"
            style={{
              boxShadow:
                'inset 0 0 10px 3px hsl(42 76% 50% / 0.5), 0 0 14px 4px hsl(42 76% 50% / 0.4), 0 0 35px 8px hsl(42 76% 50% / 0.15)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
