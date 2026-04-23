import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic full-page skeleton — used as the global Suspense fallback for lazy routes.
 * Mimics the standard Page Header + content stack so the layout doesn't shift when the
 * real page mounts. Pure visual placeholder, no data deps.
 */
export function PageSkeleton() {
  return (
    <div
      className="min-h-screen bg-background px-4 pt-4 pb-safe-tab"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Header row: back button + title */}
      <div className="flex items-center gap-2 mb-5">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>

      {/* Hero block */}
      <Skeleton className="w-full aspect-[3/4] rounded-2xl mb-4" />

      {/* Stacked content lines */}
      <div className="space-y-2.5 mb-6">
        <Skeleton className="h-3 w-2/3 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <Skeleton className="h-3 w-3/4 rounded" />
      </div>

      {/* CTA button */}
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}

/**
 * Skeleton tuned for body-scan / measurement result pages (ScanSuccess, Analyze).
 * Centered silhouette + measurement grid placeholder.
 */
export function ScanResultSkeleton() {
  return (
    <div
      className="min-h-screen bg-background px-4 pt-6 pb-safe-tab flex flex-col items-center"
      role="status"
      aria-busy="true"
      aria-label="Loading scan results"
    >
      <Skeleton className="h-3 w-24 rounded mb-3" />
      <Skeleton className="h-6 w-48 rounded mb-8" />

      {/* Silhouette placeholder */}
      <Skeleton className="h-[280px] w-[140px] rounded-[60px] mb-6" />

      {/* Measurement grid (2 cols x 3 rows) */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-[420px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2"
          >
            <Skeleton className="h-2.5 w-12 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>

      <Skeleton className="h-11 w-full max-w-[420px] rounded-full mt-6" />
    </div>
  );
}

/**
 * Skeleton tuned for editorial outfit pages (OutfitDetail).
 * Big hero image + horizontal item row placeholders.
 */
export function OutfitDetailSkeleton() {
  return (
    <div
      className="min-h-screen bg-background"
      role="status"
      aria-busy="true"
      aria-label="Loading outfit"
    >
      {/* Hero image (3:4) */}
      <Skeleton className="w-full aspect-[3/4] max-h-[80vh] rounded-none" />

      <div className="px-4 pt-5 pb-safe-tab space-y-4">
        <Skeleton className="h-5 w-2/3 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />

        {/* Item rows */}
        <div className="space-y-3 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-card border border-border rounded-xl p-2"
            >
              <Skeleton className="h-24 w-24 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-2.5 w-1/2 rounded" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton tuned for table/list admin pages (AdminRetailers).
 */
export function AdminListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="min-h-screen bg-background px-4 pt-4 pb-safe-tab"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex items-center gap-2 mb-5">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-40 rounded" />
      </div>

      {/* Stat chips row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 w-full rounded-lg mb-4" />

      {/* List rows */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-3"
          >
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-2/3 rounded" />
              <Skeleton className="h-2 w-1/3 rounded" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
