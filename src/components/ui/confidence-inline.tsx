import { ConfidenceDot } from "./confidence-dot";

interface ConfidenceInlineProps {
  confidence: number;
}

function getTier(confidence: number): { color: string; label: string } {
  if (confidence >= 0.85) return { color: "#22C55E", label: "Great match" };
  if (confidence >= 0.70) return { color: "#F59E0B", label: "Good fit" };
  if (confidence >= 0.60) return { color: "#EF4444", label: "Approximate" };
  return { color: "#9CA3AF", label: "Check sizing" };
}

export function ConfidenceInline({ confidence }: ConfidenceInlineProps) {
  const pct = Math.round(confidence * 100);
  const { color, label } = getTier(confidence);

  return (
    <div className="flex items-center gap-1.5" aria-label={`${pct}% confidence — ${label}`}>
      <ConfidenceDot confidence={confidence} />
      <span className="font-semibold text-sm" style={{ color }}>{pct}%</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
