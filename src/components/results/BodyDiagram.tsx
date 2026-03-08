import type { MeasurementRange } from '@/lib/types';
import bodySilhouette from '@/assets/body-silhouette-clean.png';

const CM_TO_IN = 0.3937;
const fmt = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;
const fmtIn = (r: MeasurementRange) => `${(r.min * CM_TO_IN).toFixed(1)}–${(r.max * CM_TO_IN).toFixed(1)} in`;
const fmtHeightFtIn = (cm: number) => {
  const totalIn = Math.round(cm * CM_TO_IN);
  return `${Math.floor(totalIn / 12)}' ${totalIn % 12}"`;
};

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
  { key: 'sleeve', label: 'Sleeve', labelSide: 'left', x1: '36.8%', y1: '24.1%', x2: '34.2%', y2: '46.1%', labelTop: '33.8%', labelEdgeX: 18, leaderX: 34.2, leaderY: 35.1 },
  { key: 'inseam', label: 'Inseam', labelSide: 'left', x1: '47.4%', y1: '50.4%', x2: '44.7%', y2: '90%', labelTop: '62.7%', labelEdgeX: 18, leaderX: 45.6, leaderY: 64 },
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
      <div className="flex justify-center">
        <div className="relative rounded-[1rem] border-[3px] border-primary" style={{ boxShadow: '0 0 16px 6px hsl(45 88% 50% / 0.7), 0 0 50px 18px hsl(45 88% 45% / 0.35), 0 0 90px 30px hsl(45 88% 40% / 0.15), inset 0 0 14px 3px hsl(45 88% 50% / 0.2)' }}>
          <div className="overflow-hidden rounded-[calc(1rem-3px)]">
            <img
              src={scanResultsFull}
              alt="Body measurement scan results"
              className="w-full max-w-[380px] object-cover"
            />
          </div>
          <div className="absolute -inset-[7px] rounded-[calc(1rem+4px)] border-[4px] border-black pointer-events-none" style={{ boxShadow: 'inset 0 0 8px 2px hsl(45 88% 50% / 0.7), 0 0 10px 2px hsl(45 88% 50% / 0.6), 0 0 20px 4px hsl(45 88% 50% / 0.25)' }} />
        </div>
      </div>
    </div>
  );
};

export default BodyDiagram;
