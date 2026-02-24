import { useState } from 'react';
import type { MeasurementRange } from '@/lib/types';

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
  { key: 'shoulder', label: 'SHOULDER', labelSide: 'right', x1: 36, y1: 17.5, x2: 64, y2: 17.5, labelY: 15.5 },
  { key: 'chest',    label: 'CHEST',    labelSide: 'left',  x1: 38, y1: 24,   x2: 62, y2: 24,   labelY: 22 },
  { key: 'bust',     label: 'BUST',     labelSide: 'right', x1: 39, y1: 29,   x2: 61, y2: 29,   labelY: 27 },
  { key: 'waist',    label: 'WAIST',    labelSide: 'right', x1: 42, y1: 38,   x2: 58, y2: 38,   labelY: 36 },
  { key: 'hips',     label: 'HIPS',     labelSide: 'right', x1: 38, y1: 47,   x2: 62, y2: 47,   labelY: 45 },
  { key: 'sleeve',   label: 'SLEEVE',   labelSide: 'left',  x1: 35, y1: 20,   x2: 22, y2: 46,   labelY: 32 },
  { key: 'inseam',   label: 'INSEAM',   labelSide: 'left',  x1: 48, y1: 52,   x2: 44, y2: 88,   labelY: 72 },
];

// SVG path for a clean human body silhouette
const SILHOUETTE_PATH = `
M50 4
C47 4 44.5 5.5 44 8 C43.5 10.5 44.5 13 47 14 C47.5 14.2 48 14.3 48.5 14.3
C48.5 14.5 48 15 47.5 15.5
C46 15.2 44 15 42 15.5 C39 16 37 17 36 18
C34 19.5 32 22 30 25 C28 28 26 31 24 34
C23 36 22 38 22 39.5 C22 41 23 42 24.5 42
C25.5 42 26.5 41 27 39.5 C28 37 29 35 30 33
C31 31 32 29 33 27.5
C33 29 33 31 33 33 C33 36 33 39 33 42
C33 44 33 46 33 48 C32.5 50 32 52 32 54
C32 55 33 56 34 56 C34.5 56 35 55.5 35 54
C35 52 35.5 50 36 48
C37 48.5 38 49 39 49.5
C39 55 39 61 39 67 C39 73 38.5 79 38 85
C37.5 88 37 91 37 93 C37 94.5 38 95.5 39.5 95.5
C41 95.5 42 94.5 42 93 C42.5 90 43 87 43.5 84
C44 80 44.5 76 45 72
C45.5 68 46 64 46.5 60 C47 58 47.5 56 48 54
C48.5 54 49 54 49.5 54 C50 54 50.5 54 51 54
C51.5 56 52 58 52.5 60 C53 64 53.5 68 54 72
C54.5 76 55 80 55.5 84 C56 87 56.5 90 57 93
C57 94.5 58 95.5 59.5 95.5 C61 95.5 62 94.5 62 93
C62 91 61.5 88 61 85 C60.5 79 60 73 60 67
C60 61 60 55 60 49.5
C61 49 62 48.5 63 48
C63.5 50 64 52 64 54 C64 55.5 64.5 56 65 56
C66 56 67 55 67 54 C67 52 66.5 50 66 48
C66 46 66 44 66 42 C66 39 66 36 66 33
C66 31 66 29 66 27.5
C67 29 68 31 69 33 C70 35 71 37 72 39.5
C72.5 41 73.5 42 74.5 42 C76 42 77 41 77 39.5
C77 38 76 36 75 34 C73 31 71 28 69 25
C67 22 65 19.5 63 18 C62 17 60 16 57 15.5
C55 15 53 15.2 51.5 15.5
C51 15 50.5 14.5 50.5 14.3
C51 14.3 51.5 14.2 52 14
C54.5 13 55.5 10.5 55 8 C54.5 5.5 52 4 50 4 Z
`;

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
          {/* SVG body silhouette + measurement lines */}
          <svg
            className="w-full h-[460px] mx-auto block"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Silhouette */}
            <path d={SILHOUETTE_PATH} fill="hsl(var(--foreground) / 0.15)" stroke="hsl(var(--foreground) / 0.25)" strokeWidth="0.3" />

            {/* Measurement lines */}
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
            <div className="absolute top-[6%] left-2 text-left">
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
                  ...(isLeft ? { left: 4 } : { right: 4 }),
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
