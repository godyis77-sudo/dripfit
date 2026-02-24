import type { MeasurementRange } from '@/lib/types';
import bodySilhouette from '@/assets/body-measurements-silhouette.jpg';

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
  x1: string; y1: string; x2: string; y2: string;
  labelTop: string;
  leaderX: number;
  leaderY: number;
}

const measurementLines: MeasurementLine[] = [
  { key: 'shoulder', label: 'Shoulder', labelSide: 'right', x1: '33%', y1: '20%', x2: '67%', y2: '20%', labelTop: '18%', leaderX: 67, leaderY: 20 },
  { key: 'chest', label: 'Chest', labelSide: 'left', x1: '38%', y1: '27%', x2: '62%', y2: '27%', labelTop: '25%', leaderX: 38, leaderY: 27 },
  { key: 'bust', label: 'Bust', labelSide: 'right', x1: '39%', y1: '30%', x2: '61%', y2: '30%', labelTop: '28%', leaderX: 61, leaderY: 30 },
  { key: 'waist', label: 'Waist', labelSide: 'right', x1: '37%', y1: '41%', x2: '63%', y2: '41%', labelTop: '39%', leaderX: 63, leaderY: 41 },
  { key: 'hips', label: 'Hips', labelSide: 'right', x1: '37%', y1: '51%', x2: '63%', y2: '51%', labelTop: '49%', leaderX: 63, leaderY: 51 },
  { key: 'sleeve', label: 'Sleeve', labelSide: 'left', x1: '36%', y1: '23%', x2: '28%', y2: '53%', labelTop: '36%', leaderX: 32, leaderY: 38 },
  { key: 'inseam', label: 'Inseam', labelSide: 'left', x1: '48%', y1: '55%', x2: '45%', y2: '86%', labelTop: '69%', leaderX: 46, leaderY: 72 },
];

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const m = measurements;

  return (
    <div className="mb-4">
      <p className="section-label mb-2">Body Measurement Map</p>
      <div className="border border-primary/20 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(42 45% 92%), hsl(42 35% 85%))' }}>
        <div className="relative w-full max-w-[380px] mx-auto" style={{ minHeight: 500 }}>
          {/* Title overlay */}
          <p className="absolute top-3 left-0 right-0 text-center text-[18px] font-bold uppercase tracking-widest z-10" style={{ color: 'hsl(42 45% 45%)' }}>Scan Results</p>

          {/* Static body silhouette image */}
          <img
            src={bodySilhouette}
            alt="Body silhouette for measurements"
            className="w-full h-[500px] mx-auto block rounded-lg"
            style={{ objectFit: 'cover', transform: 'scale(1.10)' }}
          />

          {/* Height indicator */}
          <div className="absolute top-[9%] text-left" style={{ left: 4 }}>
            <div className="rounded px-1.5 py-0.5">
              <p className="text-[14px] font-bold uppercase tracking-wide leading-none" style={{ color: 'hsl(42 45% 45%)' }}>Height</p>
              <p className="text-[12px] font-bold leading-none mt-0.5" style={{ color: 'hsl(0 0% 20%)' }}>{(heightCm * CM_TO_IN).toFixed(1)} in</p>
              <p className="text-[12px] font-bold leading-none mt-0.5" style={{ color: 'hsl(0 0% 40%)' }}>{heightCm.toFixed(0)} cm</p>
            </div>
          </div>

          {/* SVG measurement lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {measurementLines.map(({ key, x1, y1, x2, y2 }) => {
              if (!m[key]) return null;
              return (
                <line
                  key={key}
                  x1={parseFloat(x1)} y1={parseFloat(y1)}
                  x2={parseFloat(x2)} y2={parseFloat(y2)}
                  stroke="hsl(42 45% 50%)"
                  strokeWidth="0.4"
                  strokeDasharray="1.2 0.8"
                  strokeLinecap="round"
                />
              );
            })}
            {measurementLines.map(({ key, x1, y1, x2, y2 }) => {
              if (!m[key]) return null;
              return (
                <g key={`dots-${key}`}>
                  <circle cx={parseFloat(x1)} cy={parseFloat(y1)} r="0.8" fill="hsl(42 45% 45%)" />
                  <circle cx={parseFloat(x2)} cy={parseFloat(y2)} r="0.8" fill="hsl(42 45% 45%)" />
                </g>
              );
            })}
            {measurementLines.map(({ key, labelSide, leaderX, leaderY }) => {
              if (!m[key]) return null;
              const labelEdgeX = labelSide === 'left' ? 18 : 82;
              return (
                <line
                  key={`leader-${key}`}
                  x1={labelEdgeX} y1={leaderY}
                  x2={leaderX} y2={leaderY}
                  stroke="hsl(42 45% 55%)"
                  strokeWidth="0.25"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Measurement labels */}
          {measurementLines.map(({ key, label, labelSide, labelTop }) => {
            if (!m[key]) return null;
            const isLeft = labelSide === 'left';

            return (
              <div
                key={`label-${key}`}
                className="absolute"
                style={{
                  top: labelTop,
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
