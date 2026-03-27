import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Apply auto-brightness normalization for dark images */
  normalize?: boolean;
  /** Show skeleton while loading */
  skeleton?: boolean;
  /** Override lazy loading (use "eager" for above-the-fold images) */
  loadingStrategy?: 'lazy' | 'eager';
}

/**
 * Image component with:
 * - Lazy loading
 * - Auto-brightness CSS filter fallback for dark images
 * - Skeleton placeholder while loading
 * - Alt text required
 */
export const OptimizedImage = ({
  className,
  normalize = true,
  skeleton = true,
  alt,
  onLoad,
  ...props
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {skeleton && !loaded && (
        <div className="absolute inset-0 skeleton-gold" />
      )}
      <img
        {...props}
        alt={alt || "Image"}
        loading="lazy"
        decoding="async"
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          normalize && "img-normalize",
          className
        )}
      />
    </div>
  );
};
