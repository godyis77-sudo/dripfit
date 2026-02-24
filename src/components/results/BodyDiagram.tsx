import { useState } from 'react';
import type { MeasurementRange } from '@/lib/types';

const CM_TO_IN = 0.3937;
const fmtCm = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;

interface BodyDiagramProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
  hideValues?: boolean;
}

interface MeasurementLabel {
  key: string;
  label: string;
  side: 'left' | 'right';
  /** y position in SVG viewBox units (0-400) */
  y: number;
}

const labels: MeasurementLabel[] = [
  { key: 'shoulder', label: 'SHOULDER', side: 'right', y: 82 },
  { key: 'chest',    label: 'CHEST',    side: 'left',  y: 115 },
  { key: 'bust',     label: 'BUST',     side: 'right', y: 130 },
  { key: 'sleeve',   label: 'SLEEVE',   side: 'left',  y: 165 },
  { key: 'waist',    label: 'WAIST',    side: 'right', y: 170 },
  { key: 'hips',     label: 'HIPS',     side: 'right', y: 210 },
  { key: 'inseam',   label: 'INSEAM',   side: 'left',  y: 300 },
];

/** Pure SVG body silhouette — no baked-in text */
const BodySilhouetteSVG = () => (
  <svg viewBox="0 0 200 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Head */}
    <ellipse cx="100" cy="30" rx="16" ry="20" fill="hsl(var(--foreground))" opacity="0.15" />
    {/* Neck */}
    <rect x="93" y="48" width="14" height="12" rx="3" fill="hsl(var(--foreground))" opacity="0.15" />
    {/* Torso */}
    <path
      d="M70 60 Q60 60 55 70 L50 90 Q48 100 50 115 L52 140 Q53 160 55 175 L58 195 Q60 205 65 210 L70 215 Q80 220 100 220 Q120 220 130 215 L135 210 Q140 205 142 195 L145 175 Q147 160 148 140 L150 115 Q152 100 150 90 L145 70 Q140 60 130 60 Z"
      fill="hsl(var(--foreground))" opacity="0.15"
    />
    {/* Left arm */}
    <path
      d="M55 70 Q45 72 38 80 L28 105 Q22 125 20 145 L18 165 Q17 175 20 180 Q23 183 26 180 L30 170 Q35 150 38 130 L42 110 Q45 95 50 85"
      fill="hsl(var(--foreground))" opacity="0.12"
    />
    {/* Right arm */}
    <path
      d="M145 70 Q155 72 162 80 L172 105 Q178 125 180 145 L182 165 Q183 175 180 180 Q177 183 174 180 L170 170 Q165 150 162 130 L158 110 Q155 95 150 85"
      fill="hsl(var(--foreground))" opacity="0.12"
    />
    {/* Left leg */}
    <path
      d="M72 218 Q68 230 66 250 L62 290 Q60 310 58 330 L56 350 Q55 365 54 375 Q53 385 58 388 Q63 390 68 388 L72 382 Q73 375 72 365 L74 340 Q76 320 78 300 L82 270 Q85 250 88 235 L92 220"
      fill="hsl(var(--foreground))" opacity="0.15"
    />
    {/* Right leg */}
    <path
      d="M128 218 Q132 230 134 250 L138 290 Q140 310 142 330 L144 350 Q145 365 146 375 Q147 385 142 388 Q137 390 132 388 L128 382 Q127 375 128 365 L126 340 Q124 320 122 300 L118 270 Q115 250 112 235 L108 220"
      fill="hsl(var(--foreground))" opacity="0.15"
    />
    {/* Measurement guide lines (dashed) */}
    {/* Shoulder line */}
    <line x1="45" y1="68" x2="155" y2="68" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.3" />
    {/* Chest line */}
    <line x1="48" y1="100" x2="152" y2="100" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.3" />
    {/* Waist line */}
    <line x1="53" y1="155" x2="147" y2="155" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.3" />
    {/* Hip line */}
    <line x1="60" y1="210" x2="140" y2="210" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.3" />
    {/* Inseam line */}
    <line x1="100" y1="220" x2="100" y2="370" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="3 2" opacity="0.3" />
    {/* Height line */}
    <line x1="15" y1="10" x2="15" y2="390" stroke="hsl(var(--primary))" strokeWidth="0.6" opacity="0.25" />
    <line x1="10" y1="10" x2="20" y2="10" stroke="hsl(var(--primary))" strokeWidth="0.6" opacity="0.25" />
    <line x1="10" y1="390" x2="20" y2="390" stroke="hsl(var(--primary))" strokeWidth="0.6" opacity="0.25" />
  </svg>
);

const BodyDiagram = ({ measurements, heightCm, hideValues = false }: BodyDiagramProps) => {
  const [showUnits, setShowUnits] = useState<'cm' | 'in'>('cm');
  const m = measurements;
  const fmt = showUnits === 'cm' ? fmtCm : fmtIn;
  const hasScan = !hideValues && Object.keys(m).length > 0;

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="section-label">Body Measurement Map</p>
        {hasScan && (
          <div className="flex items-center gap-1 bg-card border border-border rounded-full px-1 py-0.5">
            {(['cm', 'in'] as const).map(u => (
              <button
                key={u}
                onClick={() => setShowUnits(u)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors min-h-[28px] ${
                  showUnits === u ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border border-primary/20 rounded-xl overflow-hidden bg-card relative" style={{ aspectRatio: '1/2' }}>
        {/* Clean SVG silhouette */}
        <div className="absolute inset-0">
          <BodySilhouetteSVG />
        </div>

        {/* Height label */}
        <div className="absolute top-[4%] left-[6%] text-left">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary leading-none">HEIGHT</p>
          {hasScan ? (
            <p className="text-[11px] font-bold text-foreground leading-none mt-1">
              {showUnits === 'cm' ? `${heightCm.toFixed(0)} cm` : `${(heightCm * CM_TO_IN).toFixed(1)} in`}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground leading-none mt-1">—</p>
          )}
        </div>

        {/* Measurement labels */}
        {labels.map(({ key, label, side, y }) => {
          const isLeft = side === 'left';
          const topPercent = `${(y / 400) * 100}%`;
          return (
            <div
              key={key}
              className="absolute"
              style={{
                top: topPercent,
                ...(isLeft ? { left: '4%' } : { right: '4%' }),
              }}
            >
              <div className={isLeft ? 'text-left' : 'text-right'}>
                <p className="text-[10px] font-bold uppercase tracking-wider leading-none text-primary">{label}</p>
                {hasScan && m[key] ? (
                  <p className="text-[10px] font-semibold leading-none mt-0.5 text-foreground">{fmt(m[key])}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BodyDiagram;
