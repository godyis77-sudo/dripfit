import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { MeasurementRange } from '@/lib/types';
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

/* Wireframe body anchor points (SVG viewBox 200x440) */
const BODY_ANCHORS = {
  head:     { cx: 100, cy: 30 },
  shoulder: { left: { x: 55, y: 100 }, right: { x: 145, y: 100 } },
  chest:    { left: { x: 58, y: 130 }, right: { x: 142, y: 130 } },
  bust:     { left: { x: 60, y: 145 }, right: { x: 140, y: 145 } },
  sleeve:   { left: { x: 30, y: 175 }, right: { x: 170, y: 175 } },
  waist:    { left: { x: 65, y: 195 }, right: { x: 135, y: 195 } },
  hips:     { left: { x: 58, y: 230 }, right: { x: 142, y: 230 } },
  inseam:   { left: { x: 78, y: 330 }, right: { x: 122, y: 330 } },
  height:   { top: { x: 15, y: 20 }, bottom: { x: 15, y: 425 } },
};

/* Wireframe body outline paths */
const WIREFRAME_PATHS = [
  // Head
  'M 100 10 C 118 10 128 25 128 40 C 128 55 118 65 100 65 C 82 65 72 55 72 40 C 72 25 82 10 100 10 Z',
  // Neck
  'M 88 65 L 88 80 M 112 65 L 112 80',
  // Torso outline
  'M 88 80 L 50 100 L 30 170 L 42 175 L 55 130 L 60 195 L 65 235 L 78 240 L 78 380 L 68 425 L 82 430 L 95 245 L 100 240 L 105 245 L 118 430 L 132 425 L 122 380 L 122 240 L 135 235 L 140 195 L 145 130 L 158 175 L 170 170 L 150 100 L 112 80',
  // Cross-section lines (measurement guides)
  'M 55 100 L 145 100', // shoulders
  'M 58 130 L 142 130', // chest
  'M 60 145 L 140 145', // bust
  'M 65 195 L 135 195', // waist
  'M 58 230 L 142 230', // hips
];

interface OverlayConfig {
  key: string;
  label: string;
  side: 'left' | 'right';
  svgY: number;       // Y position on SVG for the leader line
  tagTop: string;     // CSS top for the data tag
  delay: number;
  lineStartX: number; // X where the leader line exits the body
}

const OVERLAYS: OverlayConfig[] = [
  { key: 'height',   label: 'HEIGHT',   side: 'left',  svgY: 220, tagTop: '8%',   delay: 0,    lineStartX: 15 },
  { key: 'shoulder', label: 'SHOULDER', side: 'right', svgY: 100, tagTop: '20%',  delay: 0.06, lineStartX: 145 },
  { key: 'chest',    label: 'CHEST',    side: 'left',  svgY: 130, tagTop: '27%',  delay: 0.12, lineStartX: 58 },
  { key: 'bust',     label: 'BUST',     side: 'right', svgY: 145, tagTop: '30%',  delay: 0.18, lineStartX: 140 },
  { key: 'sleeve',   label: 'SLEEVE',   side: 'left',  svgY: 175, tagTop: '37%',  delay: 0.24, lineStartX: 30 },
  { key: 'waist',    label: 'WAIST',    side: 'right', svgY: 195, tagTop: '42%',  delay: 0.30, lineStartX: 135 },
  { key: 'hips',     label: 'HIPS',     side: 'right', svgY: 230, tagTop: '50%',  delay: 0.36, lineStartX: 142 },
  { key: 'inseam',   label: 'INSEAM',   side: 'left',  svgY: 330, tagTop: '72%',  delay: 0.42, lineStartX: 78 },
];

const LEADER_LINE_VARIANTS = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (delay: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { delay: delay + 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }, opacity: { delay: delay + 0.4, duration: 0.2 } },
  }),
};

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const [mounted, setMounted] = useState(false);
  const useCm = getUseCm();

  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  const getValue = (key: string): { line1: string; line2: string } | null => {
    if (key === 'height') {
      return useCm
        ? { line1: `${heightCm} cm`, line2: fmtHeightFtIn(heightCm) }
        : { line1: fmtHeightFtIn(heightCm), line2: `${heightCm} cm` };
    }
    const range = measurements[key];
    if (!range) return null;
    return useCm ? { line1: fmtCm(range), line2: fmtIn(range) } : { line1: fmtIn(range), line2: fmtCm(range) };
  };

  return (
    <div className="mb-4">
      <div className="flex justify-center">
        <div
          className="relative rounded-[1rem] border-[3px] border-primary overflow-hidden"
          style={{
            boxShadow: '0 0 16px 6px hsl(45 88% 50% / 0.7), 0 0 50px 18px hsl(45 88% 45% / 0.35), 0 0 90px 30px hsl(45 88% 40% / 0.15), inset 0 0 14px 3px hsl(45 88% 50% / 0.2)',
            width: '100%',
            maxWidth: 380,
            aspectRatio: '200 / 440',
            background: 'hsl(0 0% 4%)',
          }}
        >
          <span className="sr-only">
            {`Body measurements diagram: ${[
              `Height ${heightCm} cm`,
              ...OVERLAYS.filter(l => l.key !== 'height' && measurements[l.key]).map(l => `${l.label} ${measurements[l.key].min.toFixed(0)}–${measurements[l.key].max.toFixed(0)} cm`),
            ].join(', ')}.`}
          </span>

          {/* SVG Wireframe Mesh */}
          <svg viewBox="0 0 200 440" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
            {/* Wireframe body paths */}
            {WIREFRAME_PATHS.map((d, i) => (
              <motion.path
                key={i}
                d={d}
                fill="none"
                stroke="hsl(45 88% 50% / 0.4)"
                strokeWidth={1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={mounted ? { pathLength: 1, opacity: 1 } : {}}
                transition={{
                  pathLength: { delay: i * 0.08, duration: 1.2, ease: [0.16, 1, 0.3, 1] },
                  opacity: { delay: i * 0.08, duration: 0.3 },
                }}
              />
            ))}

            {/* Leader lines from body to data tags */}
            {OVERLAYS.map((overlay) => {
              const val = getValue(overlay.key);
              if (!val) return null;
              const endX = overlay.side === 'left' ? 2 : 198;
              const path = `M ${overlay.lineStartX} ${overlay.svgY} L ${endX} ${overlay.svgY}`;
              return (
                <motion.path
                  key={`line-${overlay.key}`}
                  d={path}
                  fill="none"
                  stroke="hsl(45 88% 50% / 0.6)"
                  strokeWidth={0.8}
                  strokeDasharray="3 2"
                  variants={LEADER_LINE_VARIANTS}
                  custom={overlay.delay}
                  initial="hidden"
                  animate={mounted ? 'visible' : 'hidden'}
                />
              );
            })}

            {/* Height arrow line */}
            {getValue('height') && (
              <>
                <motion.line
                  x1={15} y1={20} x2={15} y2={425}
                  stroke="hsl(45 88% 50% / 0.5)"
                  strokeWidth={0.8}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={mounted ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
                {/* Arrow caps */}
                <motion.path d="M 12 25 L 15 15 L 18 25" fill="none" stroke="hsl(45 88% 50% / 0.5)" strokeWidth={0.8}
                  initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}} transition={{ delay: 1.2 }} />
                <motion.path d="M 12 420 L 15 430 L 18 420" fill="none" stroke="hsl(45 88% 50% / 0.5)" strokeWidth={0.8}
                  initial={{ opacity: 0 }} animate={mounted ? { opacity: 1 } : {}} transition={{ delay: 1.2 }} />
              </>
            )}

            {/* Measurement dot indicators on body */}
            {OVERLAYS.filter(o => o.key !== 'height').map((overlay) => {
              const val = getValue(overlay.key);
              if (!val) return null;
              return (
                <motion.circle
                  key={`dot-${overlay.key}`}
                  cx={overlay.lineStartX}
                  cy={overlay.svgY}
                  r={2.5}
                  fill="hsl(45 88% 50%)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={mounted ? { scale: 1, opacity: 1 } : {}}
                  transition={{ delay: overlay.delay + 0.5, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                />
              );
            })}
          </svg>

          {/* Data tags */}
          {mounted && OVERLAYS.map((overlay) => {
            const val = getValue(overlay.key);
            if (!val) return null;
            return (
              <motion.div
                key={overlay.key}
                className="absolute"
                style={{
                  top: overlay.tagTop,
                  ...(overlay.side === 'left' ? { left: '2%' } : { right: '2%' }),
                }}
                initial={{ opacity: 0, x: overlay.side === 'left' ? -8 : 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: overlay.delay + 0.7, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="rounded-md px-1.5 py-0.5"
                  style={{
                    background: 'hsl(0 0% 0% / 0.7)',
                    backdropFilter: 'blur(8px)',
                    border: '0.5px solid hsl(45 88% 50% / 0.3)',
                    textAlign: overlay.side === 'left' ? 'left' : 'right',
                  }}
                >
                  <p className="text-[8px] font-bold uppercase tracking-wider" style={{ color: 'hsl(45 88% 50%)' }}>
                    {overlay.label}
                  </p>
                  <p className="text-[10px] font-black leading-tight text-white">{val.line1}</p>
                  <p className="text-[8px] leading-tight text-white/60">{val.line2}</p>
                </div>
              </motion.div>
            );
          })}

          {/* Outer glow border */}
          <div
            className="absolute -inset-[7px] rounded-[calc(1rem+4px)] border-[4px] border-black pointer-events-none"
            style={{ boxShadow: 'inset 0 0 8px 2px hsl(45 88% 50% / 0.7), 0 0 10px 2px hsl(45 88% 50% / 0.6), 0 0 20px 4px hsl(45 88% 50% / 0.25)' }}
          />
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
