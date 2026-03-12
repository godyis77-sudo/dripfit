import { cn } from "@/lib/utils";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

/**
 * Desktop: centered 390px mobile shell. Mobile/tablet: full width.
 */
export const MobileShell = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { onTouchStart, onTouchEnd } = useSwipeNavigation();

  return (
    <div className={cn(
      "min-h-screen bg-background",
      "lg:flex lg:items-start lg:justify-center lg:bg-muted/30",
      className
    )}>
      <div
        className={cn(
          "w-full",
          "lg:max-w-[390px] lg:min-h-screen lg:bg-background lg:border-x lg:border-border lg:shadow-2xl"
        )}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};
