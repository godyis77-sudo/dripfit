import { useState, useCallback, useEffect, useRef, useMemo, forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { MeasurementRange } from '@/lib/types';
import bodySilhouette from '@/assets/body-silhouette-clean-3.png';
import { getUseCm, setUseCm } from '@/lib/session';

const CM_TO_IN = 0.3937;
const fmtCm = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;
const fmtHeightFtIn = (cm: number) => {
  const totalIn = Math.round(cm * CM_TO_IN);
  return `${Math.floor(totalIn / 12)}' ${totalIn % 12}"`;
};
const LUXURY_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

let processedSilhouetteCache: string | null = null;
let processedSilhouettePromise: Promise<string> | null = null;

// Remove white background from silhouette
const createProcessedSilhouette = (imageSrc: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = imageSrc;
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(imageSrc); return; }
      ctx.drawImage(img, 0, 0);
      const frame = ctx.getImageData(0, 0, W, H);
      const px = frame.data;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const lum = (r + g + b) / 3;
        const chroma = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
        // Anything light or neutral-ish → gone
        if (lum > 120 || (chroma < 40 && lum > 80)) {
          px[i + 3] = 0;
        } else if (lum > 60) {
          px[i + 3] = Math.round(px[i + 3] * Math.max(0, (120 - lum) / 60));
        }
      }
      ctx.putImageData(frame, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
  });

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
  { key: 'height',   label: 'HEIGHT',   side: 'left',  valTop: '5%',  delay: 0,    dotTop: '5%',  dotLeft: '15%' },
  { key: 'shoulder', label: 'SHOULDER', side: 'right', valTop: '17%', delay: 0.35, dotTop: '20%', dotLeft: '64%' },
  { key: 'chest',    label: 'CHEST',    side: 'left',  valTop: '25%', delay: 0.7,  dotTop: '28%', dotLeft: '40%' },
  { key: 'bust',     label: 'BUST',     side: 'right', valTop: '28%', delay: 1.05, dotTop: '30%', dotLeft: '58%' },
  { key: 'sleeve',   label: 'SLEEVE',   side: 'left',  valTop: '35%', delay: 1.4,  dotTop: '36%', dotLeft: '32%' },
  { key: 'waist',    label: 'WAIST',    side: 'right', valTop: '40%', delay: 1.75, dotTop: '42%', dotLeft: '58%' },
  { key: 'hips',     label: 'HIPS',     side: 'right', valTop: '50%', delay: 2.1,  dotTop: '50%', dotLeft: '60%' },
  { key: 'inseam',   label: 'INSEAM',   side: 'left',  valTop: '66%', delay: 2.45, dotTop: '67%', dotLeft: '46%' },
];

/* ── Number scramble ── */
const ScrambleValue = ({ value, scrambling }: { value: string; scrambling: boolean }) => {
  const [display, setDisplay] = useState(value);
  const frameRef = useRef(0);
  useEffect(() => {
    if (!scrambling) { setDisplay(value); return; }
    let count = 0;
    const tick = () => {
      count++;
      if (count >= 10) { setDisplay(value); return; }
      setDisplay(value.split('').map(c => /[0-9.]/.test(c) ? '0123456789'[Math.floor(Math.random() * 10)] : c).join(''));
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, scrambling]);
  return <span>{display}</span>;
};

/* ── Dual scan lines — CSS animation for GPU compositing (no layout shifts) ── */
const ScanLines = () => (
  <>
    <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
      <motion.div
        className="absolute left-0 right-0 h-[2px] will-change-transform"
        style={{
          background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0) 8%, hsl(var(--primary) / 0.85) 50%, hsl(var(--primary) / 0) 92%, transparent)',
          boxShadow: '0 0 30px 10px hsl(var(--primary) / 0.45), 0 0 80px 20px hsl(var(--primary) / 0.12)',
          top: 0,
        }}
        animate={{ y: ['0cqh', '100cqh', '0cqh'] as any }}
        transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
      />
    </div>
    <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
      <motion.div
        className="absolute left-0 right-0 h-[1px] opacity-40 will-change-transform"
        style={{
          background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5) 50%, transparent)',
          bottom: 0,
        }}
        animate={{ y: ['0cqh', '-100cqh', '0cqh'] as any }}
        transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
      />
    </div>
  </>
);

/* ── Hex grid background ── */
const HexGrid = () => {
  const hexSize = 18;
  const rows = 22;
  const cols = 12;
  const hexes = useMemo(() => {
    const result: { x: number; y: number; opacity: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * hexSize * 1.73 + (r % 2 ? hexSize * 0.866 : 0);
        const y = r * hexSize * 1.5;
        const dist = Math.sqrt((x - 110) ** 2 + (y - 200) ** 2);
        const opacity = Math.max(0.02, 0.12 - dist * 0.0003);
        result.push({ x, y, opacity });
      }
    }
    return result;
  }, []);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]" preserveAspectRatio="xMidYMid slice">
      {hexes.map((h, i) => (
        <polygon
          key={i}
          points={Array.from({ length: 6 }, (_, j) => {
            const angle = (Math.PI / 3) * j - Math.PI / 6;
            return `${h.x + hexSize * 0.45 * Math.cos(angle)},${h.y + hexSize * 0.45 * Math.sin(angle)}`;
          }).join(' ')}
          fill="none"
          stroke={`hsl(var(--primary) / ${h.opacity})`}
          strokeWidth="0.4"
        />
      ))}
    </svg>
  );
};

/* ── Polar coordinate grid — concentric rings + radial lines ── */
const PolarGrid = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
    {/* Concentric measurement rings */}
    {[8, 16, 24, 32, 40].map((r, i) => (
      <circle key={`ring-${i}`} cx="50" cy="44" r={r} fill="none"
        stroke={`hsl(var(--primary) / ${0.06 - i * 0.008})`} strokeWidth="0.15"
        strokeDasharray={i % 2 === 0 ? 'none' : '0.8 0.4'} />
    ))}
    {/* Radial lines */}
    {Array.from({ length: 12 }, (_, i) => {
      const angle = (i * 30 * Math.PI) / 180;
      const x2 = 50 + 42 * Math.cos(angle);
      const y2 = 44 + 42 * Math.sin(angle);
      return (
        <line key={`rad-${i}`} x1="50" y1="44" x2={x2} y2={y2}
          stroke={`hsl(var(--primary) / ${i % 3 === 0 ? 0.06 : 0.025})`}
          strokeWidth={i % 3 === 0 ? '0.2' : '0.1'} />
      );
    })}
  </svg>
);

/* ── Ruler scale along edges ── */
const RulerScale = () => (
  <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
    {/* Left ruler */}
    {Array.from({ length: 40 }, (_, i) => {
      const isMajor = i % 5 === 0;
      const y = 2 + i * 2.4;
      return (
        <div key={`rl-${i}`}>
          <div className="absolute left-0" style={{
            top: `${y}%`, width: isMajor ? 20 : 10, height: isMajor ? 1.5 : 0.75,
            background: `hsl(var(--primary) / ${isMajor ? 0.45 : 0.15})`,
          }} />
          {isMajor && (
            <span className="absolute text-[5px] font-mono text-primary/30 font-bold" style={{ top: `${y - 0.8}%`, left: 22 }}>
              {Math.round(i * 2.5)}
            </span>
          )}
        </div>
      );
    })}
    {/* Right ruler */}
    {Array.from({ length: 40 }, (_, i) => {
      const isMajor = i % 5 === 0;
      const y = 2 + i * 2.4;
      return (
        <div key={`rr-${i}`}>
          <div className="absolute right-0" style={{
            top: `${y}%`, width: isMajor ? 20 : 10, height: isMajor ? 1.5 : 0.75,
            background: `hsl(var(--primary) / ${isMajor ? 0.45 : 0.15})`,
          }} />
          {isMajor && (
            <span className="absolute text-[5px] font-mono text-primary/30 text-right font-bold" style={{ top: `${y - 0.8}%`, right: 22 }}>
              {Math.round(i * 2.5)}
            </span>
          )}
        </div>
      );
    })}
  </div>
);

/* ── Proportion ratio lines (golden ratio markers) ── */
const ProportionLines = () => {
  const ratios = [
    { y: '16%', label: 'SHOULDER LINE' },
    { y: '38%', label: 'NATURAL WAIST' },
    { y: '50%', label: 'HIP LINE' },
    { y: '76%', label: 'KNEE LINE' },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none z-[1]">
      {ratios.map((r, i) => (
        <motion.div key={i} className="absolute left-0 right-0" style={{ top: r.y }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 + i * 0.2, duration: 0.6 }}
        >
          <div className="w-full h-[1px]" style={{
            background: 'linear-gradient(90deg, transparent 3%, hsl(var(--primary) / 0.15) 15%, hsl(var(--primary) / 0.25) 50%, hsl(var(--primary) / 0.15) 85%, transparent 97%)',
          }} />
          <span className="absolute right-2 -top-[6px] text-[4px] font-mono uppercase tracking-[0.2em] text-primary/25 font-medium">
            {r.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

/* ── Signal waveform at bottom ── */
const SignalWaveform = () => {
  const points = useMemo(() => {
    const pts: string[] = [];
    for (let x = 0; x <= 100; x += 0.5) {
      const y = 50 + Math.sin(x * 0.3) * 15 + Math.sin(x * 0.7) * 8 + Math.sin(x * 1.5) * 4;
      pts.push(`${x},${y}`);
    }
    return pts.join(' ');
  }, []);

  return (
    <motion.svg
      className="absolute bottom-6 left-[5%] right-[5%] h-[6%] pointer-events-none z-[1]"
      viewBox="0 0 100 100" preserveAspectRatio="none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2, duration: 1 }}
    >
      <motion.polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary) / 0.12)"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 2, duration: 2, ease: 'easeOut' }}
      />
      {/* Glow duplicate */}
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary) / 0.04)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
};

/* ── Depth-of-field grid perspective layer ── */
const PerspectiveGrid = () => (
  <div className="absolute inset-0 pointer-events-none z-[0] overflow-hidden" style={{
    perspective: '400px',
    perspectiveOrigin: '50% 35%',
  }}>
    <div className="absolute inset-0" style={{
      transform: 'rotateX(55deg) translateZ(-20px)',
      transformOrigin: '50% 0%',
    }}>
      <svg className="w-full h-full" viewBox="0 0 200 200" preserveAspectRatio="none">
        {/* Horizontal lines */}
        {Array.from({ length: 20 }, (_, i) => (
          <line key={`ph-${i}`} x1="0" y1={i * 10} x2="200" y2={i * 10}
            stroke={`hsl(var(--primary) / ${0.04 + (i / 20) * 0.06})`} strokeWidth="0.3" />
        ))}
        {/* Vertical lines */}
        {Array.from({ length: 20 }, (_, i) => (
          <line key={`pv-${i}`} x1={i * 10} y1="0" x2={i * 10} y2="200"
            stroke={`hsl(var(--primary) / ${0.03})`} strokeWidth="0.3" />
        ))}
      </svg>
    </div>
  </div>
);

/* ── Floating data particles — reduced count for perf ── */
const DataParticles = () => {
  const particles = useRef(
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: 25 + Math.random() * 50,
      y: 10 + Math.random() * 80,
      size: 0.8 + Math.random() * 1.8,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 5,
      yOffset: -20 - Math.random() * 10,
    }))
  ).current;
  return (
    <div className="absolute inset-0 pointer-events-none z-[2] overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            left: `${p.x}%`, top: `${p.y}%`,
            background: 'hsl(var(--primary))',
            boxShadow: `0 0 ${p.size * 4}px ${p.size}px hsl(var(--primary) / 0.3)`,
            willChange: 'transform, opacity',
          }}
          animate={{
            y: [0, p.yOffset, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
};

/* ── Corner brackets — double-layered, animated ── */
const CornerBrackets = () => {
  const corners = [
    { cls: 'top-2 left-2', d: 'M0 14 L0 0 L14 0', d2: 'M0 8 L0 0 L8 0' },
    { cls: 'top-2 right-2', d: 'M6 0 L20 0 L20 14', d2: 'M12 0 L20 0 L20 8' },
    { cls: 'bottom-2 left-2', d: 'M0 6 L0 20 L14 20', d2: 'M0 12 L0 20 L8 20' },
    { cls: 'bottom-2 right-2', d: 'M6 20 L20 20 L20 6', d2: 'M12 20 L20 20 L20 12' },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <motion.svg
          key={i}
          className={`absolute w-6 h-6 pointer-events-none z-[6] ${c.cls}`}
          viewBox="0 0 20 20"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [1, 0.15, 1] }}
          transition={{ duration: 3, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d={c.d} stroke="hsl(var(--primary) / 0.5)" strokeWidth="1" strokeLinecap="round" />
          <path d={c.d2} stroke="hsl(var(--primary) / 0.9)" strokeWidth="1.5" strokeLinecap="round" />
        </motion.svg>
      ))}
    </>
  );
};

/* ── Center crosshair reticle ── */
const Crosshair = () => (
  <div className="absolute inset-0 pointer-events-none z-[2] overflow-hidden">
    {/* Horizontal */}
    <motion.div
      className="absolute left-[42%] right-[42%] h-[1px] top-1/2 -translate-y-1/2"
      style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.15) 30%, hsl(var(--primary) / 0.25) 50%, hsl(var(--primary) / 0.15) 70%, transparent)' }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1, opacity: [0.3, 0.6, 0.3] }}
      transition={{ scaleX: { delay: 0.8, duration: 0.5, ease: LUXURY_EASE }, opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
    />
    {/* Vertical */}
    <motion.div
      className="absolute top-[38%] bottom-[38%] w-[1px] left-1/2 -translate-x-1/2"
      style={{ background: 'linear-gradient(180deg, transparent, hsl(var(--primary) / 0.15) 30%, hsl(var(--primary) / 0.25) 50%, hsl(var(--primary) / 0.15) 70%, transparent)' }}
      initial={{ scaleY: 0 }}
      animate={{ scaleY: 1, opacity: [0.3, 0.6, 0.3] }}
      transition={{ scaleY: { delay: 0.9, duration: 0.5, ease: LUXURY_EASE }, opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
    />
    {/* Center diamond */}
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 border border-primary/20 rotate-45"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0.2, 0.5, 0.2], scale: 1 }}
      transition={{ opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' }, scale: { delay: 1, duration: 0.4, ease: LUXURY_EASE } }}
    />
  </div>
);

/* ── Micro data readouts (corner telemetry) ── */
const MicroReadouts = () => {
  const readouts = [
    { pos: 'top-3 left-8', text: 'SYS:ACTIVE' },
    { pos: 'top-3 right-8', text: 'RES:2160p' },
    { pos: 'bottom-10 left-3', text: 'δ±0.3cm' },
    { pos: 'bottom-10 right-3', text: 'MAP:LIVE' },
  ];
  return (
    <>
      {readouts.map((r, i) => (
        <motion.span
          key={i}
          className={`absolute z-[6] pointer-events-none text-[5px] font-mono uppercase tracking-[0.18em] text-primary/30 ${r.pos}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 4, delay: i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {r.text}
        </motion.span>
      ))}
    </>
  );
};

/* ── CRT scanline overlay ── */
const CrtOverlay = () => (
  <div
    className="absolute inset-0 pointer-events-none z-[3] opacity-[0.035]"
    style={{
      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary) / 0.3) 2px, hsl(var(--primary) / 0.3) 3px)',
      backgroundSize: '100% 3px',
    }}
  />
);

/* ── Status bar ── */
const HudStatusBar = forwardRef<HTMLDivElement, { useCm: boolean }>(({ useCm }, ref) => (
  <motion.div
    ref={ref}
    className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-[7]"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 4.5, duration: 0.8, ease: LUXURY_EASE }}
  >
    <div
      className="flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 backdrop-blur-2xl"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(220 15% 5% / 0.85))',
        border: '1px solid hsl(var(--primary) / 0.2)',
        boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.08), inset 0 1px 0 hsl(var(--primary) / 0.1)',
      }}
    >
      <span className="text-[7px] font-mono uppercase tracking-[0.14em] text-primary font-bold">NEURAL MAP</span>
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: 'hsl(142 71% 45%)' }} />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: 'hsl(142 71% 45%)', boxShadow: '0 0 6px 2px hsl(142 71% 45% / 0.5)' }} />
      </span>
      <span className="text-[7px] font-mono uppercase tracking-[0.12em] text-primary/60">TAP→{useCm ? 'IN' : 'CM'}</span>
    </div>
  </motion.div>
));
HudStatusBar.displayName = 'HudStatusBar';

/* ── Tick marks — refined ── */
const TickMarks = () => (
  <div className="absolute inset-0 pointer-events-none z-[1]">
    {Array.from({ length: 22 }, (_, i) => {
      const isMajor = i % 5 === 0;
      return (
        <div key={`t-${i}`}>
          <div className="absolute left-0" style={{ top: `${4 + i * 4.3}%`, width: isMajor ? 16 : 8, height: isMajor ? 1.5 : 1, background: `hsl(var(--primary) / ${isMajor ? 0.5 : 0.15})` }} />
          <div className="absolute right-0" style={{ top: `${4 + i * 4.3}%`, width: isMajor ? 16 : 8, height: isMajor ? 1.5 : 1, background: `hsl(var(--primary) / ${isMajor ? 0.5 : 0.15})` }} />
        </div>
      );
    })}
  </div>
);

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [silhouetteReady, setSilhouetteReady] = useState(!!processedSilhouetteCache);
  const [useCmState, setUseCmLocal] = useState(getUseCm());
  const [scrambling, setScrambling] = useState(false);
  const [silhouetteSrc, setSilhouetteSrc] = useState(processedSilhouetteCache || bodySilhouette);
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const parallaxRef2 = useRef<HTMLDivElement>(null);

  // Evaluate device perf synchronously on first render to avoid liteMode flip
  const isLowPerfDevice = useMemo(() => {
    const lowConcurrency = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2;
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    return lowConcurrency || saveData;
  }, []);

  const liteMode = reduceMotion || isLowPerfDevice;

  useEffect(() => {
    let cancelled = false;

    if (processedSilhouetteCache) {
      setSilhouetteSrc(processedSilhouetteCache);
      setSilhouetteReady(true);
      return;
    }

    if (liteMode) {
      setSilhouetteSrc(bodySilhouette);
      setSilhouetteReady(true);
      return;
    }

    processedSilhouettePromise ??= createProcessedSilhouette(bodySilhouette).then((processed) => {
      processedSilhouetteCache = processed;
      return processed;
    });

    processedSilhouettePromise.then((processed) => {
      if (!cancelled) {
        setSilhouetteSrc(processed);
        setSilhouetteReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [liteMode]);

  // Use direct DOM manipulation for parallax to avoid re-renders
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (liteMode) {
      if (parallaxRef.current) parallaxRef.current.style.transform = 'none';
      if (parallaxRef2.current) parallaxRef2.current.style.transform = 'none';
      return;
    }

    let rafId: number;
    const handleScroll = () => {
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const py = (rect.top + rect.height / 2 - window.innerHeight / 2) * 0.02;
        const t = `translateY(${py}px)`;
        if (parallaxRef.current) parallaxRef.current.style.transform = t;
        if (parallaxRef2.current) parallaxRef2.current.style.transform = t;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => { window.removeEventListener('scroll', handleScroll); cancelAnimationFrame(rafId); };
  }, [liteMode]);

  const toggleUnit = useCallback(() => {
    setScrambling(true);
    const next = !useCmState;
    setUseCmLocal(next);
    setUseCm(next);
    setTimeout(() => setScrambling(false), 500);
  }, [useCmState]);

  const getValue = (key: string): { line1: string; line2: string } | null => {
    if (key === 'height') {
      return useCmState
        ? { line1: `${heightCm} cm`, line2: fmtHeightFtIn(heightCm) }
        : { line1: fmtHeightFtIn(heightCm), line2: `${heightCm} cm` };
    }
    const range = measurements[key];
    if (!range) return null;
    return useCmState
      ? { line1: fmtCm(range), line2: fmtIn(range) }
      : { line1: fmtIn(range), line2: fmtCm(range) };
  };

  const activeOverlays = OVERLAYS.filter(o => getValue(o.key) !== null);


  return (
    <div className="mb-4" ref={containerRef}>
      <div className="flex justify-center">
        <motion.div
          className="relative w-full max-w-[380px] aspect-[3/4] rounded-[1rem] cursor-pointer overflow-hidden"
          onClick={toggleUnit}
          role="button"
          aria-label="Toggle measurement units"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && toggleUnit()}
          style={{
            border: '2px solid hsl(var(--primary) / 1)',
          }}
          animate={liteMode ? undefined : {
            borderColor: [
              'hsl(var(--primary) / 1)',
              'hsl(var(--primary) / 0.15)',
              'hsl(var(--primary) / 1)',
            ],
            boxShadow: [
              '0 0 50px 14px hsl(var(--primary) / 0.5), 0 0 100px 30px hsl(var(--primary) / 0.2), inset 0 0 50px 10px hsl(var(--primary) / 0.15)',
              '0 0 12px 3px hsl(var(--primary) / 0.05), 0 0 24px 6px hsl(var(--primary) / 0.02), inset 0 0 12px 3px hsl(var(--primary) / 0.02)',
              '0 0 50px 14px hsl(var(--primary) / 0.5), 0 0 100px 30px hsl(var(--primary) / 0.2), inset 0 0 50px 10px hsl(var(--primary) / 0.15)',
            ],
          }}
          transition={liteMode ? undefined : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="sr-only">
            {`Body measurements diagram: ${[
              `Height ${heightCm} cm`,
              ...OVERLAYS
                .filter(l => l.key !== 'height' && measurements[l.key])
                .map(l => `${l.label} ${measurements[l.key].min.toFixed(0)}–${measurements[l.key].max.toFixed(0)} cm`),
            ].join(', ')}.`}
          </span>

          {/* Effect: Power-on flash */}
          <motion.div
            className="absolute inset-0 z-[9] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 45%, hsl(var(--primary) / 0.7), hsl(var(--primary) / 0.2) 50%, transparent 80%)' }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          />

          {/* BG: Deep space gradient with ambient hue shift */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 42%, hsl(220 18% 7%) 0%, hsl(220 20% 3%) 100%)' }}
            animate={liteMode ? undefined : { filter: ['hue-rotate(0deg)', 'hue-rotate(5deg)', 'hue-rotate(-5deg)', 'hue-rotate(0deg)'] }}
            transition={liteMode ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* BG: Perspective grid floor */}
          {!liteMode && <PerspectiveGrid />}

          {/* BG: Hex grid */}
          {!liteMode && <HexGrid />}

          {/* BG: Polar coordinate grid */}
          {!liteMode && <PolarGrid />}

          {/* BG: Proportion reference lines */}
          {!liteMode && <ProportionLines />}

          {/* BG: Ruler scales */}
          {!liteMode && <RulerScale />}

          {/* BG: Radial vignette */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 55% 50% at 50% 45%, hsl(var(--primary) / 0.04) 0%, transparent 50%), radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, hsl(220 20% 2% / 0.85) 100%)',
          }} />

          {/* BG: Subtle noise texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }} />

          {/* Silhouette: Ambient glow behind figure */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            ref={parallaxRef}
          >
            <motion.div
              className="h-[90%] w-[42%]"
              style={{
                background: 'radial-gradient(ellipse at 50% 45%, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.08) 40%, transparent 70%)',
                filter: liteMode ? 'blur(14px)' : 'blur(25px)',
              }}
              animate={liteMode ? { scale: [1, 1.01, 1] } : { scale: [1, 1.02, 1], opacity: [1, 0.15, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* Silhouette: Origin orb — collapses into figure */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-[3]"
            initial={{ opacity: 1 }}
            animate={{ opacity: silhouetteReady ? 0 : 1 }}
            transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
          >
            <motion.div
              initial={{ width: 60, height: 60, borderRadius: '50%' }}
              animate={silhouetteReady ? { width: 300, height: 500, borderRadius: '40%', opacity: 0 } : {}}
              transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
              style={{
                background: 'radial-gradient(ellipse at 50% 45%, hsl(var(--primary) / 0.35) 0%, hsl(220 20% 4%) 60%, hsl(220 20% 2%) 100%)',
                boxShadow: '0 0 60px 20px hsl(var(--primary) / 0.3), 0 0 120px 40px hsl(var(--primary) / 0.1)',
              }}
            />
          </motion.div>

          {/* Silhouette: 4D holographic render — scales up from orb */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            ref={parallaxRef2}
            initial={{ opacity: 0, scale: 0.15, borderRadius: '50%' }}
            animate={{
              opacity: silhouetteReady ? 1 : 0,
              scale: silhouetteReady ? 1 : 0.15,
              borderRadius: silhouetteReady ? '0%' : '50%',
            }}
            transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
          >
            <div className="relative h-[116%] w-[92%] max-w-[360px]">

              {/* ═══ BACKGROUND DEPTH LAYERS ═══ */}

              {/* BG Layer 0+1 merged: Deep volumetric glow */}

              {/* BG Layer 1: Wide atmospheric glow — creates a halo behind the body */}
              <img
                src={silhouetteSrc}
                alt="" aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                style={{
                  filter: liteMode
                    ? 'blur(14px) brightness(4) saturate(2.2) drop-shadow(0 0 38px hsl(var(--primary) / 0.6))'
                    : 'blur(25px) brightness(6) saturate(3) drop-shadow(0 0 80px hsl(var(--primary) / 0.8))',
                  opacity: liteMode ? 0.28 : 0.35,
                  transform: 'scale(1.08)',
                }}
              />

              {/* BG Layer 2: Mid bloom — fills the gap between halo and edge glow */}
              <img
                src={silhouetteSrc}
                alt="" aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                style={{
                  filter: liteMode
                    ? 'blur(8px) brightness(4) saturate(2) drop-shadow(0 0 22px hsl(var(--primary) / 0.5))'
                    : 'blur(12px) brightness(5) saturate(2.5) drop-shadow(0 0 40px hsl(var(--primary) / 0.7))',
                  opacity: liteMode ? 0.38 : 0.5,
                  transform: 'scale(1.03)',
                }}
              />

              {/* ═══ TEMPORAL ECHO LAYERS (smooth, long-cycle to avoid strobe) ═══ */}
              {!liteMode && (
                <>
                  {/* Echo: deep past — slow drift left with gentle opacity cycle */}
                  <motion.img
                    src={silhouetteSrc}
                    alt="" aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                    style={{
                      filter: 'blur(6px) brightness(4) saturate(1.5) hue-rotate(-25deg)',
                      mixBlendMode: 'screen',
                      transform: 'scale(1.04)',
                    }}
                    animate={{
                      x: ['-3%', '-5%', '-3%'],
                      y: ['0.5%', '-0.5%', '0.5%'],
                      opacity: [0.06, 0.12, 0.06],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Echo: past — subtle left drift */}
                  <motion.img
                    src={silhouetteSrc}
                    alt="" aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                    style={{
                      filter: 'blur(3px) brightness(4) saturate(1.8) hue-rotate(-12deg)',
                      mixBlendMode: 'screen',
                    }}
                    animate={{
                      x: ['-1.5%', '-2.5%', '-1.5%'],
                      opacity: [0.08, 0.15, 0.08],
                    }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Echo: future — subtle right drift */}
                  <motion.img
                    src={silhouetteSrc}
                    alt="" aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                    style={{
                      filter: 'blur(3px) brightness(4) saturate(1.8) hue-rotate(12deg)',
                      mixBlendMode: 'screen',
                    }}
                    animate={{
                      x: ['1.5%', '2.5%', '1.5%'],
                      opacity: [0.08, 0.15, 0.08],
                    }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  />

                  {/* Echo: deep future — slow drift right */}
                  <motion.img
                    src={silhouetteSrc}
                    alt="" aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                    style={{
                      filter: 'blur(6px) brightness(4) saturate(1.5) hue-rotate(25deg)',
                      mixBlendMode: 'screen',
                      transform: 'scale(1.04)',
                    }}
                    animate={{
                      x: ['3%', '5%', '3%'],
                      y: ['-0.5%', '0.5%', '-0.5%'],
                      opacity: [0.06, 0.12, 0.06],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                  />
                </>
              )}

              {/* ═══ DEPTH-OF-FIELD GLOW LAYERS ═══ */}

              {/* DOF: Rear defocused copy — simulates background depth plane */}
              {!liteMode && (
                <motion.img
                  src={silhouetteSrc}
                  alt="" aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                  style={{
                    filter: 'blur(16px) brightness(4) saturate(2.5)',
                    opacity: 0.2,
                  }}
                  animate={{
                    scale: [1.06, 1.08, 1.06],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* DOF: Tight edge glow — size pulse synced to silhouette */}
              <motion.img
                src={silhouetteSrc}
                alt="" aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                style={{
                  filter: liteMode
                    ? 'blur(2px) brightness(4.4) saturate(2) drop-shadow(0 0 10px hsl(var(--primary) / 0.9)) drop-shadow(0 0 20px hsl(var(--primary) / 0.55))'
                    : 'blur(3px) brightness(5) saturate(2.2) drop-shadow(0 0 14px hsl(var(--primary) / 1)) drop-shadow(0 0 30px hsl(var(--primary) / 0.7))',
                  opacity: liteMode ? 0.78 : 0.85,
                  willChange: 'transform, opacity',
                }}
                animate={{
                  scale: liteMode ? [1.005, 1.03, 1.005] : [1.01, 1.045, 1.01],
                  opacity: liteMode ? [0.68, 0.88, 0.68] : [0.72, 0.95, 0.72],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* ═══ GHOST SHADOW — dark silhouette-shaped drop shadow for 3D depth ═══ */}

              {/* Layer 1: Wide dark shadow — offset right+down for cast-shadow depth */}
              <motion.div
                className="absolute -inset-4 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 70% 75% at 53% 47%, hsl(220 20% 2% / 0.7) 20%, transparent 70%)',
                  filter: 'blur(28px)',
                  willChange: 'transform, opacity',
                } as React.CSSProperties}
                animate={{
                  scale: [1.08, 1.16, 1.08],
                  opacity: [0.35, 0.55, 0.35],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Layer 2: Tighter dark shadow — closer to figure for contact shadow */}
              <motion.div
                className="absolute -inset-2 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 55% 65% at 52% 46%, hsl(220 20% 3% / 0.65) 15%, transparent 60%)',
                  filter: 'blur(16px)',
                  willChange: 'transform, opacity',
                } as React.CSSProperties}
                animate={{
                  scale: [1.03, 1.08, 1.03],
                  opacity: [0.4, 0.6, 0.4],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Layer 3: Gold inner accent rim — soft radial gold glow for depth highlight */}
              <motion.div
                className="absolute -inset-1 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 50% 60% at 50% 45%, hsl(var(--primary) / 0.5) 10%, hsl(var(--primary) / 0.15) 40%, transparent 65%)',
                  filter: 'blur(8px)',
                  willChange: 'transform, opacity',
                } as React.CSSProperties}
                animate={{
                  scale: [1.01, 1.04, 1.01],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Layer 4: Bright gold bloom behind silhouette */}
              <motion.img
                src={silhouetteSrc}
                alt="" aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                style={{
                  filter: 'blur(14px) brightness(6) saturate(2.5) drop-shadow(0 0 40px hsl(var(--primary) / 0.85))',
                  willChange: 'transform, opacity',
                  transform: 'translateX(1%) translateY(1%)',
                }}
                animate={{
                  scale: [1.1, 1.18, 1.1],
                  opacity: [0.3, 0.55, 0.3],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* ═══ MAIN SILHOUETTE (FOREGROUND FOCUS PLANE) — pulses in sync with glow ═══ */}
              <motion.img
                src={silhouetteSrc}
                alt="Body measurement scan"
                className="relative z-[2] h-full w-full object-contain"
                onLoad={() => setImageLoaded(true)}
                style={{
                  filter: 'saturate(2) brightness(2.5) contrast(1.4) drop-shadow(0 0 12px hsl(var(--primary) / 0.9)) drop-shadow(0 0 4px hsl(var(--primary) / 1))',
                  willChange: 'transform',
                }}
                animate={liteMode
                  ? {
                      scale: [1, 1.015, 1],
                    }
                  : {
                      scale: [1, 1.02, 1],
                      rotateY: [0, 3, 0, -3, 0],
                      rotateX: [0, -1.5, 0, 1.5, 0],
                    }}
                transition={liteMode
                  ? {
                      scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                    }
                  : {
                      scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                      rotateY: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
                      rotateX: { duration: 7, repeat: Infinity, ease: 'easeInOut' },
                    }}
              />

              {/* ═══ FOREGROUND OVERLAY LAYERS ═══ */}

              {!liteMode && (
                <>
                  {/* FG: Holographic sheen — slow, subtle overlay */}
                  <motion.img
                    src={silhouetteSrc}
                    alt="" aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                    style={{
                      mixBlendMode: 'overlay',
                      filter: 'blur(1px) brightness(3) saturate(0.5)',
                    }}
                    animate={{ opacity: [0.05, 0.12, 0.05] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* FG: Specular highlight sweep — simulates light passing over */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 30%, hsl(var(--primary) / 0.08) 45%, hsl(var(--primary) / 0.15) 50%, hsl(var(--primary) / 0.08) 55%, transparent 70%)',
                      mixBlendMode: 'screen',
                    }}
                    animate={{
                      x: ['-100%', '100%'],
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 4 }}
                  />

                  {/* FG: Chromatic aberration — red shift right */}
                  <motion.img
                    src={silhouetteSrc}
                    alt="" aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                    style={{
                      mixBlendMode: 'screen',
                      filter: 'blur(2px) brightness(3) saturate(4) hue-rotate(40deg)',
                    }}
                    animate={{
                      x: ['0.5%', '1.2%', '0.5%'],
                      opacity: [0.03, 0.06, 0.03],
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* FG: Chromatic aberration — blue shift left */}
                  <motion.img
                    src={silhouetteSrc}
                    alt="" aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                    style={{
                      mixBlendMode: 'screen',
                      filter: 'blur(2px) brightness(3) saturate(4) hue-rotate(-40deg)',
                    }}
                    animate={{
                      x: ['-0.5%', '-1.2%', '-0.5%'],
                      opacity: [0.03, 0.06, 0.03],
                    }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  />
                </>
              )}
            </div>
          </motion.div>

          {/* Effects: Tick marks */}
          {imageLoaded && <TickMarks />}

          {/* Effects: CRT scanlines */}
          {imageLoaded && <CrtOverlay />}

          {/* Effects: Crosshair reticle */}
          {imageLoaded && !liteMode && <Crosshair />}

          {/* Effects: Scan lines */}
          {imageLoaded && <ScanLines />}

          {/* Effects: Data particles */}
          {imageLoaded && !liteMode && <DataParticles />}

          {/* Effects: Corner brackets */}
          {imageLoaded && <CornerBrackets />}

          {/* Effects: Micro readouts */}
          {imageLoaded && !liteMode && <MicroReadouts />}

          {/* Effects: Signal waveform */}
          {imageLoaded && !liteMode && <SignalWaveform />}

          {/* Data: SVG leader lines */}
          {imageLoaded && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[4]" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="lg-l" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.8)" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.06)" />
                </linearGradient>
                <linearGradient id="lg-r" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.8)" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.06)" />
                </linearGradient>
              </defs>
              {activeOverlays.map(o => {
                const dx = parseFloat(o.dotLeft), dy = parseFloat(o.dotTop);
                const lx = o.side === 'left' ? 2 : 98;
                const ly = parseFloat(o.valTop) + 2;
                return (
                  <motion.path
                    key={`l-${o.key}`}
                    d={`M${dx} ${dy} L${lx} ${ly}`}
                    stroke="hsl(var(--primary) / 0.7)"
                    strokeWidth="0.45"
                    strokeDasharray="1.5 0.6"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      pathLength: { delay: o.delay + 1.4, duration: 0.8, ease: LUXURY_EASE },
                      opacity: { delay: o.delay + 1.4, duration: 0.3 },
                    }}
                  />
                );
              })}
            </svg>
          )}

          {/* Data: Hotspot dots with scanline-triggered pulse */}
          {imageLoaded && activeOverlays.map(o => {
            // Scanline passes top→bottom in 4.5s cycle; calculate when it hits this dot
            const dotY = parseFloat(o.dotTop) / 100;
            const pulseDelay = dotY * 4.5; // sync with scanline duration
            return (
              <motion.div
                key={`d-${o.key}`}
                className="absolute z-[5]"
                style={{ top: o.dotTop, left: o.dotLeft, transform: 'translate(-50%, -50%)' }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: o.delay + 1.0, duration: 0.6, ease: LUXURY_EASE }}
              >
                <span className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20 animate-[sonar-ping_3s_ease-out_infinite]" />
                <span className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 animate-[sonar-ping_3s_ease-out_infinite]" style={{ animationDelay: '1.2s' }} />
                {/* Core dot with scanline-synced flash */}
                <motion.span
                  className="block w-[5px] h-[5px] rounded-full bg-primary"
                  style={{
                    boxShadow: '0 0 4px 2px hsl(var(--primary) / 0.7), 0 0 12px 4px hsl(var(--primary) / 0.25)',
                  }}
                  animate={{
                    boxShadow: [
                      '0 0 4px 2px hsl(var(--primary) / 0.7), 0 0 12px 4px hsl(var(--primary) / 0.25)',
                      '0 0 10px 4px hsl(var(--primary) / 1), 0 0 24px 8px hsl(var(--primary) / 0.6)',
                      '0 0 4px 2px hsl(var(--primary) / 0.7), 0 0 12px 4px hsl(var(--primary) / 0.25)',
                    ],
                    scale: [1, 1.6, 1],
                  }}
                  transition={{
                    duration: 0.6,
                    delay: pulseDelay,
                    repeat: Infinity,
                    repeatDelay: 4.5 - 0.6 + (2 * 4.5), // re-sync with scanline full cycle
                    ease: 'easeOut',
                  }}
                />
              </motion.div>
            );
          })}

          {/* Data: Glassmorphic labels */}
          {imageLoaded && activeOverlays.map(o => {
            const val = getValue(o.key)!;
            return (
              <motion.div
                key={o.key}
                className="absolute z-[6]"
                style={{
                  top: o.valTop,
                  ...(o.side === 'left' ? { left: '1.5%' } : { right: '1.5%' }),
                }}
                initial={{ opacity: 0, x: o.side === 'left' ? -14 : 14, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: o.delay + 1.6, duration: 0.7, ease: LUXURY_EASE }}
              >
                <div
                  className="rounded-lg px-2 py-1 backdrop-blur-2xl"
                  style={{
                    textAlign: o.side === 'left' ? 'left' : 'right',
                    background: 'linear-gradient(145deg, hsl(var(--primary) / 0.18) 0%, hsl(220 15% 5% / 0.88) 100%)',
                    border: '1px solid hsl(var(--primary) / 0.25)',
                    boxShadow: '0 2px 12px hsl(var(--primary) / 0.12), inset 0 1px 0 hsl(var(--primary) / 0.12)',
                  }}
                >
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-primary leading-none mb-[3px]" style={{ textShadow: '0 0 6px hsl(var(--primary) / 0.5)' }}>
                    {o.label}
                  </p>
                  <p className="text-[12px] font-black leading-tight text-foreground hud-data-glow">
                    <ScrambleValue value={val.line1} scrambling={scrambling} />
                  </p>
                  <p className="text-[9px] font-semibold leading-tight text-muted-foreground">
                    <ScrambleValue value={val.line2} scrambling={scrambling} />
                  </p>
                </div>
              </motion.div>
            );
          })}

          {/* HUD status bar */}
          {imageLoaded && <HudStatusBar useCm={useCmState} />}

          {/* Outer glow frame — static shadow, animated opacity only */}
          <motion.div
            className="absolute -inset-[4px] rounded-[calc(1rem+3px)] pointer-events-none z-[8]"
            style={{
              border: '2px solid hsl(220 15% 8%)',
              boxShadow: 'inset 0 0 15px 4px hsl(var(--primary) / 0.4), 0 0 20px 5px hsl(var(--primary) / 0.3), 0 0 50px 12px hsl(var(--primary) / 0.1)',
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Inner glow ring — static shadow, animated opacity only */}
          <motion.div
            className="absolute inset-0 rounded-[1rem] pointer-events-none z-[7]"
            style={{
              boxShadow: 'inset 0 0 28px 6px hsl(var(--primary) / 0.1)',
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default BodyDiagram;
