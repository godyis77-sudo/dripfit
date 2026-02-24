import type { MeasurementRange } from '@/lib/types';

const CM_TO_IN = 0.3937;
const fmt = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;

interface BodyDiagramProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
}

interface MeasurementLine {
  key: string;
  label: string;
  labelSide: 'left' | 'right';
  /** SVG y-coordinate for the horizontal measurement line */
  lineY: number;
  /** SVG x start/end for the dashed line across the body */
  x1: number; x2: number;
}

const measurementLines: MeasurementLine[] = [
  { key: 'shoulder', label: 'Shoulder', labelSide: 'right', lineY: 48, x1: 36, x2: 84 },
  { key: 'chest',    label: 'Chest',    labelSide: 'left',  lineY: 68, x1: 40, x2: 80 },
  { key: 'bust',     label: 'Bust',     labelSide: 'right', lineY: 78, x1: 41, x2: 79 },
  { key: 'waist',    label: 'Waist',    labelSide: 'right', lineY: 100, x1: 44, x2: 76 },
  { key: 'hips',     label: 'Hips',     labelSide: 'right', lineY: 125, x1: 40, x2: 80 },
  { key: 'sleeve',   label: 'Sleeve',   labelSide: 'left',  lineY: 90, x1: 24, x2: 44 },
  { key: 'inseam',   label: 'Inseam',   labelSide: 'left',  lineY: 170, x1: 52, x2: 56 },
];

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const m = measurements;

  return (
    <div className="mb-4">
      <p className="section-label mb-2">Body Measurement Map</p>
      <div className="border border-primary/20 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(42 45% 92%), hsl(42 35% 85%))' }}>
        <div className="relative w-full max-w-[380px] mx-auto" style={{ minHeight: 500 }}>
          {/* Title */}
          <p className="absolute top-3 left-0 right-0 text-center text-[18px] font-bold uppercase tracking-widest z-10" style={{ color: 'hsl(42 45% 45%)' }}>Scan Results</p>

          {/* SVG body silhouette + measurement lines */}
          <svg viewBox="0 0 120 240" className="w-full h-[500px]" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Body outline */}
            <ellipse cx="60" cy="24" rx="14" ry="16" stroke="hsl(42 45% 40%)" strokeWidth="1.2" opacity="0.5" />
            <path
              d="M46 40 L46 48 L26 56 L24 60 L34 64 L36 100 L40 130 L36 180 L32 215 L46 215 L52 180 L56 140 L60 140 L64 140 L68 180 L74 215 L88 215 L84 180 L80 130 L84 100 L86 64 L96 60 L94 56 L74 48 L74 40"
              stroke="hsl(42 45% 40%)" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" strokeLinejoin="round"
            />

            {/* Height vertical indicator */}
            <line x1="10" y1="10" x2="10" y2="215" stroke="hsl(42 45% 40%)" strokeWidth="0.6" strokeDasharray="2 1.5" />
            <line x1="6" y1="10" x2="14" y2="10" stroke="hsl(42 45% 40%)" strokeWidth="0.6" />
            <line x1="6" y1="215" x2="14" y2="215" stroke="hsl(42 45% 40%)" strokeWidth="0.6" />

            {/* Measurement dashed lines */}
            {measurementLines.map(({ key, lineY, x1, x2 }) => {
              if (!m[key]) return null;
              return (
                <g key={key}>
                  <line x1={x1} y1={lineY} x2={x2} y2={lineY} stroke="hsl(42 45% 50%)" strokeWidth="0.6" strokeDasharray="2 1.5" strokeLinecap="round" />
                  <circle cx={x1} cy={lineY} r="1.2" fill="hsl(42 45% 45%)" />
                  <circle cx={x2} cy={lineY} r="1.2" fill="hsl(42 45% 45%)" />
                </g>
              );
            })}
          </svg>

          {/* Height label */}
          <div className="absolute top-[8%] text-left" style={{ left: 4 }}>
            <div className="rounded px-1.5 py-0.5">
              <p className="text-[14px] font-bold uppercase tracking-wide leading-none" style={{ color: 'hsl(42 45% 45%)' }}>Height</p>
              <p className="text-[12px] font-bold leading-none mt-0.5" style={{ color: 'hsl(0 0% 20%)' }}>{(heightCm * CM_TO_IN).toFixed(1)} in</p>
              <p className="text-[12px] font-bold leading-none mt-0.5" style={{ color: 'hsl(0 0% 40%)' }}>{heightCm.toFixed(0)} cm</p>
            </div>
          </div>

          {/* Measurement labels positioned alongside the SVG */}
          {measurementLines.map(({ key, label, labelSide, lineY }) => {
            if (!m[key]) return null;
            const isLeft = labelSide === 'left';
            // Convert SVG y (0-240 viewBox) to percentage of the 500px container
            const topPercent = `${(lineY / 240) * 100 - 2}%`;

            return (
              <div
                key={`label-${key}`}
                className="absolute"
                style={{
                  top: topPercent,
                  ...(isLeft ? { left: 4 } : { right: 4 }),
                }}
              >
                <div className={`${isLeft ? 'text-left' : 'text-right'} rounded px-1.5 py-0.5`}>
                  <p className="text-[14px] font-bold uppercase tracking-wide leading-none" style={{ color: 'hsl(42 45% 45%)' }}>{label}</p>
                  <p className="text-[12px] font-bold leading-none mt-0.5" style={{ color: 'hsl(0 0% 20%)' }}>{fmtIn(m[key])}</p>
                  <p className="text-[12px] font-bold leading-none mt-0.5" style={{ color: 'hsl(0 0% 40%)' }}>{fmt(m[key])}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
