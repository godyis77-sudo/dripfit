import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import type { MeasurementRange } from '@/lib/types';

const CM_TO_IN = 0.3937;
const fmt = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;

const CACHE_KEY = 'dripcheck_body_silhouette';

interface BodyDiagramProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
}

interface Annotation {
  key: string;
  label: string;
  top: string;   // percentage from top
  side: 'left' | 'right';
}

const annotations: Annotation[] = [
  { key: 'shoulder', label: 'Shoulder', top: '14%', side: 'left' },
  { key: 'bust', label: 'Bust', top: '22%', side: 'right' },
  { key: 'chest', label: 'Chest', top: '26%', side: 'left' },
  { key: 'sleeve', label: 'Sleeve', top: '38%', side: 'right' },
  { key: 'waist', label: 'Waist', top: '34%', side: 'left' },
  { key: 'hips', label: 'Hips', top: '42%', side: 'right' },
  { key: 'inseam', label: 'Inseam', top: '62%', side: 'left' },
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
      <div className="bg-card border border-border rounded-xl p-2 overflow-hidden">
        <div className="relative w-full max-w-[320px] mx-auto" style={{ minHeight: 380 }}>
          {/* Body image */}
          {loading && (
            <Skeleton className="w-full h-[380px] rounded-lg" />
          )}

          {error && !imageUrl && (
            <div className="w-full h-[380px] flex items-center justify-center text-muted-foreground text-xs">
              Could not generate diagram
            </div>
          )}

          {imageUrl && (
            <img
              src={imageUrl}
              alt="Body silhouette for measurements"
              className="w-full h-auto mx-auto block rounded-lg"
              style={{ maxHeight: 380, objectFit: 'contain' }}
            />
          )}

          {/* Height indicator on far left */}
          {imageUrl && (
            <div className="absolute left-0 top-[4%] bottom-[4%] w-5 flex flex-col items-center">
              <div className="w-px flex-1 border-l border-dashed border-primary/50" />
              <span
                className="text-[8px] font-bold text-primary whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                {heightCm.toFixed(0)} cm · {(heightCm * CM_TO_IN).toFixed(1)} in
              </span>
              <div className="w-px flex-1 border-l border-dashed border-primary/50" />
            </div>
          )}

          {/* Measurement annotations */}
          {imageUrl && annotations.map(({ key, label, top, side }) => {
            if (!m[key]) return null;
            const isLeft = side === 'left';

            return (
              <div
                key={key}
                className="absolute flex items-center gap-1"
                style={{
                  top,
                  ...(isLeft
                    ? { left: 0, flexDirection: 'row' }
                    : { right: 0, flexDirection: 'row-reverse' }),
                }}
              >
                {/* Label block */}
                <div className={`${isLeft ? 'text-right pr-1' : 'text-left pl-1'}`}>
                  <p className="text-[9px] font-bold text-foreground leading-tight">{label}</p>
                  <p className="text-[7.5px] text-muted-foreground leading-tight">{fmt(m[key])}</p>
                  <p className="text-[7px] text-muted-foreground/70 leading-tight">{fmtIn(m[key])}</p>
                </div>
                {/* Dashed connector line */}
                <div className="w-6 border-t border-dashed border-primary/40" />
                {/* Dot */}
                <div className="w-1.5 h-1.5 rounded-full bg-primary/80 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
