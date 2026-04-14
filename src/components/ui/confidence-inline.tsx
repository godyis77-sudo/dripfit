import { ConfidenceDot } from "./confidence-dot";

interface ConfidenceInlineProps {
  confidence: number;
  sizeLabel?: string;
}

/** Dot/bar colors (decorative, not text) */
function getTier(confidence: number): { textColor: string; label: string } {
  // WCAG AA compliant text colors on white background
  if (confidence >= 0.85) return { textColor: "#15803D", label: "Great match" };   // green-700
  if (confidence >= 0.70) return { textColor: "#B45309", label: "Good fit" };       // amber-700
  if (confidence >= 0.60) return { textColor: "#DC2626", label: "Near Match" };    // red-600
  return { textColor: "#6B7280", label: "Check sizing" };                           // gray-500
}

export function ConfidenceInline({ confidence, sizeLabel }: ConfidenceInlineProps) {
  const pct = Math.round(confidence * 100);
  const { textColor, label } = getTier(confidence);
  const ariaLabel = sizeLabel
    ? `Size ${sizeLabel} recommended — ${pct}% confidence`
    : `${pct}% confidence — ${label}`;

  return (
    <div className="flex items-center gap-1.5" role="status" aria-label={ariaLabel}>
      <ConfidenceDot confidence={confidence} />
      <span className="font-semibold text-sm" style={{ color: textColor }}>{pct}%</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}
