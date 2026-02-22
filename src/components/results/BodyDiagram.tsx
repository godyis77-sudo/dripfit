import type { MeasurementRange } from '@/lib/types';

const CM_TO_IN = 0.3937;
const fmt = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;

interface BodyDiagramProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
}

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const m = measurements;

  // Body center x, top of head y
  const cx = 200;
  const top = 18;

  // Realistic female body silhouette path (front view, standing, arms slightly away)
  const bodyPath = `
    M ${cx},${top}
    C ${cx - 13},${top} ${cx - 16},${top + 8} ${cx - 16},${top + 18}
    C ${cx - 16},${top + 28} ${cx - 13},${top + 36} ${cx},${top + 36}
    C ${cx + 13},${top + 36} ${cx + 16},${top + 28} ${cx + 16},${top + 18}
    C ${cx + 16},${top + 8} ${cx + 13},${top} ${cx},${top}
    Z
  `;

  // Separate body outline for fill (head + neck + torso + legs)
  const headRx = 15;
  const headRy = 19;
  const headCy = top + 19;

  // Key y positions
  const neckY = top + 40;
  const shoulderY = top + 52;
  const bustY = top + 78;
  const chestY = top + 90;
  const waistY = top + 120;
  const hipY = top + 150;
  const crotchY = top + 185;
  const kneeY = top + 260;
  const ankleY = top + 330;
  const footY = top + 340;

  // Shoulder/arm positions
  const shoulderW = 42;
  const armOutX = 58;
  const elbowY = top + 140;
  const wristY = top + 195;
  const handY = top + 210;

  // Full body outline
  const silhouette = `
    M ${cx - 7},${neckY}
    L ${cx - shoulderW},${shoulderY}
    L ${cx - armOutX},${shoulderY + 8}
    C ${cx - armOutX - 4},${shoulderY + 20} ${cx - armOutX - 6},${elbowY - 20} ${cx - armOutX - 5},${elbowY}
    C ${cx - armOutX - 4},${elbowY + 20} ${cx - armOutX - 2},${wristY - 15} ${cx - armOutX},${wristY}
    L ${cx - armOutX + 3},${handY}
    L ${cx - armOutX + 7},${wristY}
    C ${cx - armOutX + 8},${wristY - 10} ${cx - armOutX + 6},${elbowY + 15} ${cx - armOutX + 5},${elbowY}
    C ${cx - armOutX + 4},${elbowY - 15} ${cx - armOutX + 2},${shoulderY + 25} ${cx - armOutX + 4},${shoulderY + 14}

    C ${cx - 38},${bustY - 12} ${cx - 36},${bustY} ${cx - 34},${bustY + 5}
    C ${cx - 30},${chestY + 5} ${cx - 24},${waistY - 10} ${cx - 22},${waistY}
    C ${cx - 24},${waistY + 15} ${cx - 32},${hipY - 10} ${cx - 34},${hipY}
    C ${cx - 34},${hipY + 12} ${cx - 30},${crotchY - 10} ${cx - 26},${crotchY}

    L ${cx - 24},${kneeY}
    C ${cx - 22},${kneeY + 10} ${cx - 20},${ankleY - 20} ${cx - 18},${ankleY}
    L ${cx - 22},${footY}
    L ${cx - 10},${footY}
    L ${cx - 10},${ankleY}

    C ${cx - 8},${crotchY + 10} ${cx - 4},${crotchY} ${cx},${crotchY - 4}
    C ${cx + 4},${crotchY} ${cx + 8},${crotchY + 10} ${cx + 10},${ankleY}

    L ${cx + 10},${footY}
    L ${cx + 22},${footY}
    L ${cx + 18},${ankleY}
    C ${cx + 20},${ankleY - 20} ${cx + 22},${kneeY + 10} ${cx + 24},${kneeY}

    L ${cx + 26},${crotchY}
    C ${cx + 30},${crotchY - 10} ${cx + 34},${hipY + 12} ${cx + 34},${hipY}
    C ${cx + 32},${hipY - 10} ${cx + 24},${waistY + 15} ${cx + 22},${waistY}
    C ${cx + 24},${waistY - 10} ${cx + 30},${chestY + 5} ${cx + 34},${bustY + 5}
    C ${cx + 36},${bustY} ${cx + 38},${bustY - 12} ${cx + armOutX - 4},${shoulderY + 14}

    C ${cx + armOutX - 2},${shoulderY + 25} ${cx + armOutX - 4},${elbowY - 15} ${cx + armOutX - 5},${elbowY}
    C ${cx + armOutX - 6},${elbowY + 15} ${cx + armOutX - 8},${wristY - 10} ${cx + armOutX - 7},${wristY}
    L ${cx + armOutX - 3},${handY}
    L ${cx + armOutX},${wristY}
    C ${cx + armOutX + 2},${wristY - 15} ${cx + armOutX + 4},${elbowY + 20} ${cx + armOutX + 5},${elbowY}
    C ${cx + armOutX + 6},${elbowY - 20} ${cx + armOutX + 4},${shoulderY + 20} ${cx + armOutX},${shoulderY + 8}
    L ${cx + shoulderW},${shoulderY}
    L ${cx + 7},${neckY}
    Z
  `;

  // Measurement annotations
  const annotations: { key: string; label: string; bodyY: number; side: 'left' | 'right'; dashX?: number }[] = [
    { key: 'shoulder', label: 'Shoulder', bodyY: shoulderY, side: 'left' },
    { key: 'bust', label: 'Bust', bodyY: bustY + 2, side: 'right' },
    { key: 'chest', label: 'Chest', bodyY: chestY + 4, side: 'left' },
    { key: 'sleeve', label: 'Sleeve', bodyY: elbowY + 10, side: 'right', dashX: cx + armOutX - 2 },
    { key: 'waist', label: 'Waist', bodyY: waistY, side: 'left' },
    { key: 'hips', label: 'Hips', bodyY: hipY, side: 'right' },
    { key: 'inseam', label: 'Inseam', bodyY: kneeY - 10, side: 'left' },
  ];

  return (
    <div className="mb-4">
      <p className="section-label mb-2">Body Measurement Map</p>
      <div className="bg-card border border-border rounded-xl p-2 overflow-hidden">
        <svg viewBox="0 0 400 380" className="w-full max-w-[320px] mx-auto" aria-label="Body measurement diagram">
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Body silhouette - head */}
          <ellipse cx={cx} cy={headCy} rx={headRx} ry={headRy} fill="url(#bodyGrad)" stroke="hsl(var(--primary))" strokeWidth="1.2" opacity="0.7" />

          {/* Body silhouette - torso + limbs */}
          <path d={silhouette} fill="url(#bodyGrad)" stroke="hsl(var(--primary))" strokeWidth="1.2" strokeLinejoin="round" opacity="0.7" />

          {/* Height indicator on far left */}
          <g opacity="0.7">
            <line x1="18" y1={top} x2="18" y2={footY} stroke="hsl(var(--primary))" strokeWidth="0.8" strokeDasharray="3,2" />
            <line x1="12" y1={top} x2="24" y2={top} stroke="hsl(var(--primary))" strokeWidth="1.2" />
            <line x1="12" y1={footY} x2="24" y2={footY} stroke="hsl(var(--primary))" strokeWidth="1.2" />
            <text x="18" y={(top + footY) / 2} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="hsl(var(--primary))" fontFamily="Space Grotesk, sans-serif" transform={`rotate(-90, 18, ${(top + footY) / 2})`}>
              {heightCm.toFixed(0)} cm · {(heightCm * CM_TO_IN).toFixed(1)} in
            </text>
          </g>

          {/* Measurement annotations */}
          {annotations.map(({ key, label, bodyY, side, dashX }) => {
            if (!m[key]) return null;
            const isLeft = side === 'left';
            const dotX = dashX ?? (isLeft ? cx - 30 : cx + 30);
            const labelX = isLeft ? 48 : 355;
            const lineEndX = isLeft ? 54 : 348;
            const anchor = isLeft ? 'end' : 'start';

            return (
              <g key={key}>
                {/* Dashed connector */}
                <line x1={dotX} y1={bodyY} x2={lineEndX} y2={bodyY} stroke="hsl(var(--primary))" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.5" />
                {/* Dot */}
                <circle cx={dotX} cy={bodyY} r="2.5" fill="hsl(var(--primary))" opacity="0.8" />
                {/* Label text */}
                <text x={labelX} y={bodyY - 4} textAnchor={anchor} fontSize="8.5" fontWeight="700" fill="hsl(var(--foreground))" fontFamily="Space Grotesk, sans-serif">
                  {label}
                </text>
                <text x={labelX} y={bodyY + 6} textAnchor={anchor} fontSize="7" fill="hsl(var(--muted-foreground))" fontFamily="Space Grotesk, sans-serif">
                  {fmt(m[key])}
                </text>
                <text x={labelX} y={bodyY + 15} textAnchor={anchor} fontSize="6.5" fill="hsl(var(--muted-foreground))" fontFamily="Space Grotesk, sans-serif" opacity="0.7">
                  {fmtIn(m[key])}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default BodyDiagram;
