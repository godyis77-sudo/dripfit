import BodyDiagram from '@/components/results/BodyDiagram';

interface Props {
  className?: string;
  height?: number;
}

// Demo measurements for the decorative preview
const DEMO_MEASUREMENTS: Record<string, { min: number; max: number }> = {
  shoulder: { min: 44, max: 47 },
  chest: { min: 96, max: 102 },
  waist: { min: 78, max: 84 },
  hips: { min: 94, max: 100 },
  inseam: { min: 78, max: 82 },
  sleeve: { min: 62, max: 66 },
};

const DEMO_HEIGHT_CM = 178;

const DecorativeSilhouette = ({ className = '', height = 200 }: Props) => {
  return (
    <div
      className={`relative overflow-hidden rounded-[1rem] ${className}`}
      style={{
        width: height * 0.75,
        height,
      }}
    >
      <div className="absolute inset-0 [&>div]:!rounded-none [&>div]:!border-0 [&>div]:!bg-transparent">
        <BodyDiagram
          measurements={DEMO_MEASUREMENTS}
          heightCm={DEMO_HEIGHT_CM}
        />
      </div>
    </div>
  );
};

export default DecorativeSilhouette;
