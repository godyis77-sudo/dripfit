import { useState } from 'react';
import bodySilhouette from '@/assets/body-silhouette-clean.png';

const MOCK_LINES = [
  { key: 'shoulder', label: 'Shoulder', side: 'right' as const, x1: 37.7, y1: 25.2, x2: 62.3, y2: 25.2, labelTop: '25.2%', leaderFromX: 62.3, leaderEndX: 73 },
  { key: 'chest', label: 'Chest', side: 'left' as const, x1: 41.2, y1: 30.9, x2: 58.8, y2: 30.9, labelTop: '30.9%', leaderFromX: 41.2, leaderEndX: 27 },
  { key: 'bust', label: 'Bust', side: 'right' as const, x1: 41.2, y1: 33, x2: 58.8, y2: 33, labelTop: '33%', leaderFromX: 58.8, leaderEndX: 73 },
  { key: 'waist', label: 'Waist', side: 'right' as const, x1: 43, y1: 44.5, x2: 57, y2: 44.5, labelTop: '44.5%', leaderFromX: 57, leaderEndX: 73 },
  { key: 'hips', label: 'Hips', side: 'right' as const, x1: 40.4, y1: 52.4, x2: 59.6, y2: 52.4, labelTop: '52.4%', leaderFromX: 59.6, leaderEndX: 73 },
  { key: 'inseam', label: 'Inseam', side: 'left' as const, x1: 47.4, y1: 55.4, x2: 44.7, y2: 95, labelTop: '75.2%', leaderFromX: 46, leaderEndX: 27 },
];

const MOCK_VALUES: Record<string, { imperial: string; metric: string }> = {
  shoulder: { imperial: '17.7–18.5 in', metric: '45–47 cm' },
  chest: { imperial: '38.2–39.8 in', metric: '97–101 cm' },
  bust: { imperial: '36.2–37.8 in', metric: '92–96 cm' },
  waist: { imperial: '35.4–37.0 in', metric: '90–94 cm' },
  hips: { imperial: '39.4–40.9 in', metric: '100–104 cm' },
  inseam: { imperial: '31.5–32.7 in', metric: '80–83 cm' },
};

interface Props {
  className?: string;
  height?: number;
}

const DecorativeSilhouette = ({ className = '', height = 200 }: Props) => {
  const [loaded, setLoaded] = useState(false);

  return (
  <div className={`relative overflow-hidden rounded-[4rem] border-x-[12px] border-y-[15px] border-black ${className}`} style={{ width: height * (0.6867), height, opacity: loaded ? 1 : 0, transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
    <img
      src={bodySilhouette}
      alt="Body measurement silhouette"
      className="w-full h-full object-contain rounded-3xl"
      onLoad={() => setLoaded(true)}
    />

    {/* SVG measurement lines + dots */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {MOCK_LINES.map(({ key, x1, y1, x2, y2, leaderFromX, leaderEndX }) => {
        const leaderY = key === 'inseam' ? (y1 + y2) / 2 : y1;
        return (
          <g key={key}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(42 60% 40%)" strokeWidth="0.7" strokeDasharray="1.2 0.8" strokeLinecap="round" opacity="1" />
            <circle cx={x1} cy={y1} r="0.9" fill="hsl(0 0% 15%)" />
            <circle cx={x2} cy={y2} r="0.9" fill="hsl(0 0% 15%)" />
            <line
              x1={leaderEndX}
              y1={leaderY}
              x2={leaderFromX}
              y2={leaderY}
              stroke="hsl(42 60% 35%)"
              strokeWidth="0.4"
              opacity="1"
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>

    {/* Labels — all inside image boundaries */}
    {MOCK_LINES.map(({ key, label, side, labelTop }) => {
      const isLeft = side === 'left';
      const v = MOCK_VALUES[key];
      return (
        <div
          key={`label-${key}`}
          className="absolute"
          style={{
            top: labelTop,
            transform: 'translateY(-50%)',
            ...(isLeft ? { left: '5%' } : { right: '5%' }),
          }}
        >
          <div className={`${isLeft ? 'text-left' : 'text-right'}`}>
            <p className="text-[7px] font-bold uppercase tracking-wider leading-none" style={{ color: 'hsl(0 0% 10%)' }}>{label}</p>
            <p className="text-[6px] font-bold leading-none mt-px" style={{ color: 'hsl(0 0% 20%)' }}>{v.imperial}</p>
            <p className="text-[5px] leading-none mt-px" style={{ color: 'hsl(0 0% 35%)' }}>{v.metric}</p>
          </div>
        </div>
      );
    })}

    {/* SCAN RESULTS title */}
    <div className="absolute top-[2%] left-0 right-0 flex justify-center">
      <p className="text-[15px] font-extrabold uppercase tracking-[0.2em] leading-none" style={{ color: 'hsl(42 60% 30%)' }}>Scan Results</p>
    </div>

    {/* Height label */}
    <div className="absolute" style={{ top: '14%', left: '5%' }}>
      <p className="text-[7px] font-bold uppercase tracking-wider leading-none" style={{ color: 'hsl(0 0% 10%)' }}>Height</p>
      <p className="text-[6px] font-bold leading-none mt-px" style={{ color: 'hsl(0 0% 20%)' }}>5' 9"</p>
      <p className="text-[5px] leading-none mt-px" style={{ color: 'hsl(0 0% 35%)' }}>175 cm</p>
    </div>
  </div>
  );
};

export default DecorativeSilhouette;
