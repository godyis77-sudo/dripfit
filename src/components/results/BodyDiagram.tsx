import { useState } from 'react';
import type { MeasurementRange } from '@/lib/types';
import bodySilhouette from '@/assets/body-silhouette-clean.png';

const CM_TO_IN = 0.3937;
const fmtCm = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;

interface BodyDiagramProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
  /** When true, shows labels but hides measurement values (e.g. before scan) */
  hideValues?: boolean;
}

interface MeasurementLabel {
  key: string;
  label: string;
  side: 'left' | 'right';
  top: string;
}

const labels: MeasurementLabel[] = [
  { key: 'shoulder', label: 'SHOULDER', side: 'right', top: '14%' },
  { key: 'chest',    label: 'CHEST',    side: 'left',  top: '22%' },
  { key: 'bust',     label: 'BUST',     side: 'right', top: '27%' },
  { key: 'sleeve',   label: 'SLEEVE',   side: 'left',  top: '34%' },
  { key: 'waist',    label: 'WAIST',    side: 'right', top: '36%' },
  { key: 'hips',     label: 'HIPS',     side: 'right', top: '46%' },
  { key: 'inseam',   label: 'INSEAM',   side: 'left',  top: '68%' },
];

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

      <div className="border border-primary/20 rounded-xl overflow-hidden bg-card relative">
        {/* Background silhouette image — fully covered by opaque overlay */}
        <img
          src={bodySilhouette}
          alt="Body measurement diagram"
          className="w-full rounded-xl invisible"
          style={{ objectFit: 'contain' }}
        />

        {/* Fully opaque overlay to hide ALL baked-in text */}
        <div className="absolute inset-0 bg-card rounded-xl" />

        {/* Re-render silhouette with heavy darkening to eliminate any text visibility */}
        <img
          src={bodySilhouette}
          alt=""
          className="absolute inset-0 w-full h-full rounded-xl opacity-40"
          style={{ objectFit: 'contain', filter: 'brightness(0.3) contrast(2)' }}
        />

        {/* Height label */}
        <div className="absolute top-[7%] left-[6%] text-left">
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
        {labels.map(({ key, label, side, top }) => {
          const isLeft = side === 'left';
          return (
            <div
              key={key}
              className="absolute"
              style={{
                top,
                ...(isLeft ? { left: '4%' } : { right: '4%' }),
              }}
            >
              <div className={isLeft ? 'text-left' : 'text-right'}>
                <p className="text-[10px] font-bold uppercase tracking-wider leading-none text-primary">{label}</p>
                {hasScan && m[key] ? (
                  <>
                    <p className="text-[10px] font-semibold leading-none mt-0.5 text-foreground">{fmt(m[key])}</p>
                  </>
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
