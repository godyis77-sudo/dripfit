import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import type { MeasurementRange } from '@/lib/types';

const CM_TO_IN = 0.3937;
const fmt = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;

const CACHE_KEY = 'dripcheck_body_silhouette_v2';

interface BodyDiagramProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
}


// Measurement line definitions — each describes a visible reference line on the body
interface MeasurementLine {
  key: string;
  label: string;
  labelSide: 'left' | 'right';
  // Line coordinates as percentages of the container
  x1: string; y1: string; x2: string; y2: string;
  // Label position
  labelTop: string;
}

const measurementLines: MeasurementLine[] = [
  // Shoulder: shoulder tip to shoulder tip
  { key: 'shoulder', label: 'Shoulder', labelSide: 'left', x1: '37%', y1: '17%', x2: '63%', y2: '17%', labelTop: '15.5%' },
  // Chest: armpit to armpit (tighter inward)
  { key: 'chest', label: 'Chest', labelSide: 'left', x1: '38%', y1: '22%', x2: '62%', y2: '22%', labelTop: '20.5%' },
  // Bust: across bust (tighter)
  { key: 'bust', label: 'Bust', labelSide: 'right', x1: '39%', y1: '25%', x2: '61%', y2: '25%', labelTop: '23.5%' },
  // Waist: narrowest torso point
  { key: 'waist', label: 'Waist', labelSide: 'right', x1: '41%', y1: '34%', x2: '59%', y2: '34%', labelTop: '32.5%' },
  // Hips: widest hip point (pulled in)
  { key: 'hips', label: 'Hips', labelSide: 'right', x1: '37%', y1: '41%', x2: '63%', y2: '41%', labelTop: '39.5%' },
  // Sleeve: shoulder seam to wrist along arm
  { key: 'sleeve', label: 'Sleeve', labelSide: 'left', x1: '36%', y1: '18%', x2: '28%', y2: '43%', labelTop: '29%' },
  // Inseam: crotch to inner ankle
  { key: 'inseam', label: 'Inseam', labelSide: 'left', x1: '48%', y1: '45%', x2: '45%', y2: '76%', labelTop: '60%' },
];

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      setImageUrl(cached);
      setLoading(false);
      return;
    }

    const generate = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-body-diagram', {
          method: 'POST',
          body: {},
        });

        if (fnError || !data?.image) {
          console.error('Body diagram generation failed:', fnError);
          setError(true);
          setLoading(false);
          return;
        }

        localStorage.setItem(CACHE_KEY, data.image);
        setImageUrl(data.image);
      } catch (e) {
        console.error('Body diagram error:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, []);

  const m = measurements;

  return (
    <div className="mb-4">
      <p className="section-label mb-2">Body Measurement Map</p>
      <div className="border border-primary/20 rounded-xl overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(0 0% 100%), hsl(42 45% 92%), hsl(42 35% 85%))' }}>
        <div className="relative w-full max-w-[380px] mx-auto" style={{ minHeight: 500 }}>
          {/* Body image */}
          {loading && (
            <Skeleton className="w-full h-[500px] rounded-lg" />
          )}

          {error && !imageUrl && (
            <div className="w-full h-[500px] flex items-center justify-center text-muted-foreground text-xs">
              Could not generate diagram
            </div>
          )}

          {imageUrl && (
            <img
              src={imageUrl}
              alt="Body silhouette for measurements"
              className="w-full h-[500px] mx-auto block rounded-lg"
              style={{ objectFit: 'cover' }}
            />
          )}

          {/* Height indicator on far left */}
          {imageUrl && (
            <div className="absolute left-0 top-[4%] bottom-[4%] w-5 flex flex-col items-center">
              <div className="w-px flex-1 border-l border-dashed" style={{ borderColor: 'hsl(42 45% 55%)' }} />
              <span
                className="text-[8px] font-bold whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: 'hsl(42 45% 45%)' }}
              >
                {heightCm.toFixed(0)} cm · {(heightCm * CM_TO_IN).toFixed(1)} in
              </span>
              <div className="w-px flex-1 border-l border-dashed" style={{ borderColor: 'hsl(42 45% 55%)' }} />
            </div>
          )}

          {/* Measurement reference lines (SVG overlay) */}
          {imageUrl && (
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
              {/* Small endpoint dots */}
              {measurementLines.map(({ key, x1, y1, x2, y2 }) => {
                if (!m[key]) return null;
                return (
                  <g key={`dots-${key}`}>
                    <circle cx={parseFloat(x1)} cy={parseFloat(y1)} r="0.7" fill="hsl(42 45% 45%)" />
                    <circle cx={parseFloat(x2)} cy={parseFloat(y2)} r="0.7" fill="hsl(42 45% 45%)" />
                  </g>
                );
              })}
            </svg>
          )}

          {/* Measurement labels */}
          {imageUrl && measurementLines.map(({ key, label, labelSide, labelTop }) => {
            if (!m[key]) return null;
            const isLeft = labelSide === 'left';

            return (
              <div
                key={`label-${key}`}
                className="absolute flex items-center gap-0.5"
                style={{
                  top: labelTop,
                  ...(isLeft
                    ? { left: 0, flexDirection: 'row' }
                    : { right: 0, flexDirection: 'row-reverse' }),
                }}
              >
                <div className={`${isLeft ? 'text-right pr-0.5' : 'text-left pl-0.5'} bg-white/70 rounded px-1 py-0.5`}>
                  <p className="text-[9px] font-bold leading-tight" style={{ color: 'hsl(0 0% 15%)' }}>{label}</p>
                  <p className="text-[7.5px] leading-tight" style={{ color: 'hsl(0 0% 35%)' }}>{fmt(m[key])}</p>
                  <p className="text-[7px] leading-tight" style={{ color: 'hsl(0 0% 50%)' }}>{fmtIn(m[key])}</p>
                </div>
                {/* Connector to line */}
                <div className="w-4 border-t border-dashed" style={{ borderColor: 'hsl(42 45% 55%)' }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
