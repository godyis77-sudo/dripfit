import { useState, forwardRef } from "react";
import { Info, AlertCircle } from "lucide-react";
import { ConfidenceBar } from "@/components/ui/confidence-bar";
import { ConfidenceDot } from "@/components/ui/confidence-dot";
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
  loading?: boolean;
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

/* ── Loading skeleton ── */
export function SizeMatchCardSkeleton() {
  return (
    <div
      className="w-full rounded-2xl border border-border bg-card p-4 shadow-luxury"
      role="status"
      aria-busy="true"
      aria-label="Loading size recommendation"
    >
      <span className="sr-only">Loading size recommendation…</span>
      <div className="flex items-center justify-between">
        <div className="h-3 w-36 skeleton-gold rounded" />
        <div className="h-4 w-4 skeleton-gold rounded-full" />
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="h-4 w-40 skeleton-gold rounded" />
        <div className="h-8 w-12 skeleton-gold rounded" />
      </div>
      <div className="mt-3 h-1.5 w-full skeleton-gold rounded-full" />
      <div className="mt-2 h-4 w-3/4 skeleton-gold rounded" />
      <div className="mt-3 h-7 w-44 skeleton-gold rounded-full" />
      <div className="mt-3 h-3 w-48 skeleton-gold rounded" />
    </div>
  );
}

/* ── Main card ── */
export const SizeMatchCard = forwardRef<HTMLDivElement, SizeMatchCardProps>(
  function SizeMatchCard(
    {
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
      loading,
      onFitChange,
    },
    ref
  ) {
    const [activeFit, setActiveFit] = useState(fitPreference);
    const pct = Math.round(confidence * 100);

    if (loading) return <SizeMatchCardSkeleton />;

    const handleFitChange = (fit: "slim" | "regular" | "relaxed") => {
      setActiveFit(fit);
      onFitChange?.(fit);
    };

    const isOutOfRange = fitStatus === "out_of_range";
    const isBetween = fitStatus === "between_sizes";

    return (
      <div
        ref={ref}
        role="region"
        className="w-full rounded-2xl border border-border bg-card p-4 shadow-luxury animate-fade-in"
        style={{ animationDuration: "300ms" }}
        aria-label={`Size ${recommendedSize} recommended for ${brandName} ${category} — ${pct}% confidence`}
      >
        {/* Row 1 — Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest uppercase text-primary">
            DRIPFIT ✔ SIZE MATCH
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-3"
                  aria-label="How confidence is calculated"
                >
                  <Info size={14} className="text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-xs" role="tooltip">
                Confidence is based on how closely your body scan measurements match this
                brand's size chart.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {isOutOfRange ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-4 text-center">
            <AlertCircle size={20} className="text-destructive" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Your measurements fall outside {brandName}'s standard range.
            </p>
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium min-h-[44px] flex items-center text-primary"
              >
                View {brandName} Size Guide →
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Row 2 — Recommended size */}
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">
                Your size in {brandName} {category}:
              </span>
              {isBetween && secondOption ? (
                <span className="text-2xl font-black text-primary">
                  {recommendedSize}{" "}
                  <span className="text-base font-medium text-muted-foreground">or</span>{" "}
                  {secondOption}
                </span>
              ) : (
                <span className="text-3xl font-black text-primary">
                  {recommendedSize}
                </span>
              )}
            </div>

            {/* Between sizes callout */}
            {isBetween && secondOption && (
              <div
                className="mt-2 overflow-hidden rounded-md border-l-[3px] border-primary bg-primary/10 px-3 py-2"
                style={{
                  animation: "accordion-down 200ms ease-out forwards",
                }}
              >
                <p className="text-xs text-primary">
                  {recommendedSize} for slim or regular fit · {secondOption} for relaxed
                  fit
                </p>
              </div>
            )}

            {/* Row 3 — Confidence bar + dot */}
            <div className="mt-3 flex items-center gap-2">
              <div
                className="opacity-0"
                style={{ animation: "fade-in 200ms ease-out 100ms forwards" }}
              >
                <ConfidenceDot confidence={confidence} />
              </div>
              <div className="flex-1">
                <ConfidenceBar confidence={confidence} />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{pct}%</span>
            </div>

            {/* Row 4 — Fit notes */}
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {fitNotes}
            </p>

            {/* Row 5 — Fit preference toggle */}
            <div className="mt-3 inline-flex overflow-hidden rounded-full border border-border" role="group" aria-label="Fit preference">
              {FIT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFitChange(opt.value)}
                  className={`cursor-pointer px-4 min-h-[44px] text-xs font-medium transition-colors duration-200 ${
                    activeFit === opt.value
                      ? 'btn-gold-3d text-primary-foreground'
                      : 'bg-card text-muted-foreground'
                  }`}
                  aria-pressed={activeFit === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Row 6 — Footer */}
        <p className="mt-3 text-xs text-muted-foreground">
          Based on your scan · Updated {relativeTime(updatedAt)}
        </p>
      </div>
    );
  }
);