import type { MeasurementRange } from '@/lib/types';

const CM_TO_IN = 0.3937;
const fmt = (r: MeasurementRange) => `${r.min.toFixed(0)}–${r.max.toFixed(0)} cm`;

interface BodyDiagramProps {
  measurements: Record<string, MeasurementRange>;
  heightCm: number;
}

const BodyDiagram = ({ measurements, heightCm }: BodyDiagramProps) => {
  const m = measurements;

  // Measurement label configs: [label, value, y-position on body, side: 'left'|'right']
  const labels: { key: string; label: string; y: number; side: 'left' | 'right' }[] = [
    { key: 'shoulder', label: 'Shoulder', y: 82, side: 'left' },
    { key: 'bust', label: 'Bust', y: 112, side: 'right' },
    { key: 'chest', label: 'Chest', y: 128, side: 'left' },
    { key: 'sleeve', label: 'Sleeve', y: 150, side: 'right' },
    { key: 'waist', label: 'Waist', y: 168, side: 'left' },
    { key: 'hips', label: 'Hips', y: 200, side: 'right' },
    { key: 'inseam', label: 'Inseam', y: 270, side: 'left' },
  ];

  const bodyX = 150;

  return (
    <div className="mb-4">
      <p className="section-label mb-2">Body Measurement Map</p>
      <div className="bg-card border border-border rounded-xl p-3 overflow-hidden">
        <svg viewBox="0 0 300 380" className="w-full max-w-[280px] mx-auto" aria-label="Body measurement diagram">
          {/* Body silhouette */}
          <g transform={`translate(${bodyX}, 20)`} fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.5">
            {/* Head */}
            <ellipse cx="0" cy="12" rx="14" ry="17" />
            {/* Neck */}
            <line x1="-6" y1="29" x2="-6" y2="42" />
            <line x1="6" y1="29" x2="6" y2="42" />
            {/* Shoulders */}
            <line x1="-6" y1="42" x2="-44" y2="56" />
            <line x1="6" y1="42" x2="44" y2="56" />
            {/* Arms left */}
            <line x1="-44" y1="56" x2="-50" y2="100" />
            <line x1="-50" y1="100" x2="-52" y2="145" />
            <line x1="-52" y1="145" x2="-48" y2="155" />
            {/* Arms right */}
            <line x1="44" y1="56" x2="50" y2="100" />
            <line x1="50" y1="100" x2="52" y2="145" />
            <line x1="52" y1="145" x2="48" y2="155" />
            {/* Torso left */}
            <path d="M-6,42 C-18,50 -30,80 -28,95 C-26,110 -22,130 -24,145 C-26,155 -30,165 -28,180" />
            {/* Torso right */}
            <path d="M6,42 C18,50 30,80 28,95 C26,110 22,130 24,145 C26,155 30,165 28,180" />
            {/* Hips to legs left */}
            <path d="M-28,180 C-30,190 -26,210 -22,230 L-20,280 L-24,330 L-16,332 L-12,280" />
            {/* Hips to legs right */}
            <path d="M28,180 C30,190 26,210 22,230 L20,280 L24,330 L16,332 L12,280" />
            {/* Crotch */}
            <path d="M-12,230 C-4,240 4,240 12,230" />
          </g>

          {/* Height indicator */}
          <g>
            <line x1="26" y1="20" x2="26" y2="352" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="20" y1="20" x2="32" y2="20" stroke="hsl(var(--primary))" strokeWidth="1.5" />
            <line x1="20" y1="352" x2="32" y2="352" stroke="hsl(var(--primary))" strokeWidth="1.5" />
            <text x="26" y="190" textAnchor="middle" fontSize="8" fill="hsl(var(--primary))" fontWeight="700" transform="rotate(-90, 26, 190)">
              {heightCm.toFixed(0)} cm / {(heightCm * CM_TO_IN).toFixed(1)} in
            </text>
          </g>

          {/* Measurement labels with lines */}
          {labels.map(({ key, label, y, side }) => {
            if (!m[key]) return null;
            const isLeft = side === 'left';
            const lineEndX = isLeft ? 42 : 258;
            const lineStartX = isLeft ? bodyX - 30 : bodyX + 30;
            const textX = isLeft ? 38 : 262;
            const anchor = isLeft ? 'end' : 'start';

            return (
              <g key={key}>
                {/* Connector line */}
                <line
                  x1={lineStartX}
                  y1={y}
                  x2={lineEndX}
                  y2={y}
                  stroke="hsl(var(--primary))"
                  strokeWidth="0.75"
                  strokeDasharray="2,2"
                  opacity="0.6"
                />
                {/* Dot on body */}
                <circle cx={lineStartX} cy={y} r="2" fill="hsl(var(--primary))" />
                {/* Label */}
                <text x={textX} y={y - 5} textAnchor={anchor} fontSize="8" fontWeight="700" fill="hsl(var(--foreground))">
                  {label}
                </text>
                <text x={textX} y={y + 5} textAnchor={anchor} fontSize="7" fill="hsl(var(--muted-foreground))">
                  {fmt(m[key])}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default BodyDiagram;
