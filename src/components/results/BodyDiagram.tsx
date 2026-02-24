import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';
import type { MeasurementRange } from '@/lib/types';
import { useEffect } from 'react';

const CM_TO_IN = 0.3937;
const fmtCm = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)}`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)}`;

const CACHE_KEY = 'dripcheck_body_silhouette_v2';

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
  { key: 'shoulder', label: 'SHOULDER', labelSide: 'right', x1: '33%', y1: '20%', x2: '67%', y2: '20%', labelTop: '18%', leaderX: 67, leaderY: 20 },
  { key: 'chest', label: 'CHEST', labelSide: 'left', x1: '38%', y1: '27%', x2: '62%', y2: '27%', labelTop: '25%', leaderX: 38, leaderY: 27 },
  { key: 'bust', label: 'BUST', labelSide: 'right', x1: '39%', y1: '30%', x2: '61%', y2: '30%', labelTop: '28%', leaderX: 61, leaderY: 30 },
  { key: 'waist', label: 'WAIST', labelSide: 'right', x1: '37%', y1: '41%', x2: '63%', y2: '41%', labelTop: '39%', leaderX: 63, leaderY: 41 },
  { key: 'hips', label: 'HIPS', labelSide: 'right', x1: '37%', y1: '51%', x2: '63%', y2: '51%', labelTop: '49%', leaderX: 63, leaderY: 51 },
  { key: 'sleeve', label: 'SLEEVE', labelSide: 'left', x1: '36%', y1: '23%', x2: '28%', y2: '53%', labelTop: '36%', leaderX: 32, leaderY: 38 },
  { key: 'inseam', label: 'INSEAM', labelSide: 'left', x1: '48%', y1: '55%', x2: '45%', y2: '86%', labelTop: '69%', leaderX: 46, leaderY: 72 },
];

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showUnits, setShowUnits] = useState<'cm' | 'in'>('cm');

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) { setImageUrl(cached); setLoading(false); return; }

    const generate = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-body-diagram', { method: 'POST', body: {} });
        if (fnError || !data?.image) { setError(true); setLoading(false); return; }
        localStorage.setItem(CACHE_KEY, data.image);
        setImageUrl(data.image);
      } catch { setError(true); } finally { setLoading(false); }
    };
    generate();
  }, []);

  const m = measurements;

  return (
    <div className="mb-4">
      {/* Unit toggle */}
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
        <div className="relative w-full max-w-[380px] mx-auto" style={{ minHeight: 500 }}>
          {loading && <div className="w-full h-[500px] skeleton-gold rounded-xl" />}
          {error && !imageUrl && (
            <div className="w-full h-[500px] flex items-center justify-center text-muted-foreground text-xs">
              Could not generate diagram
            </div>
          )}

          {imageUrl && (
            <img
              src={imageUrl}
              alt="Body silhouette for measurements"
              className="w-full h-[500px] mx-auto block rounded-xl img-normalize"
              style={{ objectFit: 'cover', transform: 'scale(1.10)' }}
            />
          )}

          {/* Height indicator */}
          {imageUrl && (
            <div className="absolute top-[9%] text-left" style={{ left: 4 }}>
              <div className="rounded-lg px-1.5 py-0.5">
                <p className="text-[12px] font-bold uppercase tracking-wide leading-none text-primary">HEIGHT</p>
                <p className="text-[11px] font-bold leading-none mt-0.5 text-foreground">
                  {showUnits === 'cm' ? `${heightCm.toFixed(0)} cm` : `${(heightCm * CM_TO_IN).toFixed(1)} in`}
                </p>
              </div>
            </div>
          )}

          {/* SVG measurement lines */}
          {imageUrl && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {measurementLines.map(({ key, x1, y1, x2, y2 }) => {
                if (!m[key]) return null;
                return (
                  <line key={key} x1={parseFloat(x1)} y1={parseFloat(y1)} x2={parseFloat(x2)} y2={parseFloat(y2)}
                    stroke="hsl(45 88% 40%)" strokeWidth="0.4" strokeDasharray="1.2 0.8" strokeLinecap="round" />
                );
              })}
              {measurementLines.map(({ key, x1, y1, x2, y2 }) => {
                if (!m[key]) return null;
                return (
                  <g key={`dots-${key}`}>
                    <circle cx={parseFloat(x1)} cy={parseFloat(y1)} r="0.8" fill="hsl(45 88% 40%)" />
                    <circle cx={parseFloat(x2)} cy={parseFloat(y2)} r="0.8" fill="hsl(45 88% 40%)" />
                  </g>
                );
              })}
              {measurementLines.map(({ key, labelSide, leaderX, leaderY }) => {
                if (!m[key]) return null;
                const labelEdgeX = labelSide === 'left' ? 18 : 82;
                return (
                  <line key={`leader-${key}`} x1={labelEdgeX} y1={leaderY} x2={leaderX} y2={leaderY}
                    stroke="hsl(45 88% 40%)" strokeWidth="0.25" strokeLinecap="round" opacity="0.6" />
                );
              })}
            </svg>
          )}

          {/* Measurement labels */}
          {imageUrl && measurementLines.map(({ key, label, labelSide, labelTop }) => {
            if (!m[key]) return null;
            const isLeft = labelSide === 'left';
            return (
              <div key={`label-${key}`} className="absolute" style={{ top: labelTop, ...(isLeft ? { left: 4 } : { right: 4 }) }}>
                <div className={`${isLeft ? 'text-left' : 'text-right'} rounded-lg px-1.5 py-0.5`}>
                  <p className="text-[11px] font-bold uppercase tracking-wider leading-none text-primary">{label}</p>
                  <p className="text-[11px] font-bold leading-none mt-0.5 text-foreground">
                    {showUnits === 'cm' ? `${fmtCm(m[key])} cm` : `${fmtIn(m[key])} in`}
                  </p>
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
