import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Animated gold shimmer loading bar for AI generation actions.
 */
export const GoldShimmer = ({ className }: { className?: string }) => (
  <div className={cn("relative overflow-hidden rounded-lg bg-card border border-border", className)}>
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
      animate={{ x: ["-100%", "100%"] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

/**
 * Pulsing silhouette skeleton for AI-generated content loading.
 */
export const SilhouetteSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("space-y-3", className)}>
    {/* Avatar + name */}
    <div className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-full skeleton-gold" />
      <div className="space-y-1.5 flex-1">
        <div className="h-3 w-24 rounded skeleton-gold" />
        <div className="h-2 w-16 rounded skeleton-gold" />
      </div>
    </div>
    {/* Image placeholder */}
    <div className="w-full aspect-[4/5] rounded-xl skeleton-gold" />
    {/* Text lines */}
    <div className="space-y-2 px-1">
      <div className="h-3 w-3/4 rounded skeleton-gold" />
      <div className="h-3 w-1/2 rounded skeleton-gold" />
    </div>
  </div>
);

/**
 * Skeleton card for feed items with gold shimmer.
 */
export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("bg-card border border-border rounded-xl overflow-hidden", className)}>
    <div className="w-full aspect-[4/5] skeleton-gold" />
    <div className="p-3 space-y-2">
      <div className="h-3 w-2/3 rounded skeleton-gold" />
      <div className="h-3 w-1/2 rounded skeleton-gold" />
      <div className="flex gap-1.5 mt-2">
        <div className="h-8 flex-1 rounded-lg skeleton-gold" />
        <div className="h-8 flex-1 rounded-lg skeleton-gold" />
        <div className="h-8 flex-1 rounded-lg skeleton-gold" />
      </div>
    </div>
  </div>
);
