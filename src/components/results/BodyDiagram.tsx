import { useState } from 'react';
import type { MeasurementRange } from '@/lib/types';
import bodySilhouette from '@/assets/body-silhouette-clean.png';

const CM_TO_IN = 0.3937;
const fmtCm = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;

interface BodyDiagramProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
}

interface MeasurementLine {
  key: string;
  label: string;
  labelSide: 'left' | 'right';
  x1: number; y1: number; x2: number; y2: number;
  labelY: number;
}

const measurementLines: MeasurementLine[] = [
  { key: 'shoulder', label: 'SHOULDER', labelSide: 'right', x1: 35, y1: 18, x2: 65, y2: 18, labelY: 16 },
  { key: 'chest',    label: 'CHEST',    labelSide: 'left',  x1: 37, y1: 25, x2: 63, y2: 25, labelY: 23 },
  { key: 'bust',     label: 'BUST',     labelSide: 'right', x1: 38, y1: 30, x2: 62, y2: 30, labelY: 28 },
  { key: 'waist',    label: 'WAIST',    labelSide: 'right', x1: 40, y1: 40, x2: 60, y2: 40, labelY: 38 },
  { key: 'hips',     label: 'HIPS',     labelSide: 'right', x1: 37, y1: 50, x2: 63, y2: 50, labelY: 48 },
  { key: 'sleeve',   label: 'SLEEVE',   labelSide: 'left',  x1: 36, y1: 22, x2: 26, y2: 50, labelY: 35 },
  { key: 'inseam',   label: 'INSEAM',   labelSide: 'left',  x1: 48, y1: 54, x2: 45, y2: 85, labelY: 70 },
];

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const [showUnits, setShowUnits] = useState<'cm' | 'in'>('cm');
  const m = measurements;
  const fmt = showUnits === 'cm' ? fmtCm : fmtIn;

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="section-label">Body Measurement Map</p>
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
      </div>

      <div className="border border-primary/20 rounded-xl overflow-hidden bg-card">
        <div className="relative w-full max-w-[380px] mx-auto" style={{ minHeight: 460 }}>
          {/* Clean silhouette image */}
          <img
            src={bodySilhouette}
            alt="Body measurement diagram"
            className="w-full h-[460px] mx-auto block rounded-xl"
            style={{ objectFit: 'contain' }}
          />

          {/* SVG measurement lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {measurementLines.map(({ key, x1, y1, x2, y2 }) => {
              if (!m[key]) return null;
              return (
                <g key={key}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="hsl(var(--primary))" strokeWidth="0.35" strokeDasharray="1.2 0.8" strokeLinecap="round" />
                  <circle cx={x1} cy={y1} r="0.7" fill="hsl(var(--primary))" />
                  <circle cx={x2} cy={y2} r="0.7" fill="hsl(var(--primary))" />
                </g>
              );
            })}
          </svg>

          {/* Height label */}
          {heightCm > 0 && (
            <div className="absolute top-[8%] left-1 text-left">
              <p className="text-[10px] font-bold uppercase tracking-wide text-primary leading-none">HEIGHT</p>
              <p className="text-[10px] font-bold text-foreground leading-none mt-0.5">
                {showUnits === 'cm' ? `${heightCm.toFixed(0)} cm` : `${(heightCm * CM_TO_IN).toFixed(1)} in`}
              </p>
            </div>
          )}

          {/* Measurement labels */}
          {measurementLines.map(({ key, label, labelSide, labelY }) => {
            if (!m[key]) return null;
            const isLeft = labelSide === 'left';
            return (
              <div
                key={`label-${key}`}
                className="absolute"
                style={{
                  top: `${labelY}%`,
                  ...(isLeft ? { left: 2 } : { right: 2 }),
                }}
              >
                <div className={`${isLeft ? 'text-left' : 'text-right'}`}>
                  <p className="text-[9px] font-bold uppercase tracking-wider leading-none text-primary">{label}</p>
                  <p className="text-[9px] font-semibold leading-none mt-0.5 text-foreground">{fmt(m[key])}</p>
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
