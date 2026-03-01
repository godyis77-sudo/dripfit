import type { MeasurementRange } from '@/lib/types';
import bodySilhouette from '@/assets/body-silhouette-clean.png';

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
  labelEdgeX: number;
  leaderX: number;
  leaderY: number;
}

const measurementLines: MeasurementLine[] = [
  { key: 'shoulder', label: 'Shoulder', labelSide: 'right', x1: '37.7%', y1: '20.2%', x2: '62.3%', y2: '20.2%', labelTop: '18.9%', labelEdgeX: 76, leaderX: 62.3, leaderY: 20.2 },
  { key: 'chest', label: 'Chest', labelSide: 'left', x1: '41.2%', y1: '25.9%', x2: '58.8%', y2: '25.9%', labelTop: '24.1%', labelEdgeX: 16, leaderX: 41.2, leaderY: 25.9 },
  { key: 'bust', label: 'Bust', labelSide: 'right', x1: '41.2%', y1: '27.6%', x2: '58.8%', y2: '27.6%', labelTop: '26.3%', labelEdgeX: 88, leaderX: 58.8, leaderY: 27.6 },
  { key: 'waist', label: 'Waist', labelSide: 'right', x1: '43%', y1: '39.5%', x2: '57%', y2: '39.5%', labelTop: '38.2%', labelEdgeX: 85, leaderX: 57, leaderY: 39.5 },
  { key: 'hips', label: 'Hips', labelSide: 'right', x1: '40.4%', y1: '47.4%', x2: '59.6%', y2: '47.4%', labelTop: '46.1%', labelEdgeX: 88, leaderX: 59.6, leaderY: 47.4 },
  { key: 'sleeve', label: 'Sleeve', labelSide: 'left', x1: '36.8%', y1: '24.1%', x2: '34.2%', y2: '46.1%', labelTop: '33.8%', labelEdgeX: 22, leaderX: 34.2, leaderY: 35.1 },
  { key: 'inseam', label: 'Inseam', labelSide: 'left', x1: '47.4%', y1: '50.4%', x2: '44.7%', y2: '82.9%', labelTop: '62.7%', labelEdgeX: 18, leaderX: 45.6, leaderY: 64 },
];

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  // Clear old AI-generated cache so it doesn't interfere
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('dripcheck_body_silhouette_v2');
  }
  const m = measurements;

  return (
    <div className="mb-4">
      <p className="section-label mb-2">Body Measurement Map</p>
      <div className="border border-primary/20 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(42 45% 92%), hsl(42 35% 85%))' }}>
        <div className="relative w-full max-w-[380px] mx-auto aspect-[2/3]">
          {/* Title overlay */}
          <p className="absolute top-3 left-0 right-0 text-center text-[18px] font-bold uppercase tracking-widest z-10" style={{ color: 'hsl(42 45% 45%)' }}>Scan Results</p>
          
          {/* Static body silhouette */}
          <img
            src={bodySilhouette}
            alt="Body silhouette for measurements"
            className="w-full h-full mx-auto block rounded-lg"
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
          />

          {/* Height indicator */}
          <div className="absolute top-[8%] text-left" style={{ left: 4 }}>
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
            {measurementLines.map(({ key, labelEdgeX, leaderX, leaderY }) => {
              if (!m[key]) return null;
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
