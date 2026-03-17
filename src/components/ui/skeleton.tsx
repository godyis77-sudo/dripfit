import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md skeleton-gold", className)}
      {...props}
    />
  );
}

/** 2×2 product card skeletons for Home feed */
function ProductCardSkeletons({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <Skeleton className="aspect-[3/4] rounded-none" />
          <div className="p-2 space-y-1.5">
            <Skeleton className="h-2.5 w-3/4 rounded" />
            <Skeleton className="h-2 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Brand size list skeletons for Profile Body */
function BrandSizeSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2.5">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-1.5 flex-1 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Style Check feed skeletons */
function FeedCardSkeletons({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <Skeleton className="aspect-[4/5] rounded-none" />
          <div className="p-3 space-y-2">
            <div className="flex gap-1.5">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 flex-1 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Fit Identity chip row skeleton */
function ChipRowSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card rounded-lg py-2.5 flex flex-col items-center gap-1">
          <Skeleton className="h-2 w-8 rounded" />
          <Skeleton className="h-3 w-6 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Try-On generating skeleton */
function TryOnGeneratingSkeleton() {
  return (
    <div className="flex flex-col items-center">
      <Skeleton className="w-full aspect-[3/4] rounded-xl mb-3" />
      <p className="text-[13px] text-muted-foreground animate-pulse">
        Creating your try-on<span className="inline-block w-6 text-left animate-[ellipsis_1.4s_steps(4,end)_infinite]">...</span>
      </p>
    </div>
  );
}

export {
  Skeleton,
  ProductCardSkeletons,
  BrandSizeSkeletons,
  FeedCardSkeletons,
  ChipRowSkeleton,
  TryOnGeneratingSkeleton,
};
