import BodyDiagram from '@/components/results/BodyDiagram';

interface Props {
  className?: string;
  height?: number;
}

const DEMO_MEASUREMENTS: Record<string, { min: number; max: number }> = {
  shoulder: { min: 44, max: 47 },
  chest: { min: 96, max: 102 },
  waist: { min: 78, max: 84 },
  hips: { min: 94, max: 100 },
  inseam: { min: 78, max: 82 },
  sleeve: { min: 62, max: 66 },
};

const DEMO_HEIGHT_CM = 178;

// BodyDiagram's native rendered size (approx)
const NATIVE_HEIGHT = 520;

const DecorativeSilhouette = ({ className = '', height = 200 }: Props) => {
  const scale = height / NATIVE_HEIGHT;
  const nativeWidth = NATIVE_HEIGHT * 0.75;

  return (
    <div
      className={`relative overflow-hidden rounded-[1rem] ${className}`}
      style={{
        width: nativeWidth * scale,
        height,
        boxShadow:
          'inset 0 0 40px 8px hsl(var(--primary) / 0.3), 0 0 60px 14px hsl(var(--primary) / 0.35), 0 0 120px 30px hsl(var(--primary) / 0.15)',
        border: '1px solid hsl(var(--primary) / 0.4)',
        filter: 'contrast(1.25) saturate(1.15)',
      }}
    >
      <div
        className="origin-top-left [&>div]:!rounded-none [&>div]:!border-0 [&>div]:!bg-transparent"
        style={{
          width: nativeWidth,
          height: NATIVE_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        <BodyDiagram
          measurements={DEMO_MEASUREMENTS}
          heightCm={DEMO_HEIGHT_CM}
        />
      </div>
    </div>
  );
};

export default DecorativeSilhouette;
