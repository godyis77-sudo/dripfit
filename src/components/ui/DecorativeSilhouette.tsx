import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import bodySilhouette from '@/assets/body-silhouette-clean-3.png';

interface Props {
  className?: string;
  height?: number;
}

let processedCache: string | null = null;
let processedPromise: Promise<string> | null = null;

const processAlphaKey = (src: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d');
      if (!ctx) { resolve(src); return; }
      ctx.drawImage(img, 0, 0);
      const f = ctx.getImageData(0, 0, W, H);
      const px = f.data;
      for (let i = 0; i < px.length; i += 4) {
        const lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
        const chroma = Math.max(Math.abs(px[i] - px[i + 1]), Math.abs(px[i + 1] - px[i + 2]), Math.abs(px[i] - px[i + 2]));
        if (lum > 120 || (chroma < 40 && lum > 80)) px[i + 3] = 0;
        else if (lum > 60) px[i + 3] = Math.round(px[i + 3] * Math.max(0, (120 - lum) / 60));
      }
      ctx.putImageData(f, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(src);
  });

/* ── Mini hex grid ── */
const MiniHexGrid = () => {
  const hexes = useMemo(() => {
    const size = 14;
    const result: { x: number; y: number; o: number }[] = [];
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 10; c++) {
        const x = c * size * 1.73 + (r % 2 ? size * 0.866 : 0);
        const y = r * size * 1.5;
        const dist = Math.sqrt((x - 80) ** 2 + (y - 120) ** 2);
        result.push({ x, y, o: Math.max(0.02, 0.1 - dist * 0.0004) });
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
            const a = (Math.PI / 3) * j - Math.PI / 6;
            return `${h.x + 6 * Math.cos(a)},${h.y + 6 * Math.sin(a)}`;
          }).join(' ')}
          fill="none"
          stroke={`hsl(var(--primary) / ${h.o})`}
          strokeWidth="0.4"
        />
      ))}
    </svg>
  );
};

/* ── Corner brackets ── */
const Corners = () => {
  const corners = [
    { cls: 'top-1.5 left-1.5', d: 'M0 12 L0 0 L12 0', d2: 'M0 7 L0 0 L7 0' },
    { cls: 'top-1.5 right-1.5', d: 'M8 0 L20 0 L20 12', d2: 'M13 0 L20 0 L20 7' },
    { cls: 'bottom-1.5 left-1.5', d: 'M0 8 L0 20 L12 20', d2: 'M0 13 L0 20 L7 20' },
    { cls: 'bottom-1.5 right-1.5', d: 'M8 20 L20 20 L20 8', d2: 'M13 20 L20 20 L20 13' },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <motion.svg
          key={i}
          className={`absolute w-5 h-5 pointer-events-none z-[6] ${c.cls}`}
          viewBox="0 0 20 20"
          fill="none"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
        >
          <path d={c.d} stroke="hsl(var(--primary) / 0.4)" strokeWidth="1" strokeLinecap="round" />
          <path d={c.d2} stroke="hsl(var(--primary) / 0.8)" strokeWidth="1.5" strokeLinecap="round" />
        </motion.svg>
      ))}
    </>
  );
};

/* ── Scan line ── */
const ScanLine = () => (
  <motion.div
    className="absolute left-0 right-0 h-[2px] z-[5] pointer-events-none"
    style={{
      background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0) 8%, hsl(var(--primary) / 0.7) 50%, hsl(var(--primary) / 0) 92%, transparent)',
      boxShadow: '0 0 20px 6px hsl(var(--primary) / 0.35), 0 0 50px 12px hsl(var(--primary) / 0.1)',
    }}
    initial={{ top: '0%' }}
    animate={{ top: ['0%', '100%', '0%'] }}
    transition={{ duration: 5, ease: 'linear', repeat: Infinity, repeatDelay: 1.5 }}
  />
);

/* ── Decorative measurement tags ── */
const DEMO_LABELS = [
  { label: 'SHOULDER', side: 'right' as const, top: '18%' },
  { label: 'CHEST', side: 'left' as const, top: '27%' },
  { label: 'WAIST', side: 'right' as const, top: '41%' },
  { label: 'HIPS', side: 'right' as const, top: '50%' },
  { label: 'INSEAM', side: 'left' as const, top: '67%' },
];

const DemoLabels = () => (
  <>
    {DEMO_LABELS.map((l, i) => (
      <motion.div
        key={l.label}
        className="absolute pointer-events-none z-[7]"
        style={{
          top: l.top,
          ...(l.side === 'left' ? { left: '4%' } : { right: '4%' }),
        }}
        initial={{ opacity: 0, x: l.side === 'left' ? -8 : 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 + i * 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="backdrop-blur-md rounded px-1.5 py-0.5"
          style={{
            background: 'hsl(var(--background) / 0.5)',
            border: '1px solid hsl(var(--primary) / 0.25)',
            boxShadow: '0 1px 6px hsl(0 0% 0% / 0.3)',
          }}
        >
          <p className="text-[5px] font-bold tracking-[0.14em] uppercase" style={{ color: 'hsl(var(--primary))' }}>
            {l.label}
          </p>
          <motion.div className="flex gap-0.5">
            {[0, 1, 2].map(j => (
              <motion.div
                key={j}
                className="w-[3px] h-[3px] rounded-full bg-primary/60"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, delay: j * 0.15, repeat: Infinity }}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    ))}
  </>
);

const DecorativeSilhouette = ({ className = '', height = 200 }: Props) => {
  const [src, setSrc] = useState(processedCache || bodySilhouette);
  const [ready, setReady] = useState(!!processedCache);

  useEffect(() => {
    if (processedCache) {
      setSrc(processedCache);
      setReady(true);
      return;
    }
    processedPromise ??= processAlphaKey(bodySilhouette).then(r => { processedCache = r; return r; });
    processedPromise.then(r => { setSrc(r); setReady(true); });
  }, []);

  const w = height * 0.75; // 3:4 aspect

  return (
    <motion.div
      className={`relative overflow-hidden rounded-[1rem] ${className}`}
      style={{
        width: w,
        height,
        border: '2px solid hsl(var(--primary) / 0.35)',
        boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.15), inset 0 0 20px 4px hsl(var(--primary) / 0.04)',
      }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: ready ? 1 : 0,
        borderColor: [
          'hsl(var(--primary) / 0.25)',
          'hsl(var(--primary) / 0.45)',
          'hsl(var(--primary) / 0.25)',
        ],
      }}
      transition={{
        opacity: { duration: 0.8 },
        borderColor: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      {/* Deep space BG */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 42%, hsl(220 18% 7%) 0%, hsl(220 20% 3%) 100%)' }}
        animate={{ filter: ['hue-rotate(0deg)', 'hue-rotate(4deg)', 'hue-rotate(-4deg)', 'hue-rotate(0deg)'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Hex grid */}
      <MiniHexGrid />

      {/* Vignette */}
      <div className="absolute inset-0 z-[1]" style={{
        background: 'radial-gradient(ellipse 55% 50% at 50% 45%, hsl(var(--primary) / 0.03) 0%, transparent 50%), radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, hsl(220 20% 2% / 0.85) 100%)',
      }} />

      {/* Ambient glow behind figure */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2]"
      >
        <motion.div
          className="h-[85%] w-[40%]"
          style={{
            background: 'radial-gradient(ellipse at 50% 45%, hsl(var(--primary) / 0.2) 0%, hsl(var(--primary) / 0.06) 40%, transparent 70%)',
            filter: 'blur(18px)',
          }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Wide glow layer */}
      <img
        src={src}
        alt="" aria-hidden="true"
        className="absolute inset-0 h-full w-full object-contain pointer-events-none z-[2]"
        style={{
          filter: 'blur(18px) brightness(5) saturate(2.5) drop-shadow(0 0 50px hsl(var(--primary) / 0.7))',
          opacity: 0.3,
          transform: 'scale(1.06)',
        }}
      />

      {/* Mid bloom */}
      <img
        src={src}
        alt="" aria-hidden="true"
        className="absolute inset-0 h-full w-full object-contain pointer-events-none z-[2]"
        style={{
          filter: 'blur(8px) brightness(4.5) saturate(2) drop-shadow(0 0 25px hsl(var(--primary) / 0.6))',
          opacity: 0.45,
          transform: 'scale(1.02)',
        }}
      />

      {/* Edge glow with pulse */}
      <motion.img
        src={src}
        alt="" aria-hidden="true"
        className="absolute inset-0 h-full w-full object-contain pointer-events-none z-[3]"
        style={{
          filter: 'blur(2px) brightness(4.5) saturate(2) drop-shadow(0 0 12px hsl(var(--primary) / 0.9)) drop-shadow(0 0 24px hsl(var(--primary) / 0.6))',
          opacity: 0.8,
          willChange: 'transform, opacity',
        }}
        animate={{
          scale: [1.005, 1.035, 1.005],
          opacity: [0.7, 0.9, 0.7],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Main silhouette */}
      <motion.img
        src={src}
        alt="Body silhouette"
        className="absolute inset-0 h-full w-full object-contain z-[4]"
        style={{
          filter: 'brightness(1.15) saturate(1.1) drop-shadow(0 0 6px hsl(var(--primary) / 0.5))',
        }}
        animate={{ scale: [1, 1.008, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* CRT scanlines */}
      <div
        className="absolute inset-0 pointer-events-none z-[4] opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary) / 0.3) 2px, hsl(var(--primary) / 0.3) 3px)',
          backgroundSize: '100% 3px',
        }}
      />

      {/* Scan line */}
      <ScanLine />

      {/* Corner brackets */}
      <Corners />

      {/* Demo labels */}
      <DemoLabels />

      {/* Status bar */}
      <motion.div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[7]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
      >
        <div
          className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(220 15% 5% / 0.85))',
            border: '1px solid hsl(var(--primary) / 0.2)',
            boxShadow: '0 0 12px 3px hsl(var(--primary) / 0.06)',
          }}
        >
          <span className="text-[6px] font-mono uppercase tracking-[0.12em] font-bold" style={{ color: 'hsl(var(--primary))' }}>
            NEURAL MAP
          </span>
          <span className="relative flex h-1 w-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: 'hsl(142 71% 45%)' }} />
            <span className="relative inline-flex rounded-full h-1 w-1" style={{ backgroundColor: 'hsl(142 71% 45%)', boxShadow: '0 0 4px 1px hsl(142 71% 45% / 0.5)' }} />
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DecorativeSilhouette;
