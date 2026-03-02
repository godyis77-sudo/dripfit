import { useEffect, useState } from "react";

interface ConfidenceBarProps {
  confidence: number;
  showLabel?: boolean;
}

function getBarColor(confidence: number): string {
  if (confidence >= 0.85) return "#22C55E";
  if (confidence >= 0.70) return "#F59E0B";
  if (confidence >= 0.60) return "#EF4444";
  return "#9CA3AF";
}

export function ConfidenceBar({ confidence, showLabel = false }: ConfidenceBarProps) {
  const [width, setWidth] = useState(0);
  const pct = Math.round(confidence * 100);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(frame);
  }, [pct]);

  return (
    <div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${width}%`, backgroundColor: getBarColor(confidence) }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% size match confidence`}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-500 mt-0.5">{pct}% size match</p>
      )}
    </div>
  );
}
