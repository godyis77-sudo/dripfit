interface ConfidenceDotProps {
  confidence: number;
}

function getDotColor(confidence: number): string {
  if (confidence >= 0.85) return "#22C55E";
  if (confidence >= 0.70) return "#F59E0B";
  if (confidence >= 0.60) return "#EF4444";
  return "#9CA3AF";
}

export function ConfidenceDot({ confidence }: ConfidenceDotProps) {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-2 h-2 rounded-full ml-1 align-middle"
      style={{ backgroundColor: getDotColor(confidence) }}
    />
  );
}
