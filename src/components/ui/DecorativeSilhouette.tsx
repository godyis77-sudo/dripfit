import bodySilhouette from '@/assets/body-silhouette-clean.png';

const MOCK_LINES = [
  { key: 'shoulder', label: 'Shoulder', side: 'right' as const, x1: 37.7, y1: 20.2, x2: 62.3, y2: 20.2, labelTop: '18.5%', edgeX: 4, leaderFromX: 62.3 },
  { key: 'chest', label: 'Chest', side: 'left' as const, x1: 41.2, y1: 25.9, x2: 58.8, y2: 25.9, labelTop: '24%', edgeX: 4, leaderFromX: 41.2 },
  { key: 'waist', label: 'Waist', side: 'right' as const, x1: 43, y1: 39.5, x2: 57, y2: 39.5, labelTop: '38%', edgeX: 4, leaderFromX: 57 },
  { key: 'hips', label: 'Hips', side: 'right' as const, x1: 40.4, y1: 47.4, x2: 59.6, y2: 47.4, labelTop: '46%', edgeX: 4, leaderFromX: 59.6 },
  { key: 'inseam', label: 'Inseam', side: 'left' as const, x1: 47.4, y1: 50.4, x2: 44.7, y2: 90, labelTop: '63%', edgeX: 4, leaderFromX: 45.6 },
];

const MOCK_VALUES: Record<string, { imperial: string; metric: string }> = {
  shoulder: { imperial: '17.7–18.5 in', metric: '45–47 cm' },
  chest: { imperial: '38.2–39.8 in', metric: '97–101 cm' },
  waist: { imperial: '35.4–37.0 in', metric: '90–94 cm' },
  hips: { imperial: '39.4–40.9 in', metric: '100–104 cm' },
  inseam: { imperial: '31.5–32.7 in', metric: '80–83 cm' },
};

interface Props {
  className?: string;
  height?: number;
}

const DecorativeSilhouette = ({ className = '', height = 200 }: Props) => (
  <div className={`relative ${className}`} style={{ width: height * (2 / 3), height }}>
    <img
      src={bodySilhouette}
      alt="Body measurement silhouette"
      className="w-full h-full object-contain rounded-xl"
    />

    {/* SVG measurement lines + dots */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {MOCK_LINES.map(({ key, x1, y1, x2, y2, side, leaderFromX }) => (
        <g key={key}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(42 45% 50%)" strokeWidth="0.5" strokeDasharray="1.2 0.8" strokeLinecap="round" />
          <circle cx={x1} cy={y1} r="0.9" fill="hsl(42 45% 45%)" />
          <circle cx={x2} cy={y2} r="0.9" fill="hsl(42 45% 45%)" />
          <line
            x1={side === 'left' ? 8 : 92}
            y1={y1}
            x2={leaderFromX}
            y2={y1}
            stroke="hsl(42 45% 55%)"
            strokeWidth="0.2"
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>

    {/* Labels */}
    {MOCK_LINES.map(({ key, label, side, labelTop }) => {
      const isLeft = side === 'left';
      const v = MOCK_VALUES[key];
      return (
        <div
          key={`label-${key}`}
          className="absolute"
          style={{ top: labelTop, ...(isLeft ? { left: 2 } : { right: 2 }) }}
        >
          <div className={`${isLeft ? 'text-left' : 'text-right'}`}>
            <p className="text-[7px] font-bold uppercase tracking-wider leading-none" style={{ color: 'hsl(42 45% 50%)' }}>{label}</p>
            <p className="text-[6px] font-bold leading-none mt-px" style={{ color: 'hsl(0 0% 85%)' }}>{v.imperial}</p>
            <p className="text-[5px] leading-none mt-px" style={{ color: 'hsl(0 0% 55%)' }}>{v.metric}</p>
          </div>
        </div>
      );
    })}

    {/* Height label */}
    <div className="absolute top-[6%] left-[3px]">
      <p className="text-[7px] font-bold uppercase tracking-wider leading-none" style={{ color: 'hsl(42 45% 50%)' }}>Height</p>
      <p className="text-[6px] font-bold leading-none mt-px" style={{ color: 'hsl(0 0% 85%)' }}>5' 9"</p>
      <p className="text-[5px] leading-none mt-px" style={{ color: 'hsl(0 0% 55%)' }}>175 cm</p>
    </div>
  </div>
);

export default DecorativeSilhouette;
