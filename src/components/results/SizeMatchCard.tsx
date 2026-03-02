import { useState } from "react";
import { Info, AlertCircle } from "lucide-react";
import { ConfidenceBar } from "@/components/ui/confidence-bar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SizeMatchCardProps {
  brandName: string;
  category: string;
  recommendedSize: string;
  confidence: number;
  fitStatus: "true_to_size" | "good_fit" | "between_sizes" | "out_of_range";
  fitNotes: string;
  secondOption?: string | null;
  fitPreference: "slim" | "regular" | "relaxed";
  sourceUrl?: string | null;
  updatedAt?: string;
  onFitChange?: (fit: "slim" | "regular" | "relaxed") => void;
}

const FIT_OPTIONS: { value: "slim" | "regular" | "relaxed"; label: string }[] = [
  { value: "slim", label: "Slim" },
  { value: "regular", label: "Regular" },
  { value: "relaxed", label: "Relaxed" },
];

function relativeTime(dateStr?: string): string {
  if (!dateStr) return "just now";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function SizeMatchCard({
  brandName,
  category,
  recommendedSize,
  confidence,
  fitStatus,
  fitNotes,
  secondOption,
  fitPreference,
  sourceUrl,
  updatedAt,
  onFitChange,
}: SizeMatchCardProps) {
  const [activeFit, setActiveFit] = useState(fitPreference);
  const pct = Math.round(confidence * 100);

  const handleFitChange = (fit: "slim" | "regular" | "relaxed") => {
    setActiveFit(fit);
    onFitChange?.(fit);
  };

  const isOutOfRange = fitStatus === "out_of_range";
  const isBetween = fitStatus === "between_sizes";

  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      {/* Row 1 — Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#B8960C" }}>
          DRIP FIT SIZE MATCH
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 -m-1" aria-label="How confidence is calculated">
                <Info size={14} className="text-gray-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[220px] text-xs">
              Confidence is based on how closely your body scan measurements match this brand's size chart.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {isOutOfRange ? (
        /* OUT OF RANGE VARIANT */
        <div className="mt-4 flex flex-col items-center gap-3 py-4 text-center">
          <AlertCircle size={20} className="text-red-400" />
          <p className="text-sm text-gray-600">
            Your measurements fall outside {brandName}'s standard range.
          </p>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium"
              style={{ color: "#B8960C" }}
            >
              View {brandName} Size Guide →
            </a>
          )}
        </div>
      ) : (
        <>
          {/* Row 2 — Recommended size */}
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-sm text-gray-500">
              Your size in {brandName} {category}:
            </span>
            {isBetween && secondOption ? (
              <span className="text-2xl font-black" style={{ color: "#B8960C" }}>
                {recommendedSize} <span className="text-base font-medium text-gray-400">or</span> {secondOption}
              </span>
            ) : (
              <span className="text-3xl font-black" style={{ color: "#B8960C" }}>
                {recommendedSize}
              </span>
            )}
          </div>

          {/* Between sizes callout */}
          {isBetween && secondOption && (
            <div className="mt-2 rounded-md border-l-[3px] border-amber-400 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-700">
                {recommendedSize} for slim or regular fit · {secondOption} for relaxed fit
              </p>
            </div>
          )}

          {/* Row 3 — Confidence bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1">
              <ConfidenceBar confidence={confidence} />
            </div>
            <span className="text-xs font-semibold text-gray-500">{pct}%</span>
          </div>

          {/* Row 4 — Fit notes */}
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">
            {fitNotes}
          </p>

          {/* Row 5 — Fit preference toggle */}
          <div className="mt-3 inline-flex overflow-hidden rounded-full border border-gray-200">
            {FIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleFitChange(opt.value)}
                className="cursor-pointer px-3 py-1 text-xs font-medium transition-colors"
                style={
                  activeFit === opt.value
                    ? { backgroundColor: "#B8960C", color: "#fff" }
                    : undefined
                }
                aria-pressed={activeFit === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Row 6 — Footer */}
      <p className="mt-3 text-xs text-gray-400">
        Based on your scan · Updated {relativeTime(updatedAt)}
      </p>
    </div>
  );
}
