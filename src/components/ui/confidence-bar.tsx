import { useEffect, useRef, useState } from "react";

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
  const mountedRef = useRef(false);
  const pct = Math.round(confidence * 100);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      // 200ms delay, then animate to final value
      const timer = setTimeout(() => {
        requestAnimationFrame(() => setWidth(pct));
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setWidth(pct);
    }
  }, [pct]);

  return (
    <div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1A1A1A' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: getBarColor(confidence),
            transitionProperty: "width, background-color",
            transitionDuration: "600ms",
            transitionTimingFunction: "ease-out",
          }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% size match confidence`}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-muted-foreground mt-0.5">{pct}% size match</p>
      )}
    </div>
  );
}
