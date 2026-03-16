import { motion } from 'framer-motion';

/**
 * 3D wireframe body mesh SVG overlay — pulses outward on scan completion.
 */
const WireframeMesh = () => (
  <motion.svg
    viewBox="0 0 200 400"
    className="absolute inset-0 w-full h-full pointer-events-none z-[28]"
    initial={{ opacity: 0, scale: 0.85 }}
    animate={{ opacity: [0, 0.7, 0.3, 0], scale: [0.85, 1.08, 1.12] }}
    transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
  >
    {/* Head */}
    <ellipse cx="100" cy="38" rx="18" ry="22" fill="none" stroke="hsl(45 88% 55%)" strokeWidth="0.6" opacity="0.6" />
    {/* Neck */}
    <line x1="100" y1="60" x2="100" y2="75" stroke="hsl(45 88% 55%)" strokeWidth="0.5" opacity="0.5" />
    {/* Shoulders */}
    <line x1="60" y1="85" x2="140" y2="85" stroke="hsl(45 88% 55%)" strokeWidth="0.6" opacity="0.6" />
    {/* Torso mesh — horizontal ribs */}
    {[95, 110, 125, 140, 155, 170].map((y, i) => {
      const w = y < 140 ? 34 - i * 1.5 : 30 + (y - 140) * 0.2;
      return (
        <line key={`h${y}`} x1={100 - w} y1={y} x2={100 + w} y2={y}
          stroke="hsl(45 88% 55%)" strokeWidth="0.4" opacity={0.35 + i * 0.05} />
      );
    })}
    {/* Torso verticals */}
    {[-28, -14, 0, 14, 28].map(dx => (
      <line key={`v${dx}`} x1={100 + dx} y1={85} x2={100 + dx * 0.85} y2={170}
        stroke="hsl(45 88% 55%)" strokeWidth="0.35" opacity="0.3" />
    ))}
    {/* Arms */}
    <line x1="60" y1="85" x2="42" y2="170" stroke="hsl(45 88% 55%)" strokeWidth="0.5" opacity="0.45" />
    <line x1="140" y1="85" x2="158" y2="170" stroke="hsl(45 88% 55%)" strokeWidth="0.5" opacity="0.45" />
    {/* Hips */}
    <ellipse cx="100" cy="180" rx="32" ry="10" fill="none" stroke="hsl(45 88% 55%)" strokeWidth="0.5" opacity="0.5" />
    {/* Legs */}
    <line x1="80" y1="190" x2="75" y2="320" stroke="hsl(45 88% 55%)" strokeWidth="0.5" opacity="0.4" />
    <line x1="120" y1="190" x2="125" y2="320" stroke="hsl(45 88% 55%)" strokeWidth="0.5" opacity="0.4" />
    {/* Leg cross-ribs */}
    {[210, 240, 270, 300].map(y => {
      const lx = 80 - (y - 190) * 0.038;
      const rx = 120 + (y - 190) * 0.038;
      return (
        <g key={`lr${y}`}>
          <line x1={lx - 6} y1={y} x2={lx + 6} y2={y} stroke="hsl(45 88% 55%)" strokeWidth="0.35" opacity="0.25" />
          <line x1={rx - 6} y1={y} x2={rx + 6} y2={y} stroke="hsl(45 88% 55%)" strokeWidth="0.35" opacity="0.25" />
        </g>
      );
    })}
    {/* Knee nodes */}
    <circle cx="77" cy="270" r="3" fill="none" stroke="hsl(45 88% 55%)" strokeWidth="0.4" opacity="0.4" />
    <circle cx="123" cy="270" r="3" fill="none" stroke="hsl(45 88% 55%)" strokeWidth="0.4" opacity="0.4" />
  </motion.svg>
);

export default WireframeMesh;
