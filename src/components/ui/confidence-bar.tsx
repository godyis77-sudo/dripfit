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
      // First mount: animate from 0 with 500ms
      mountedRef.current = true;
      const frame = requestAnimationFrame(() => setWidth(pct));
      return () => cancelAnimationFrame(frame);
    } else {
      // Subsequent changes (fit preference): animate directly
      setWidth(pct);
    }
  }, [pct]);

  const duration = mountedRef.current ? "400ms" : "500ms";

  return (
    <div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full ease-out"
          style={{
            width: `${width}%`,
            backgroundColor: getBarColor(confidence),
            transitionProperty: "width, background-color",
            transitionDuration: duration,
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
        <p className="text-xs text-gray-500 mt-0.5">{pct}% size match</p>
      )}
    </div>
  );
}
