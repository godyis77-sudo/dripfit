import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { MeasurementRange } from '@/lib/types';
import bodySilhouette from '@/assets/body-silhouette-glow-2.webp';
import { getUseCm, setUseCm } from '@/lib/session';

const CM_TO_IN = 0.3937;
const fmtCm = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;
const fmtHeightFtIn = (cm: number) => {
  const totalIn = Math.round(cm * CM_TO_IN);
  return `${Math.floor(totalIn / 12)}' ${totalIn % 12}"`;
};
const LUXURY_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const createProcessedSilhouette = (imageSrc: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = imageSrc;

    img.onload = () => {
      const working = document.createElement('canvas');
      working.width = img.naturalWidth;
      working.height = img.naturalHeight;

      const ctx = working.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const frame = ctx.getImageData(0, 0, working.width, working.height);
      const px = frame.data;

      let minX = working.width;
      let minY = working.height;
      let maxX = -1;
      let maxY = -1;

      const alphaMap = new Uint8ClampedArray(working.width * working.height);

      for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const currentAlpha = px[i + 3];

        if (currentAlpha === 0) continue;

        const chroma = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
        const brightness = (r + g + b) / 3;
        const neutralTone = chroma < 38;

        if (neutralTone && brightness > 68) {
          px[i + 3] = 0;
          continue;
        }

        if (neutralTone && brightness > 34) {
          const fade = Math.max(0, Math.min(1, (68 - brightness) / 34));
          px[i + 3] = Math.round(currentAlpha * fade * 0.28);
        }

        alphaMap[i / 4] = px[i + 3];
      }

      // Edge cleanup: remove isolated neutral speckles and soften jagged fringe.
      for (let y = 1; y < working.height - 1; y++) {
        for (let x = 1; x < working.width - 1; x++) {
          const p = y * working.width + x;
          const i = p * 4;
          const a = px[i + 3];
          if (a === 0) continue;

          const r = px[i];
          const g = px[i + 1];
          const b = px[i + 2];
          const chroma = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
          const brightness = (r + g + b) / 3;
          const neutralTone = chroma < 42;

          let neighbors = 0;
          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              if (ox === 0 && oy === 0) continue;
              const n = (y + oy) * working.width + (x + ox);
              if (alphaMap[n] > 20) neighbors++;
            }
          }

          if (neutralTone && brightness > 48 && neighbors <= 2) {
            px[i + 3] = 0;
            continue;
          }

          if (neutralTone && neighbors <= 3 && a < 140) {
            px[i + 3] = Math.round(a * 0.45);
          }
        }
      }

      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] > 8) {
          const pixelIndex = i / 4;
          const x = pixelIndex % working.width;
          const y = Math.floor(pixelIndex / working.width);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }

      ctx.putImageData(frame, 0, 0);

      if (maxX < 0 || maxY < 0) {
        resolve(imageSrc);
        return;
      }

      const padding = 6;
      const sx = Math.max(0, minX - padding);
      const sy = Math.max(0, minY - padding);
      const sw = Math.min(working.width - sx, maxX - minX + 1 + padding * 2);
      const sh = Math.min(working.height - sy, maxY - minY + 1 + padding * 2);

      const cropped = document.createElement('canvas');
      cropped.width = sw;
      cropped.height = sh;

      const croppedCtx = cropped.getContext('2d');
      if (!croppedCtx) {
        resolve(imageSrc);
        return;
      }

      croppedCtx.drawImage(working, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(cropped.toDataURL('image/png'));
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
  { key: 'shoulder', label: 'SHOULDER', side: 'right', valTop: '17%', delay: 0.12, dotTop: '20%', dotLeft: '64%' },
  { key: 'chest',    label: 'CHEST',    side: 'left',  valTop: '25%', delay: 0.22, dotTop: '28%', dotLeft: '40%' },
  { key: 'bust',     label: 'BUST',     side: 'right', valTop: '28%', delay: 0.30, dotTop: '30%', dotLeft: '58%' },
  { key: 'sleeve',   label: 'SLEEVE',   side: 'left',  valTop: '35%', delay: 0.38, dotTop: '36%', dotLeft: '32%' },
  { key: 'waist',    label: 'WAIST',    side: 'right', valTop: '40%', delay: 0.46, dotTop: '42%', dotLeft: '58%' },
  { key: 'hips',     label: 'HIPS',     side: 'right', valTop: '50%', delay: 0.54, dotTop: '50%', dotLeft: '60%' },
  { key: 'inseam',   label: 'INSEAM',   side: 'left',  valTop: '66%', delay: 0.62, dotTop: '67%', dotLeft: '46%' },
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
  return <>{display}</>;
};

/* ── Dual scan lines ── */
const ScanLines = () => (
  <>
    <motion.div
      className="absolute left-0 right-0 h-[2px] z-[3] pointer-events-none"
      style={{
        background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0) 8%, hsl(var(--primary) / 0.85) 50%, hsl(var(--primary) / 0) 92%, transparent)',
        boxShadow: '0 0 30px 10px hsl(var(--primary) / 0.45), 0 0 80px 20px hsl(var(--primary) / 0.12)',
      }}
      initial={{ top: '0%' }}
      animate={{ top: ['0%', '100%', '0%'] }}
      transition={{ duration: 4.5, ease: 'linear', repeat: Infinity, repeatDelay: 2 }}
    />
    <motion.div
      className="absolute left-0 right-0 h-[1px] z-[3] pointer-events-none opacity-40"
      style={{
        background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5) 50%, transparent)',
      }}
      initial={{ top: '100%' }}
      animate={{ top: ['100%', '0%', '100%'] }}
      transition={{ duration: 6, ease: 'linear', repeat: Infinity, repeatDelay: 1 }}
    />
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

/* ── Floating data particles — concentrated around body ── */
const DataParticles = () => {
  const particles = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 25 + Math.random() * 50,
      y: 10 + Math.random() * 80,
      size: 0.8 + Math.random() * 1.8,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 5,
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
            boxShadow: `0 0 ${p.size * 5}px ${p.size * 2}px hsl(var(--primary) / 0.4)`,
          }}
          animate={{
            y: [0, -30 - Math.random() * 15, 0],
            x: [0, (Math.random() - 0.5) * 12, 0],
            opacity: [0, 0.9, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
};

/* ── Corner brackets — thicker, animated ── */
const CornerBrackets = () => {
  const corners = [
    { cls: 'top-2 left-2', d: 'M0 10 L0 0 L10 0' },
    { cls: 'top-2 right-2', d: 'M6 0 L16 0 L16 10' },
    { cls: 'bottom-2 left-2', d: 'M0 6 L0 16 L10 16' },
    { cls: 'bottom-2 right-2', d: 'M6 16 L16 16 L16 6' },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <motion.svg
          key={i}
          className={`absolute w-5 h-5 pointer-events-none z-[6] ${c.cls}`}
          viewBox="0 0 16 16"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d={c.d} stroke="hsl(var(--primary) / 0.7)" strokeWidth="1.5" strokeLinecap="round" />
        </motion.svg>
      ))}
    </>
  );
};

/* ── Status bar ── */
const HudStatusBar = ({ useCm }: { useCm: boolean }) => (
  <motion.div
    className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-[7]"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 1.2, duration: 0.6, ease: LUXURY_EASE }}
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
);

/* ── Tick marks — refined ── */
const TickMarks = () => (
  <div className="absolute inset-0 pointer-events-none z-[1]">
    {Array.from({ length: 22 }, (_, i) => {
      const isMajor = i % 5 === 0;
      return (
        <div key={`t-${i}`}>
          <div className="absolute left-0" style={{ top: `${4 + i * 4.3}%`, width: isMajor ? 12 : 6, height: 1, background: `hsl(var(--primary) / ${isMajor ? 0.3 : 0.08})` }} />
          <div className="absolute right-0" style={{ top: `${4 + i * 4.3}%`, width: isMajor ? 12 : 6, height: 1, background: `hsl(var(--primary) / ${isMajor ? 0.3 : 0.08})` }} />
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
  const [useCmState, setUseCmLocal] = useState(getUseCm());
  const [scrambling, setScrambling] = useState(false);
  const [silhouetteSrc, setSilhouetteSrc] = useState(bodySilhouette);
  const containerRef = useRef<HTMLDivElement>(null);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setImageLoaded(false);

    createProcessedSilhouette(bodySilhouette).then((processed) => {
      if (!cancelled) setSilhouetteSrc(processed);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      setParallaxY((rect.top + rect.height / 2 - window.innerHeight / 2) * 0.02);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        <div
          className="relative w-full max-w-[380px] aspect-[3/4] rounded-[1rem] cursor-pointer overflow-hidden"
          onClick={toggleUnit}
          role="button"
          aria-label="Toggle measurement units"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && toggleUnit()}
          style={{
            border: '2px solid hsl(var(--primary) / 0.4)',
            boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.15), 0 0 60px 12px hsl(var(--primary) / 0.06), inset 0 0 30px 5px hsl(var(--primary) / 0.05)',
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

          {/* BG: Deep space gradient */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 80% 70% at 50% 42%, hsl(220 18% 7%) 0%, hsl(220 20% 3%) 100%)',
          }} />

          {/* BG: Hex grid */}
          <HexGrid />

          {/* BG: Radial vignette */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(ellipse 55% 50% at 50% 45%, hsl(var(--primary) / 0.04) 0%, transparent 50%), radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, hsl(220 20% 2% / 0.85) 100%)',
          }} />

          {/* BG: Subtle noise texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }} />

          {/* Silhouette: Ambient glow behind figure */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ transform: `translateY(${parallaxY}px)` }}
          >
            <div className="h-[90%] w-[42%]" style={{
              background: 'radial-gradient(ellipse at 50% 45%, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.08) 40%, transparent 70%)',
              filter: 'blur(25px)',
            }} />
          </motion.div>

          {/* Silhouette: Stable image-based render */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `translateY(${parallaxY}px)` }}
          >
            <div className="relative h-[92%] w-[58%] max-w-[245px]">
              {/* Ultra-far glow — widest blur to smooth all edge artifacts */}
              <img
                src={silhouetteSrc}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain opacity-25 pointer-events-none"
                style={{
                  filter: 'blur(14px) brightness(1.8) saturate(1.5) drop-shadow(0 0 50px hsl(var(--primary) / 0.6)) drop-shadow(0 0 90px hsl(var(--primary) / 0.25))',
                }}
              />

              {/* Mid glow — smooth halo */}
              <img
                src={silhouetteSrc}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain opacity-40 pointer-events-none"
                style={{
                  filter: 'blur(5px) brightness(1.4) saturate(1.3) drop-shadow(0 0 20px hsl(var(--primary) / 0.55)) drop-shadow(0 0 40px hsl(var(--primary) / 0.2))',
                }}
              />

              {/* Near glow — tighter edge bloom */}
              <img
                src={silhouetteSrc}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-contain opacity-50 pointer-events-none"
                style={{
                  filter: 'blur(2px) brightness(1.25) saturate(1.2) drop-shadow(0 0 10px hsl(var(--primary) / 0.5))',
                }}
              />

              {/* Main silhouette — crisp */}
              <img
                src={silhouetteSrc}
                alt="Body measurement scan"
                className="relative z-[2] h-full w-full object-contain"
                onLoad={() => setImageLoaded(true)}
                style={{
                  filter: 'saturate(1.15) brightness(1.08) contrast(1.12) drop-shadow(0 0 8px hsl(var(--primary) / 0.55)) drop-shadow(0 0 3px hsl(var(--primary) / 0.8))',
                }}
              />
            </div>
          </motion.div>

          {/* Effects: Tick marks */}
          {imageLoaded && <TickMarks />}

          {/* Effects: Scan lines */}
          {imageLoaded && <ScanLines />}

          {/* Effects: Data particles */}
          {imageLoaded && <DataParticles />}

          {/* Effects: Corner brackets */}
          {imageLoaded && <CornerBrackets />}

          {/* Data: SVG leader lines */}
          {imageLoaded && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[4]" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="lg-l" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.55)" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.03)" />
                </linearGradient>
                <linearGradient id="lg-r" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.55)" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.03)" />
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
                    stroke="hsl(var(--primary) / 0.45)"
                    strokeWidth="0.3"
                    strokeDasharray="1.5 0.6"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                      pathLength: { delay: o.delay + 0.6, duration: 0.6, ease: LUXURY_EASE },
                      opacity: { delay: o.delay + 0.6, duration: 0.2 },
                    }}
                  />
                );
              })}
            </svg>
          )}

          {/* Data: Hotspot dots */}
          {imageLoaded && activeOverlays.map(o => (
            <motion.div
              key={`d-${o.key}`}
              className="absolute z-[5]"
              style={{ top: o.dotTop, left: o.dotLeft, transform: 'translate(-50%, -50%)' }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: o.delay + 0.4, duration: 0.4, ease: LUXURY_EASE }}
            >
              <span className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20 animate-[sonar-ping_3s_ease-out_infinite]" />
              <span className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 animate-[sonar-ping_3s_ease-out_infinite]" style={{ animationDelay: '1.2s' }} />
              <span className="block w-[5px] h-[5px] rounded-full bg-primary" style={{
                boxShadow: '0 0 4px 2px hsl(var(--primary) / 0.7), 0 0 12px 4px hsl(var(--primary) / 0.25)',
              }} />
            </motion.div>
          ))}

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
                transition={{ delay: o.delay + 0.7, duration: 0.55, ease: LUXURY_EASE }}
              >
                <div
                  className="rounded-lg px-2 py-1 backdrop-blur-2xl"
                  style={{
                    textAlign: o.side === 'left' ? 'left' : 'right',
                    background: 'linear-gradient(145deg, hsl(var(--primary) / 0.12) 0%, hsl(220 15% 5% / 0.75) 100%)',
                    border: '1px solid hsl(var(--primary) / 0.18)',
                    boxShadow: '0 2px 12px hsl(var(--primary) / 0.08), inset 0 1px 0 hsl(var(--primary) / 0.08)',
                  }}
                >
                  <p className="text-[6.5px] font-mono font-bold uppercase tracking-[0.16em] text-primary leading-none mb-[2px]">
                    {o.label}
                  </p>
                  <p className="text-[11px] font-black leading-tight text-foreground hud-data-glow">
                    <ScrambleValue value={val.line1} scrambling={scrambling} />
                  </p>
                  <p className="text-[8px] font-medium leading-tight text-muted-foreground">
                    <ScrambleValue value={val.line2} scrambling={scrambling} />
                  </p>
                </div>
              </motion.div>
            );
          })}

          {/* HUD status bar */}
          {imageLoaded && <HudStatusBar useCm={useCmState} />}

          {/* Outer glow frame */}
          <div
            className="absolute -inset-[4px] rounded-[calc(1rem+3px)] pointer-events-none z-[8]"
            style={{
              border: '2px solid hsl(220 15% 8%)',
              boxShadow: 'inset 0 0 12px 3px hsl(var(--primary) / 0.35), 0 0 16px 4px hsl(var(--primary) / 0.3), 0 0 40px 10px hsl(var(--primary) / 0.1)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
